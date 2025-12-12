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

# 导入本地模块
from history import HistoryManager
# 导入我们在agent.py里面写的agent对象
# 注意：在阶段一，Agent是静态的，所以直接导入对象即可
from agent import agent as static_agent

# 1. 加载环境变量
load_dotenv(override=True)

# 2. 初始化FastAPI应用
app = FastAPI(title="Mini ChatGPT Backend", version="1.0 (MVP)")

# 3. 配置CORS(跨域资源共享)
# 允许前端(通常在 localhost:3000 或 5173)访问此后端
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 生产环境建议替换为具体前端域名
    allow_credientials=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


# ==========================================
# Pydantic 数据模型 (类型安全)
# ==========================================

class ChatRequest(BaseModel):
    query: str      # 用户的问题
    session_id: str # 会话ID

class SessionItem(BaseModel):
    id: str
    title: str
    updated_at: int


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
    # ensure_ascii=Fasle 保证中文正常传输
    return f"data: {json.dumps({'type': event_type, 'data': data}, ensure_ascii=False)}\n\n"

@app.post("/chat_stream")
async def chat_stream(request: ChatRequest):
    """
    核心对话接口：接收用户问题 -> 调用Agent -> 流式返回结果
    """

    # 1. 准备历史上下文
    history_mgr = HistoryManager(request.session_id)
    # 读取最近 40 条记录作为短期记录
    history_messages = HistoryManager.load_messages(limit=40)
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

if __name__ == "__main__":
    print("🚀 启动 Server (Port 8002)...")
    uvicorn.run(app, host="0.0.0.0", port=8002)