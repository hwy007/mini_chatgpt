import asyncio
from typing import List

# 1. 引入 LangChain 和 DeepSeek 组件
from langchain_deepseek import ChatDeepSeek
from langchain.agents import create_agent
from langchain_core.tools import BaseTool

# 2. 引入 MCP 官方适配器 (连接的核心)
from langchain_mcp_adapters.client import MultiServerMCPClient

# 3. 引入本地模块
from tools import get_tools as get_builtin_tools # 始终存在的内置工具
from mcp_manager import MCPManager

# 全局实例化 Manager
# 注意：这里只是实例化管理类，并不读取具体配置，配置是在函数内动态读取的
mgr = MCPManager()

async def build_dynamic_agent():
    """
    [核心工厂函数]
    每次对话前调用。动态组装【内置工具】+【已激活 MCP 工具】，并生成动态Prompt。
    """

    # ==========================================
    # Step 1: 收集所有工具 (Tools Assembly)
    # ==========================================

    # 1.1 获取内置工具 (Weather, Tavily) - 这些永远在线
    tools: List[BaseTool] = get_builtin_tools()

    # 1.2 获取当前激活的 MCP 配置 (从 mcp_config.json 读取)
    mcp_config = mgr.get_active_config()

    mcp_tools: List[BaseTool] = []

    # 1.3 动态挂载 MCP 工具
    if mcp_config:
        try:
            # 建立客户端连接
            # MultiServerMCPClient 会根据 config 自动处理 stdio/SSE 连接
            client = MultiServerMCPClient(mcp_config)

            # 获取工具列表 (增加3秒超时控制)
            mcp_tools = await asyncio.wait_for(client.get_tools(), timeout=3.0)
            print(f"[Agent Factory] 已动态挂载 {len(mcp_tools)} 个 MCP 工具")
        except asyncio.TimeoutError:
            print(f"⚠️ [Agent Factory] MCP 挂载超时 (3s)，将降级运行，仅使用内置工具。")
        except Exception as e:
            print(f"⚠️ [Agent Factory] MCP 挂载失败: {e}")
        
    # 合并工具列表：内置 + 外挂
    all_tools = tools + mcp_tools

    # ==========================================
    # Step 2: 动态构建系统提示词 (Dynamic Prompting)
    # ==========================================

    # 2.1 生成工具清单字符串
    tool_descriptions = []
    for t in all_tools:
        # 提取工具名和第一行描述
        desc = t.description.split('\n')[0] if t.description else "无描述"
        tool_descriptions.append(f"- **{t.name}**: {desc}")

    tools_str = "\n".join(tool_descriptions)

    # 2.2 编写动态 Prompt
    # 采用 ReAct 标准结构，并注入工具清单
    system_prompt = f"""
你是一个功能强大的全能 AI 智能体：

### 🛠 你当前拥有的工具能力：
{tools_str}

### 🧠 思考与行动指南：
1. **优先使用工具**：如果用户的请求可以通过上述工具解决，请务必调用工具。
2. **内置工具规则**：
- 查询天气 -> 必须使用 `get_weather`。
- 搜索新闻/实时信息 -> 必须使用 `search_tool` (Tavily)。
3. **MCP 工具规则**：
- 请仔细阅读工具列表。如果用户请求涉及数据库、文件操作或特定服务（如地图），请调用对应的 MCP 工具。
4. **语言**：始终使用简体中文回答用户。

现在，请根据用户的输入，灵活选择工具开始工作。
"""
    
    # ==========================================
    # Step 3: 创建并返回 Agent 实例
    # ==========================================
    model = ChatDeepSeek(
        model="deepseek-chat",
        temperature=0,
        streaming=True
    )

    agent = create_agent(
        model=model,
        tools=all_tools,
        system_prompt=system_prompt
    )

    return agent