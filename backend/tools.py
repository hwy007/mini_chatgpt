import os
import json
import requests
from dotenv import load_dotenv
from langchain_tavily import TavilySearch
from langchain.tools import tool
from pydantic import BaseModel, Field

# 1. 加载环境变量
load_dotenv(override=True)

# 2. 定义内置搜索工具(Tavily)
search_tool = TavilySearch(max_results=5, topic="general")

# 3. 定义自定义工具的参数结构(Pydantic)
class WeatherQuery(BaseModel):
    loc: str = Field(description="The location name of the city")

# 4. 定义自定义天气工具(OpenWeatherMap)
@tool(args_schema=WeatherQuery)
def get_weather(loc: str):
    """
    查询即时天气函数
    :param loc: 必要参数，字符串类型，用于表示查询天气的具体城市名称。
    注意，中国的城市需要用对应城市的英文名称代替，例如如果需要查询北京市天气，则loc参数需要输入'Beijing';
    :return: OpenWeather API查询即时天气的结果，返回JSON字符串。
    """
    # Step 1. 构建请求URL
    url = "https://api.openweathermap.org/data/2.5/weather"

    # Step 2. 设置查询参数
    api_key = os.getenv("OPENWEATHER_API_KEY")

    params = {
        "q": loc,
        "appid": api_key,
        "units": "metric", # 使用摄氏度
        "lang": "zh_cn"
    }

    try:
        # Step 3. 发送GET请求
        response = requests.get(url, params=params, timeout=5)

        # Step 4. 解析响应
        if response.status_code == 200:
            data = response.json()
            # 将字典转换为JSON字符串返回，方便大模型阅读
            return json.dumps(data, ensure_ascii=False)
        else:
            return f"查询失败，状态码：{response.status_code}，错误信息：{response.text}"
    
    except Exception as e:
        return f"网络请求异常：{str(e)}"

# 5. 导出工具列表
# 供agent.py统一调用
def get_tools():
    return [search_tool, get_weather]