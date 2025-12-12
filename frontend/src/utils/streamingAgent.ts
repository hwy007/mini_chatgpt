// 流式Agent响应模拟 - 模拟LangChain的流式输出
import { MessageChunk } from '../types';

// 模拟流式响应的延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟打字机效果
async function* typeWriter(text: string, speed: number = 30) {
  for (let i = 0; i <= text.length; i++) {
    yield text.slice(0, i);
    await delay(speed);
  }
}

// 生成唯一ID
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 流式生成响应
export async function* generateStreamingResponse(
  userMessage: string,
  activeTools: string[]
): AsyncGenerator<MessageChunk> {
  
  const hasSearch = activeTools.includes('Tavily Search');
  
  // 场景1: Python爬虫教程
  if (userMessage.includes('爬虫') || userMessage.includes('Python') || userMessage.includes('数据')) {
    // 第一次思考
    yield {
      id: generateId(),
      type: 'thought',
      content: '用户询问Python爬虫相关内容。我需要：\n1. 分析用户的具体需求\n2. 提供完整的代码示例\n3. 说明注意事项和最佳实践',
      timestamp: Date.now()
    };
    
    await delay(800);
    
    // 第一次回复
    const response1 = `好的，我来为你介绍Python爬虫的基础知识和代码示例。

## 什么是网络爬虫？

网络爬虫是一种自动化程序，用于从网站上提取数据。Python是编写爬虫的最佳语言之一。

## 基础示例：使用requests库

下面是一个简单的爬虫示例：`;

    for await (const partial of typeWriter(response1, 20)) {
      yield {
        id: 'content_1',
        type: 'content',
        content: partial,
        timestamp: Date.now(),
        isStreaming: true
      };
    }
    
    yield {
      id: 'content_1',
      type: 'content',
      content: response1,
      timestamp: Date.now(),
      isStreaming: false
    };
    
    await delay(500);
    
    // 工具调用 - 生成代码
    yield {
      id: generateId(),
      type: 'tool_call',
      content: `import requests
from bs4 import BeautifulSoup

# 发送HTTP请求
url = "https://example.com"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

response = requests.get(url, headers=headers)

# 检查请求是否成功
if response.status_code == 200:
    # 解析HTML
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # 提取所有标题
    titles = soup.find_all('h1')
    for title in titles:
        print(title.get_text().strip())
    
    # 提取所有链接
    links = soup.find_all('a')
    for link in links:
        href = link.get('href')
        if href:
            print(href)
else:
    print(f"请求失败，状态码: {response.status_code}")`,
      timestamp: Date.now()
    };
    
    await delay(800);
    
    // 第二次思考
    yield {
      id: generateId(),
      type: 'thought',
      content: '基础示例已提供。用户可能还需要了解异步爬虫来提高效率。我应该提供aiohttp的示例。',
      timestamp: Date.now()
    };
    
    await delay(600);
    
    // 第二次回复
    const response2 = `

## 进阶：异步爬虫

当需要爬取大量页面时，异步爬虫可以显著提高效率：`;

    for await (const partial of typeWriter(response2, 20)) {
      yield {
        id: 'content_2',
        type: 'content',
        content: partial,
        timestamp: Date.now(),
        isStreaming: true
      };
    }
    
    yield {
      id: 'content_2',
      type: 'content',
      content: response2,
      timestamp: Date.now(),
      isStreaming: false
    };
    
    await delay(500);
    
    // 第二次工具调用
    yield {
      id: generateId(),
      type: 'tool_call',
      content: `import asyncio
import aiohttp
from typing import List

async def fetch_url(session, url: str) -> dict:
    """异步获取单个URL的内容"""
    try:
        async with session.get(url) as response:
            html = await response.text()
            return {
                'url': url,
                'status': response.status,
                'content': html[:200]  # 只取前200字符
            }
    except Exception as e:
        return {'url': url, 'error': str(e)}

async def main(urls: List[str]):
    """并发获取多个URL"""
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        return results

# 使用示例
urls = [
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/page3"
]

# 运行异步任务
results = asyncio.run(main(urls))
for result in results:
    print(f"URL: {result.get('url')}")
    print(f"Status: {result.get('status', 'Error')}")
    print("-" * 50)`,
      timestamp: Date.now()
    };
    
    await delay(800);
    
    // 最终回复
    const response3 = `

## 注意事项

* **遵守robots.txt**: 检查网站的爬虫规则
* **设置请求延迟**: 避免对服务器造成压力
* **使用User-Agent**: 模拟真实浏览器访问
* **异常处理**: 处理网络错误和超时

这是一个展示图片的示例：
![Python爬虫架构](https://ml2022.oss-cn-hangzhou.aliyuncs.com/img/image-20251202171455296.png)

希望这些示例对你有帮助！如果有具体问题，随时问我。`;

    for await (const partial of typeWriter(response3, 20)) {
      yield {
        id: 'content_3',
        type: 'content',
        content: partial,
        timestamp: Date.now(),
        isStreaming: true
      };
    }
    
    yield {
      id: 'content_3',
      type: 'content',
      content: response3,
      timestamp: Date.now(),
      isStreaming: false
    };
  }
  
  // 场景2: DeepSeek API
  else if (userMessage.includes('DeepSeek') || userMessage.includes('API')) {
    yield {
      id: generateId(),
      type: 'thought',
      content: '用户询问DeepSeek API使用方法。需要提供Python SDK和LangChain集成的示例代码。',
      timestamp: Date.now()
    };
    
    await delay(800);
    
    const response1 = `## DeepSeek API 调用指南

DeepSeek API完全兼容OpenAI接口格式，可以直接使用openai库调用。

### 基础调用示例`;

    for await (const partial of typeWriter(response1, 20)) {
      yield {
        id: 'content_1',
        type: 'content',
        content: partial,
        timestamp: Date.now(),
        isStreaming: true
      };
    }
    
    yield {
      id: 'content_1',
      type: 'content',
      content: response1,
      timestamp: Date.now(),
      isStreaming: false
    };
    
    await delay(500);
    
    yield {
      id: generateId(),
      type: 'tool_call',
      content: `from openai import OpenAI

# 初始化客户端
client = OpenAI(
    api_key="YOUR_DEEPSEEK_API_KEY",
    base_url="https://api.deepseek.com/v1"
)

# 发起对话请求
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "你是一个helpful的AI助手"},
        {"role": "user", "content": "Python如何读取文件？"}
    ],
    temperature=0.7,
    max_tokens=2000
)

# 打印回复
print(response.choices[0].message.content)`,
      timestamp: Date.now()
    };
    
    await delay(800);
    
    yield {
      id: generateId(),
      type: 'thought',
      content: '基础示例已完成。用户可能需要LangChain集成方案，这样可以使用更多高级功能。',
      timestamp: Date.now()
    };
    
    await delay(600);
    
    const response2 = `

### LangChain 1.1集成

使用LangChain可以更方便地构建Agent应用：`;

    for await (const partial of typeWriter(response2, 20)) {
      yield {
        id: 'content_2',
        type: 'content',
        content: partial,
        timestamp: Date.now(),
        isStreaming: true
      };
    }
    
    yield {
      id: 'content_2',
      type: 'content',
      content: response2,
      timestamp: Date.now(),
      isStreaming: false
    };
    
    await delay(500);
    
    yield {
      id: generateId(),
      type: 'tool_call',
      content: `from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser

# 配置DeepSeek模型
llm = ChatOpenAI(
    model="deepseek-chat",
    openai_api_key="YOUR_DEEPSEEK_API_KEY",
    openai_api_base="https://api.deepseek.com/v1",
    temperature=0.7,
    streaming=True  # 启用流式输出
)

# 创建提示模板
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个专业的Python编程助手"),
    ("user", "{question}")
])

# 构建链
chain = prompt | llm | StrOutputParser()

# 流式调用
for chunk in chain.stream({"question": "如何使用asyncio?"}):
    print(chunk, end="", flush=True)`,
      timestamp: Date.now()
    };
    
    await delay(600);
    
    const response3 = `

记得将 \`YOUR_DEEPSEEK_API_KEY\` 替换为你的实际API密钥。DeepSeek-V3性能出色，性价比很高！`;

    for await (const partial of typeWriter(response3, 20)) {
      yield {
        id: 'content_3',
        type: 'content',
        content: partial,
        timestamp: Date.now(),
        isStreaming: true
      };
    }
    
    yield {
      id: 'content_3',
      type: 'content',
      content: response3,
      timestamp: Date.now(),
      isStreaming: false
    };
  }
  
  // 默认场景
  else {
    yield {
      id: generateId(),
      type: 'thought',
      content: `分析用户输入: "${userMessage}"\n可用工具: ${activeTools.join(', ')}`,
      timestamp: Date.now()
    };
    
    await delay(600);
    
    const response = `你好！我收到了你的消息："${userMessage}"

我是基于 **LangChain 1.1** 和 **DeepSeek-V3** 的智能助手，支持：

* 💬 多轮对话
* 🔧 MCP工具调用
* 🌐 网络搜索（Tavily）
* 📝 代码生成与解释

你可以尝试问我：
- "教我Python爬虫"
- "如何调用DeepSeek API"
- "帮我写一个异步函数"

右侧的 **MCP工具箱** 可以扩展我的能力！`;

    for await (const partial of typeWriter(response, 20)) {
      yield {
        id: 'content_1',
        type: 'content',
        content: partial,
        timestamp: Date.now(),
        isStreaming: true
      };
    }
    
    yield {
      id: 'content_1',
      type: 'content',
      content: response,
      timestamp: Date.now(),
      isStreaming: false
    };
  }
}
