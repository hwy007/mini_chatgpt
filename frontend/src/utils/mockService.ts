import { Message, TextBlock, ToolCallBlock } from '../types';

// 模拟后端 SSE 事件生成器
export const simulateChatStream = async (
  query: string,
  onEvent: (event: any) => void
) => {
  // 1. 模拟思考/文本输出
  const thought = "我将为您分析这个问题... ";
  for (let i = 0; i < thought.length; i++) {
    await new Promise((r) => setTimeout(r, 30));
    onEvent({
      type: 'token',
      data: { content: thought[i], content_type: 'text' },
    });
  }

  // 2. 模拟工具调用开始
  await new Promise((r) => setTimeout(r, 500));
  onEvent({
    type: 'tool_start',
    data: {
      tool_name: 'tavily_search',
      input: { query: query },
    },
  });

  // 3. 模拟工具执行时间
  await new Promise((r) => setTimeout(r, 1500));

  // 4. 模拟工具调用结束
  onEvent({
    type: 'tool_end',
    data: {
      tool_name: 'tavily_search',
      output: {
        results: [
          { title: 'DeepSeek V3 介绍', url: 'https://deepseek.com' },
          { title: 'LangChain Agent 开发', url: 'https://langchain.com' },
        ],
      },
    },
  });

  // 5. 模拟最终总结文本
  const summary = `\n\n根据搜索结果，**${query}** 是一个非常热门的话题。DeepSeek V3.2 结合 LangChain 可以实现强大的 Agent 功能。`;
  for (let i = 0; i < summary.length; i++) {
    await new Promise((r) => setTimeout(r, 20));
    onEvent({
      type: 'token',
      data: { content: summary[i], content_type: 'text' },
    });
  }

  // 6. 结束
  onEvent({ type: 'finish', data: {} });
};