import os
from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek
from langchain.agents import create_agent
from tools import get_tools # 导入我们在 tools.py 中定义的工具

# 1. 加载环境变量
load_dotenv(override=True)

# 2. 获取工具列表
tools = get_tools()

# 3. 创建模型
model = ChatDeepSeek(
    model="deepseek-chat"
)

# 4. 定义系统提示词
prompt = """
你是一名乐于助人的智能助手，擅长根据用户的问题选择合适的工具来查询信息并回答。

当用户的问题涉及**天气信息**时，你应优先调用`get_weather`工具，查询用户指定城市的实时天气，并在回答中总结查询结果。

当用户的问题涉及**新闻、事件、实时动态**时，你应优先调用`search_tool`工具，检索相关的最新信息，并在回答中简要概述。

如果问题既包含天气又包含新闻，请先使用`get_weather`查询天气，再使用`search_tool`查询新闻，最后将结果合并后回复用户。

所有回答应使用**简体中文**，条理清晰、简洁友好。
"""

# 5. 创建智能体
# create_agent 是 LangChain 1.0 的核心工厂函数
# 它自动完成了以下复杂工作：
#   - 将 Python 工具转换为模型能看懂的 JSON Schema (bind_tools)
#   - 构建 ReAct (思考-行动-观察) 的循环图结构
#   - 注入 System Prompt
agent = create_agent(
    model=model,
    tools=tools,
    system_prompt=prompt
)