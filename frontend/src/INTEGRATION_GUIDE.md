# 赋范AI Agent with MCP - 集成指南

本项目是一个基于 React + TypeScript 的 AI Agent 前端应用，设计用于与 LangChain 1.1、DeepSeek-V3.2 和 MCP (Model Context Protocol) 工具集成。

## 🎯 当前状态

当前版本使用**模拟数据**进行演示。要接入真实的 AI 能力，请按照以下步骤操作。

## 🔧 集成真实 API

### 1. 安装依赖

```bash
npm install @langchain/core @langchain/openai @langchain/community
npm install @modelcontextprotocol/sdk
```

### 2. 创建 LangChain Agent 服务

在 `/utils/langchainAgent.ts` 中替换 `mockAgent.ts`：

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { MCPTool } from '../types';

// 初始化 DeepSeek 模型
const initModel = (apiKey: string) => {
  return new ChatOpenAI({
    model: 'deepseek-chat',
    openAIApiKey: apiKey,
    configuration: {
      baseURL: 'https://api.deepseek.com/v1'
    },
    streaming: true,
    temperature: 0.7
  });
};

// 初始化工具
const initTools = async (mcpTools: MCPTool[], tavilyApiKey?: string) => {
  const tools = [];
  
  // Tavily Search
  if (tavilyApiKey && mcpTools.some(t => t.id === 'tavily-search' && t.enabled)) {
    tools.push(new TavilySearchResults({
      apiKey: tavilyApiKey,
      maxResults: 3
    }));
  }
  
  // 其他 MCP 工具需要通过 MCP SDK 集成
  // 这里需要根据每个 MCP 工具的配置动态加载
  
  return tools;
};

// 创建 Agent
export const createAgent = async (
  deepseekApiKey: string,
  mcpTools: MCPTool[],
  tavilyApiKey?: string
) => {
  const model = initModel(deepseekApiKey);
  const tools = await initTools(mcpTools, tavilyApiKey);
  
  const agent = await createToolCallingAgent({
    llm: model,
    tools
  });
  
  return new AgentExecutor({
    agent,
    tools
  });
};

// 执行 Agent
export const runAgent = async (
  executor: AgentExecutor,
  message: string,
  onThought?: (thought: string) => void,
  onAction?: (action: string) => void
) => {
  const result = await executor.invoke({
    input: message
  }, {
    callbacks: [{
      handleAgentAction: async (action) => {
        onAction?.(`Action: ${action.tool}\nInput: ${JSON.stringify(action.toolInput)}`);
      },
      handleAgentEnd: async (action) => {
        // Agent 完成
      }
    }]
  });
  
  return result;
};
```

### 3. 集成 MCP 工具

MCP 工具通常运行在 Node.js 后端。你需要：

1. **创建后端服务** (Express/Fastify)
2. **启动 MCP Servers**（根据用户配置）
3. **通过 WebSocket/HTTP 与前端通信**

示例后端结构：

```javascript
// server.js
const { MCPClient } = require('@modelcontextprotocol/sdk');

const mcpClients = {};

// 启动 MCP Server
async function startMCPServer(config) {
  const client = new MCPClient({
    command: config.command,
    args: config.args,
    env: config.env
  });
  
  await client.connect();
  return client;
}

// 调用 MCP 工具
async function callMCPTool(serverId, toolName, params) {
  const client = mcpClients[serverId];
  return await client.callTool(toolName, params);
}
```

### 4. 环境变量配置

创建 `.env.local` 文件：

```env
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key_here
VITE_TAVILY_API_KEY=your_tavily_api_key_here
```

## 📦 MCP 工具示例

### Puppeteer MCP

```bash
npx -y @modelcontextprotocol/server-puppeteer
```

### Notion MCP

```bash
export NOTION_API_KEY=your_notion_key
npx -y @notionhq/mcp-server-notion
```

### FileSystem MCP

```bash
npx -y @modelcontextprotocol/server-filesystem /allowed/path
```

## 🔄 数据流

```
用户输入 
  → 前端 (React)
  → 后端 (Express + LangChain)
  → DeepSeek API
  → MCP 工具调用
  → 返回结果
  → 前端渲染
```

## 📚 参考资源

- [LangChain 文档](https://js.langchain.com/docs/)
- [DeepSeek API 文档](https://platform.deepseek.com/docs)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [Tavily Search API](https://tavily.com/)

## ⚠️ 注意事项

1. **API Key 安全**：永远不要在前端暴露 API Key，应该通过后端代理
2. **MCP 工具隔离**：MCP Server 应该在受控环境中运行
3. **成本控制**：设置请求频率限制和 token 使用上限
4. **错误处理**：添加完善的错误处理和重试机制

## 🚀 部署建议

### 前端
- Vercel / Netlify (静态托管)

### 后端
- Railway / Render (Node.js 服务)
- 使用 Docker 容器化 MCP Servers

## 📝 许可证

MIT License

---

**Powered by 赋范AI (fufan.ai)**
