// Mock agent responses for demonstration
// In production, replace with actual LangChain + DeepSeek + MCP integration

import { Message, ThoughtStep, SearchResult } from '../types';

export const generateAgentResponse = async (
  userMessage: string,
  activeTools: string[]
): Promise<{ content: string; thoughtProcess: ThoughtStep[]; searchResults?: SearchResult[] }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const hasSearch = activeTools.includes('Tavily Search');
  
  // Mock thought process
  const thoughtProcess: ThoughtStep[] = [
    { type: 'thought', content: `分析用户问题: "${userMessage.substring(0, 50)}..."` },
    { type: 'thought', content: `可用工具: [${activeTools.join(', ')}]` },
  ];

  let content = '';
  let searchResults: SearchResult[] | undefined;

  // Simulate different responses based on keywords
  if (userMessage.includes('DeepSeek') || userMessage.includes('API')) {
    if (hasSearch) {
      thoughtProcess.push(
        { type: 'action', content: 'tavily_search_results_json' },
        { type: 'observation', content: 'Action Input: { "query": "DeepSeek API python documentation" }' },
        { type: 'observation', content: 'Found official documentation and examples.' }
      );

      searchResults = [
        {
          title: 'DeepSeek API 官方文档',
          site: 'docs.deepseek.com',
          description: '完全兼容 OpenAI 接口格式，提供 Python、Node.js 等多语言调用示例...',
          icon: 'book',
          url: 'https://docs.deepseek.com'
        },
        {
          title: '如何使用 LangChain 集成 DeepSeek',
          site: 'medium.com',
          description: '使用 ChatOpenAI 类轻松接入 DeepSeek API，支持流式输出...',
          icon: 'brands fa-medium'
        },
        {
          title: 'DeepSeek Python SDK 快速开始',
          site: 'github.com',
          description: 'Community SDK and code examples for DeepSeek API...',
          icon: 'brands fa-github'
        }
      ];
    }

    content = `**如何调用 DeepSeek API**

DeepSeek API 设计兼容 OpenAI 格式，可直接使用 \`openai\` Python 库调用。

### Python SDK 示例

` + '```python\n' + `from openai import OpenAI

client = OpenAI(
    api_key="YOUR_DEEPSEEK_API_KEY",
    base_url="https://api.deepseek.com/v1"
)

# 发起非流式对话
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "user", "content": "你好！"},
    ]
)

print(response.choices[0].message.content)
` + '```\n\n' + `### 与 LangChain 集成

` + '```python\n' + `from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="deepseek-chat",
    openai_api_key="YOUR_DEEPSEEK_API_KEY",
    openai_api_base="https://api.deepseek.com/v1"
)

response = llm.invoke("如何使用 Python 爬虫？")
print(response.content)
` + '```\n\n' + `记得替换 \`YOUR_DEEPSEEK_API_KEY\` 为你的实际 API 密钥。`;
  } else if (userMessage.includes('AI') || userMessage.includes('行业')) {
    if (hasSearch) {
      thoughtProcess.push(
        { type: 'action', content: 'tavily_search_results_json' },
        { type: 'observation', content: 'Action Input: { "query": "AI industry trends 2024" }' },
        { type: 'observation', content: 'Found recent news and reports.' }
      );

      searchResults = [
        {
          title: '2024 AI 行业发展报告',
          site: 'techcrunch.com',
          description: 'Generative AI continues to dominate, with focus on efficiency and safety...',
          icon: 'chart-line'
        },
        {
          title: 'OpenAI 和 DeepSeek 的最新动态',
          site: 'venturebeat.com',
          description: 'New models released with improved reasoning capabilities...',
          icon: 'newspaper'
        },
        {
          title: 'AI Agent 技术的崛起',
          site: 'arxiv.org',
          description: 'Research papers on autonomous AI agents and tool use...',
          icon: 'graduation-cap'
        }
      ];
    }

    content = `**2024 AI 行业动态分析**

当前 AI 行业呈现以下主要趋势：

### 1. 大模型竞争加剧
- **DeepSeek-V3** 等国产模型性能快速提升
- 开源与闭源模型并存发展
- 推理成本持续降低

### 2. AI Agent 成为热点
- 工具调用能力成为标配
- MCP (Model Context Protocol) 等新协议出现
- 多模态能力整合

### 3. 企业级应用落地
- 代码生成、客服、内容创作等场景成熟
- 私有化部署需求增长
- 安全性和可控性受到重视

总体来看，AI 技术正在从"能用"向"好用"、"可控"方向发展。`;
  } else if (userMessage.includes('爬虫') || userMessage.includes('Python') || userMessage.includes('数据')) {
    thoughtProcess.push(
      { type: 'thought', content: '用户询问Python相关内容，准备代码示例' }
    );

    content = `**Python Web 爬虫入门示例**

以下是两个常用的Python爬虫示例代码：

### 1. 使用 requests 获取网页内容

` + '```python\n' + `import requests
from bs4 import BeautifulSoup

# 发送HTTP请求
url = "https://example.com"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
response = requests.get(url, headers=headers)

# 解析HTML
soup = BeautifulSoup(response.text, 'html.parser')

# 提取所有链接
links = soup.find_all('a')
for link in links:
    print(link.get('href'))
` + '```\n\n' + `### 2. 异步爬虫示例（使用 aiohttp）

` + '```python\n' + `import asyncio
import aiohttp
from typing import List

async def fetch_url(session, url: str) -> str:
    """异步获取单个URL内容"""
    async with session.get(url) as response:
        return await response.text()

async def main(urls: List[str]):
    """并发获取多个URL"""
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        return results

# 运行示例
urls = [
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/page3"
]
results = asyncio.run(main(urls))
print(f"成功获取 {len(results)} 个页面")
` + '```\n\n' + `**注意事项：**
* 遵守网站的 robots.txt 规则
* 添加适当的请求延迟，避免过载服务器
* 使用代理池提高稳定性`;
  } else {
    thoughtProcess.push(
      { type: 'thought', content: '理解用户需求并准备回答' }
    );

    content = `我已收到您的消息："${userMessage}"

我是赋范AI智能助手，可以帮您：
- 📝 编写和解释代码
- 🔍 搜索最新信息（已启用 Tavily Search）
- 🛠️ 调用 MCP 工具执行复杂任务

您可以点击右上角 **MCP 工具箱** 来扩展我的能力！`;
  }

  return {
    content,
    thoughtProcess,
    searchResults
  };
};

// Mock wish analysis (tool recommendation)
export const analyzeWish = async (wish: string) => {
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Return multiple tools for testing
  return {
    wish,
    suggestedTools: [
      {
        name: 'MCP工具1',
        description: '这是第一个测试工具，用于演示多选功能',
        icon: 'tool',
        iconBg: 'bg-blue-50 text-blue-500',
        functions: ['function_1', 'function_2'],
        config: {
          mcpServers: {
            tool1: {
              command: 'npx',
              args: ['-y', '@example/tool1']
            }
          }
        },
        isNew: true
      },
      {
        name: 'MCP工具2',
        description: '这是第二个测试工具，支持更多高级功能',
        icon: 'tool',
        iconBg: 'bg-green-50 text-green-500',
        functions: ['function_3', 'function_4'],
        config: {
          mcpServers: {
            tool2: {
              command: 'npx',
              args: ['-y', '@example/tool2']
            }
          }
        },
        isNew: true
      },
      {
        name: 'MCP工具3',
        description: '第三个工具提供数据处理和分析能力',
        icon: 'tool',
        iconBg: 'bg-purple-50 text-purple-500',
        functions: ['function_5', 'function_6'],
        config: {
          mcpServers: {
            tool3: {
              command: 'npx',
              args: ['-y', '@example/tool3']
            }
          }
        },
        isNew: false
      },
      {
        name: 'MCP工具4',
        description: '第四个工具专注于文件操作和管理',
        icon: 'tool',
        iconBg: 'bg-orange-50 text-orange-500',
        functions: ['function_7', 'function_8'],
        config: {
          mcpServers: {
            tool4: {
              command: 'npx',
              args: ['-y', '@example/tool4']
            }
          }
        },
        isNew: true
      },
      {
        name: 'MCP工具5',
        description: '第五个工具提供网络请求和API调用功能',
        icon: 'tool',
        iconBg: 'bg-red-50 text-red-500',
        functions: ['function_9', 'function_10'],
        config: {
          mcpServers: {
            tool5: {
              command: 'npx',
              args: ['-y', '@example/tool5']
            }
          }
        },
        isNew: true
      }
    ]
  };
};