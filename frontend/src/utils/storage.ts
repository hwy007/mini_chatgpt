import { Conversation, MCPTool } from '../types';

const KEYS = {
  CONVERSATIONS: 'ds_agent_conversations',
  ACTIVE_ID: 'ds_agent_active_id',
  MCP_TOOLS: 'ds_agent_mcp_tools',
};

export const storage = {
  saveConversations(conversations: Conversation[]): void {
    localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(conversations));
  },
  getConversations(): Conversation[] {
    const data = localStorage.getItem(KEYS.CONVERSATIONS);
    return data ? JSON.parse(data) : [];
  },
  setActiveConversationId(id: string): void {
    localStorage.setItem(KEYS.ACTIVE_ID, id);
  },
  getActiveConversationId(): string | null {
    return localStorage.getItem(KEYS.ACTIVE_ID);
  },
  saveMCPTools(tools: MCPTool[]): void {
    localStorage.setItem(KEYS.MCP_TOOLS, JSON.stringify(tools));
  },
  getMCPTools(): MCPTool[] {
    const data = localStorage.getItem(KEYS.MCP_TOOLS);
    return data ? JSON.parse(data) : []; // 初始可返回默认工具
  },
};