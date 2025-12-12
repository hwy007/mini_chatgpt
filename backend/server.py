import uvicorn
import os
import json
from typing import List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from fastapi.responses import FileResponse 

# 导入本地模块
from history import HistoryManager

# 导入我们在agent.py里面写的agent对象
# 注意：在阶段一，Agent是静态的，所以直接导入对象即可
from agent_static import agent as static_agent

from agent import build_dynamic_agent
from mcp_manager import MCPManager

# 初始化全局管理器
mcp_manager = MCPManager()

# 1. 加载环境变量
load_dotenv(override=True)

# 2. 初始化FastAPI应用
app = FastAPI(title="Mini ChatGPT Backend", version="1.0 (MVP)")

# 3. 配置CORS(跨域资源共享)
# 允许前端(通常在 localhost:3000 或 5173)访问此后端
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 生产环境建议替换为具体前端域名
    allow_credentials=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


# ==========================================
# Pydantic 数据模型 (类型安全)
# ==========================================

# --- 会话相关的数据模型 ---
class ChatRequest(BaseModel):
    query: str      # 用户的问题
    session_id: str # 会话ID

class SessionItem(BaseModel):
    id: str
    title: str
    updated_at: int

# --- MCP 管理相关的数据模型 ---
class MCPSearchRequest(BaseModel):
    """用户输入的自然语言需求"""
    query: str

class MCPInstallRequest(BaseModel):
    """安装/修改单个工具的请求体"""
    name: str
    description: str
    type: str    # "stdio" 或 "sse"
    config: dict # 包含 command, args, url, headers 等核心参数

class MCPBatchInstallRequest(BaseModel):
    """批量安装请求体 (用于 AI 推荐后的批量采纳)"""
    tools: List[MCPInstallRequest]

class MCPToggleRequest(BaseModel):
    """开关状态请求体"""
    active: bool

class MCPTestRequest(BaseModel):
    """连接测试请求体 (不保存，仅运行)"""
    name: str
    type: str
    config: dict


# ==========================================
# API 模块 1: 会话管理
# ==========================================

@app.get("/sessions", response_model=List[SessionItem])
async def get_sessions():
    """获取左侧侧边栏的会话列表"""
    return HistoryManager.get_all_sessions()

@app.post("/sessions")
async def create_session():
    """创建一个新的空白对话"""
    import uuid
    import time
    return {
        "id": str(uuid.uuid4()),
        "title": "新对话",
        "updated_at": int(time.time())
    }

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """删除指定会话"""
    HistoryManager.delete_session(session_id)
    return {
        "status": "success"
    }

@app.get("history/{session_id}")
async def get_history(session_id: str):
    """点击侧边栏时，加载该会话的历史消息"""
    return HistoryManager(session_id).get_full_history()


# ==========================================
# API 模块 2: 核心流式对话 (SSE)
# ==========================================

def format_sse(event_type: str, data: dict):
    """辅助函数：封装SSE消息格式"""
    # ensure_ascii=False 保证中文正常传输
    return f"data: {json.dumps({'type': event_type, 'data': data}, ensure_ascii=False)}\n\n"

@app.post("/chat_stream")
async def chat_stream(request: ChatRequest):
    """
    核心对话接口 (动态版)：
    每次请求都会重新组装 Agent，从而让新安装的 MCP 工具即时生效
    """ 
    # 1. 准备历史上下文
    history_mgr = HistoryManager(request.session_id)
    history_messages = history_mgr.load_messages(limit=40)
    input_messages = history_messages + [HumanMessage(content=request.query)]

    # 2. 动态构建 Agent（关键步骤）
    try:
        current_agent = await build_dynamic_agent()
    except Exception as e:
        # 如果 Agent 构建失败（比如某个MCP连不上），返回错误流
        async def error_gen():
            yield format_sse("error", {"messages": f"Agent 初始化失败: {str(e)}"})
            yield format_sse("finish", {"status": "error"})
        return StreamingResponse(error_gen(), media_type="text/event-stream")

    # 3. 定义流生成器
    async def event_generator():
        final_answer = ""
        try:
            print(f"🔄 [Server] Session {request.session_id} 开始处理...")

            async for event in current_agent.astream_events(
                {"messages": input_messages},
                version="v2"
            ):
                kind = event["event"]
                name = event.get("name", "")

                # --- Token 流 ---
                if kind == "on_chat_model_stream":
                    chunk = event["data"].get("chunk")
                    content = chunk.content if hasattr(chunk, "content") else ""
                    if content:
                        final_answer += content
                        yield format_sse("token", {"content": content})
                
                # --- 工具开始 ---
                elif kind == "on_tool_start":
                    print(f"🛠️ [Tool Start] {name}")

                    # 1. 获取原始输入
                    raw_input = event["data"].get("input")
                    clean_input = {}

                    # 2. 数据清洗逻辑
                    if isinstance(raw_input, dict):
                        for k, v in raw_input.items():
                            # [关键步骤] 剔除 LangChain/MCP 的内部注入参数
                            # runtime: 包含巨大历史记录
                            # state: 包含 Agent 状态
                            if k in ["runtime", "state", "callbacks"]:
                                continue

                            # [可选] 对剩余参数进行截断（防止用户输入超长文本）
                            str_v = str(v)
                            if len(str_v) > 200: # 限制每个参数值最多显示 200 字符
                                clean_input[k] = str_v[:200] + "..."
                            else:
                                clean_input[k] = v
                    else:
                        # 如果 input 本身不是 dict（很少见），直接转字符串并截断
                        clean_input = str(raw_input)[:200] + "..."
                    
                    # 3. 发送清洗后的数据
                    yield format_sse("tool_start", {
                        "tool_name": name,
                        "input": clean_input
                    })

                # --- 工具结束 ---
                elif kind == "on_tool_end":
                    print(f"✅ [Tool End] {name}")
                    raw = event["data"].get("output")
                    # 鲁棒性转换
                    output_str = str(raw)
                    if hasattr(raw, "content"):
                        output_str = raw.content
                    elif isinstance(raw, (dict, list)):
                        output_str = json.dump(raw, ensure_ascii=False)
                    
                    yield format_sse("tool_end", {
                        "tool_name": name,
                        "output": output_str
                    })
                
            # 保存历史记录
            if final_answer:
                history_mgr.save_interaction(request.query, final_answer)

            yield format_sse("finish", {"status": "success"})

        except Exception as e:
            import traceback
            print(f"❌ [Stream Error] {traceback.format_exc()}")
            yield format_sse("error", {"message": str(e)})
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")



# 下面这个函数实际上不使用
@app.post("/chat_stream_static")
async def chat_stream_static(request: ChatRequest):
    """
    核心对话接口 (静态版)：
    接收用户问题 -> 调用Agent -> 流式返回结果
    """

    # 1. 准备历史上下文
    history_mgr = HistoryManager(request.session_id)
    # 读取最近 40 条记录作为短期记录
    history_messages = history_mgr.load_messages(limit=40)
    # 拼接当前用户问题
    input_messages = history_messages + [HumanMessage(content=request.query)]

    # 2. 定义异步生成器(核心逻辑)
    async def event_generator():
        final_answer = ""
        try:
            print(f"🔄 [server] Session {request.session_id} 开始处理: {request.query[:20]}...")

            # 调用Agent的astream_events方法，监听内部事件
            # version="v2"是LangChain推荐的稳定版事件流格式
            async for event in static_agent.astream_events(
                {"messages": input_messages},
                version="v2"
            ):
                kind = event["event"]
                name = event.get("name", "")

                # --- 情况 A: 模型正在生成文本 (打字机效果) ---
                if kind == "on_chat_model_stream" or kind == "on_llm_stream":
                    chunk = event["data"].get("chunk")
                    content = ""
                    # 兼容不同 chunk 格式
                    if hasattr(chunk, "content"):
                        content = chunk.content
                    elif isinstance(chunk, dict):
                        content = chunk.get("content", "")
                    if content:
                        final_answer += content
                        # 推动token事件给前端
                        yield format_sse("token", {"content": content})
                
                # --- 情况 B: 工具开始调用 (展示 Loading) ---
                elif kind == "on_tool_start":
                    print(f"🛠 [Tool Start] {name}")
                    yield format_sse("tool_start", {
                        "tool_name": name,
                        "input": event["data"].get("input")
                    })

                # --- 情况 C: 工具调用结束 (展示结果) ---
                elif kind == "on_tool_end":
                    print(f"✅ [Tool End] {name}")
                    # 处理输出数据，防止JSON序列化错误
                    raw_output = event["data"].get("output")
                    output_str = str(raw_output)
                    if hasattr(raw_output, "content"):
                        output_str = raw_output.content
                    
                    yield format_sse("tool_end", {
                        "tool_name": name,
                        "output": output_str
                    })
                
            # 3. 对话结束，保存完整记录到磁盘
            if final_answer:
                history_mgr.save_interaction(request.query, final_answer)
                # 发送结束信号
                yield format_sse("finish", {"status": "success"})
        
        except Exception as e:
            import traceback
            print(f"❌ [Stream Error] {traceback.format_exc()}")
            yield format_sse("error", {"message": str(e)})

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ==========================================
# API 模块 3: MCP 工具管理
# ==========================================

@app.get("/mcp/list")
async def list_installed_mcp():
    """
    [查询] 获取当前已安装的所有工具
    前端页面加载时调用，用于渲染"我的工具"列表
    """
    return mcp_manager.list_installed_tools()

@app.post("/mcp/search_ai")
async def search_mcp_ai(req: MCPSearchRequest):
    """
    [智能] AI 推荐工具
    连接 DeepSeek 模型，分析用户需求并查询 Registry
    """
    return await mcp_manager.ai_recommend_tools(req.query)

@app.post("/mcp/install")
async def install_mcp_tool(req: MCPInstallRequest):
    """
    [写入] 安装或更新单个工具
    包含智能拆包与路径修正逻辑
    """
    try:
        mcp_manager.save_tool(
            name=req.name,
            description=req.description,
            type=req.type,
            config_dict=req.config
        )
        return {"status": "success", "message": f"工具 {req.name} 已保存"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/mcp/install_batch")
async def install_mcp_batch(req: MCPBatchInstallRequest):
    """
    [批量写入] 一键安装多个工具
    """
    count = 0
    for tool in req.tools:
        mcp_manager.save_tool(
            name=tool.name,
            description=tool.description,
            type=tool.type,
            config_dict=tool.config
        )
        count += 1
    return {"status": "success", "message": f"已批量添加 {count} 个工具"}


@app.post("/mcp/test_connection")
async def test_mcp_connection(req: MCPTestRequest):
    """
    [测试] 连接试运行
    这是用户体验最关键的一环，确保'先测后存'
    """
    success, msg = await mcp_manager.test_tool_connection(
        name=req.name,
        type=req.type,
        config_dict=req.config
    )
    return {"success": success, "message": msg}


@app.post("/mcp/toggle/{tool_name}")
async def toggle_mcp(tool_name: str, req: MCPToggleRequest):
    """
    [状态] 激活或禁用工具
    """
    mcp_manager.toggle_tool(tool_name, req.active)
    return {"status": "success", "active": req.active}

@app.delete("/mcp/{tool_name}")
async def uninstall_mcp(tool_name: str):
    """
    [删除] 卸载工具
    """
    mcp_manager.delete_tool(tool_name)
    return {"status": "success"}


# ==========================================
# API 模块 4: 课件/文件服务
# ==========================================

@app.get("/courseware")
async def get_courseware_html():
    """
    读取并返回本地的 HTML 课外文件
    """
    # 1. 定义文件路径
    file_path = os.path.join("backend", "files", "courseware.html")

    # 2. 检查文件是否存在
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Courseware file not found.")
    
    # 3.直接返回文件
    # media_type="text/html" 告诉浏览器这是网页，可以直接渲染
    return FileResponse(file_path, media_type="text/html")


if __name__ == "__main__":
    print("🚀 启动 Server (Port 8002)...")
    uvicorn.run(app, host="0.0.0.0", port=8002)