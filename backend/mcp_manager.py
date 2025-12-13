import json
import os
import sys
import asyncio
from typing import List, Dict, Tuple, Optional
from dotenv import load_dotenv

# 1. 核心依赖
from pydantic import BaseModel, Field
from langchain_deepseek import ChatDeepSeek
from langchain_core.prompts import ChatPromptTemplate
# MCP 官方客户端 (用于测试连接)
from langchain_mcp_adapters.client import MultiServerMCPClient

load_dotenv(override=True)

REGISTRY_FILE = "mcp_registry.json"
CONFIG_FILE = "mcp_config.json"

# ==========================================
#   Pydantic 数据模型 (用于 AI 结构化输出)
# ==========================================

class ToolRecommendation(BaseModel):
    """单个工具推荐"""
    name: str = Field(description="工具名称，必须与知识库一致")
    reason: str = Field(description="推荐理由")

class RecommendationList(BaseModel):
    """推荐列表容器"""
    recommendations: List[ToolRecommendation]


# ==========================================
#            MCP 管理器核心类
# ==========================================

class MCPManager:
    def __init__(self):
        # 初始化时加载配置
        self.config = self._load_config()
        self.registry = self._load_registry()

        self.llm = ChatDeepSeek(
            model="deepseek-chat",
            temperature=0.1
        )

    # --- 数据加载 ---
    def _load_registry(self) -> List[Dict]:
        if not os.path.exists(REGISTRY_FILE):
            return []
        try:
            with open(REGISTRY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []

    def _load_config(self) -> Dict:
        if not os.path.exists(CONFIG_FILE):
            return {"tools": {}}
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {"tools": {}}
    
    def _save_config(self):
        with open(CONFIG_FILE, 'w', encoding='utf-8')as f:
            json.dump(self.config, f, ensure_ascii=False, indent=2)


    # --- 核心功能1：基础列表查询 ---
    def list_registry(self) -> List[Dict]:
        """列出知识库所有工具"""
        return self.registry

    def list_installed_tools(self) -> List[Dict]:
        """
        列出已安装工具（带有配置详情）。
        """
        # 每次读取前强制刷新，防止多进程数据不一致
        self.config = self._load_config()

        results = []
        for name, data in self.config.get("tools", {}).items():
            raw_config = data.get("config", {})
            results.append({
                "name": name,
                "description": data.get("description", ""),
                "active": data.get("active", True),
                "type": data.get("type"),

                # [后端逻辑完整性] 保留原始对象
                "config": raw_config,

                # [前端适配] 将字典转为格式化的JSON字符串
                "config_json": json.dumps(raw_config, ensure_ascii=False, indent=2)
            })
        return results
        
        
    # --- 核心功能2：连接测试 ---
    async def test_tool_connection(self, name: str, type: str, config_dict: Dict) -> Tuple[bool, str]:
        """
        测试连接：包含 [智能拆包] + [路径自适应] + [超时熔断] 三重保障
        """    
        print(f"[Debug] 收到测试请求: {name}, Type: {type}")

        # --- 第一重保障: 智能拆包 (Anti-Stupidity) ---
        # 针对用户粘贴了包含 "type" 和 "config" 的嵌套 JSON 的情况
        real_config = config_dict
        real_type = type.strip().lower()

        # 如果 config_dict 里包含 'config' 和 'type' 字段，说明是套娃
        if isinstance(config_dict, dict) and "config" in config_dict:
            print(f"[Auto-Fix] 检测到嵌套配置，正在自动清洗...")
            real_config = config_dict["config"]

            # 提取内部真实的type和config
            if "type" in config_dict:
                real_type = config_dict["type"].strip().lower()
            # 顺便更新一下名字，如果有的话
            if "name" in config_dict:
                name = config_dict["name"]

        # --- 第二重保障: 跨平台路径修正 (Cross-Platform) ---
        # 针对 SSE 类型的检查
        if real_type == "sse":
            if "url" not in real_config:
                return False, "❌ SSE 配置缺失 'url' 字段"
            # 清理可能残留的 stdio 参数
            if "command" in real_config:
                del real_config["command"]

        # 针对本地工具 (stdio)
        if real_type == "stdio":
            args = real_config.get("args", [])
            cmd = str(real_config.get("command", "")).lower()

            # 如果是 Python 模块调用(-m)，强制使用当前环境解释器
            if "-m" in args or cmd == "python":
                # 强制将 command 字段修正为当前系统正在运行的 Python 解释器的绝对路径 (sys.executable)
                current_python = sys.executable
                print(f"[Auto-Fix] 路径修正: {current_python}")
                real_config["command"] = current_python
        
        # 构造客户端配置
        client_config = {
            name: {
                "transport": real_type,
                **real_config
            }
        }

        # --- 第三重保障: 超时熔断 (Timeout) ---
        try:
            # 实例化客户端 (LangChain MCP Adapter)
            client = MultiServerMCPClient(client_config)
            # 强制10秒超时，防止错误的 SSE 地址导致后端无限卡死
            tools = await asyncio.wait_for(client.get_tools(), timeout=10.0)

            tool_names = [t.name for t in tools]
            return True, f"✅ 连接成功！发现 {len(tools)} 个工具: {','.join(tool_names[:3])}..."
        
        except asyncio.TimeoutError:
            return False, "❌ 连接超时 (10s)。请检查网络或 URL。"
        except Exception as e:
            return False, f"❌ 连接错误: {str(e)}"
    

    # --- 核心功能3：AI智能推荐 ---
    async def ai_recommend_tools(self, user_query: str) -> List[Dict]:
        """根据用户需求推荐工具"""
        if not self.registry:
            raise ValueError("MCP 知识库为空，无法进行推荐")

        if not os.getenv("DEEPSEEK_API_KEY"):
            raise ValueError("DeepSeek API Key 未配置，无法调用智能推荐")

        # 1. 压缩知识库 (只取关键字段，省 token)
        registry_text = json.dumps([
            {
                "name": t["name"],
                "desc": t["description"]
            } for t in self.registry
        ], ensure_ascii=False)

        # 2. 编写 Prompt
        prompt = ChatPromptTemplate.from_template(
            """
            你是一个专业的 MCP 工具推荐助手。
            
            用户的需求是："{query}"
            
            目前的工具知识库如下：
            {registry}
            
            请分析用户需求，从知识库中挑选出最能解决问题的工具（最多推荐3个）。
            如果用户需求模糊或没有匹配工具，请返回空列表。
            """)

        # 3. 结构化输出
        # 这一步自动完成了 JSON Schema 的生成和解析
        chain = prompt | self.llm.with_structured_output(RecommendationList)

        try:
            res: RecommendationList = await chain.ainvoke({
                "query": user_query,
                "registry": registry_text
            })

            # 4. 数据回填 (将推荐结果与 registry 里面的详细配置合并)
            final_results = []
            for item in res.recommendations:
                original = next((t for t in self.registry if t["name"] == item.name), None)
                if original:
                    final_results.append({
                        **original,
                        "recommend_reason": item.reason,
                        "installed": item.name in self.config.get("tools", {})
                    })
            return final_results
        except Exception as e:
            error_msg = f"AI 推荐发生错误: {e}"
            print(f"❌ {error_msg}")
            raise RuntimeError(error_msg)

    
    # --- 核心功能4：保存/修改工具 ---
    def save_tool(self, name: str, description: str, type: str, config_dict: Dict):
        """
        保存或更新工具配置 (包含智能拆包逻辑 + 读写安全)
        """
        try:
            self.config = self._load_config()

            # 1. 智能拆包
            real_config = config_dict
            real_type = type.strip().lower()

            # 处理用户粘贴完整JSON的情况
            if isinstance(config_dict, dict) and "config" in config_dict and "type" in config_dict:
                print(f"[Save] 检测到嵌套配置，正在自动清洗...")
                real_type = config_dict["type"].strip().lower()
                real_config = config_dict["config"]
                if "name" in config_dict:
                    name = config_dict["name"]

            # 2. 类型清理
            if real_type == "sse":
                if "command" in real_config:
                    del real_config["command"]

            # 3. 路径修正
            if real_type == "stdio" and real_config.get("command") == "python":
                real_config["command"] = sys.executable

            # 4. 更新内存
            # 确保 tools 键存在
            if "tools" not in self.config:
                self.config["tools"] = {}
            
            self.config["tools"][name] = {
                "type": type,
                "description": description,
                "active": True,
                "config": real_config
            }

            # 5. 写入文件
            self._save_config()
            print(f"✅ 工具 [{name}] 配置已清洗并保存 (Type: {real_type})")
        
        except Exception as e:
            print(f"❌ 保存工具失败: {str(e)}")
            # 向上抛出异常，让 Server 返回 500，而不是让前端傻等
            raise e


    def install_from_registry(self, registry_name: str):
        """从知识库安装标准模板"""
        target = next((t for t in self.registry if t['name'] == registry_name), None)
        if not target:
            raise ValueError(f"知识库中找不到工具: {registry_name}")
            
        self.save_tool(
            name=target["name"],
            description=target["description"],
            type=target["type"],
            config_dict=target["default_config"]
        )
            
    
    # --- 核心功能5：删除与开关 ---
    def delete_tool(self, name: str):
        """删除工具"""
        if name in self.config["tools"]:
            del self.config["tools"][name]
            self._save_config()

    def toggle_tool(self, name: str, active: bool):
        """激活/禁用工具"""
        if name in self.config["tools"]:
            self.config["tools"][name]["active"] = active
            self._save_config()


    # --- 核心功能6：生成运行时配置 ---
    def get_active_config(self) -> Dict:
        """生成给Agent使用的运行时配置"""
        self.config = self._load_config()

        final_config = {}
        for name, data in self.config.get("tools", {}).items():
            if data.get("active", True):
                cfg = data["config"].copy()
                # 再次应用路径修正逻辑，确保运行时不出错
                if data["type"] == "stdio" and "-m" in cfg.get("args", []):
                    cfg["command"] = sys.executable

                final_config[name] = {
                    "transport": data["type"],
                    **cfg
                }
        return final_config
    

