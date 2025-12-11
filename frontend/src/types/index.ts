export interface TextBlock {
  id: string;
  type: 'text';
  content: string;
  timestamp: number;
}

export interface ToolCallBlock {
  id: string;
  type: 'tool_call';
  toolName: string;
  input: any;
  output?: any;
  status: 'running' | 'completed';
  timestamp: number;
  isExpanded?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content?: string; // 用户消息
  blocks?: (TextBlock | ToolCallBlock)[]; // AI 消息
  timestamp: number;
  isComplete?: boolean;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface MCPConfig {
  mcpServers: {
    [key: string]: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
}

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconBg: string;
  introduction: string;
  config: MCPConfig;
  enabled: boolean;
  type?: 'stdio' | 'sse';
}