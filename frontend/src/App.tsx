import React, { useState, useEffect, useRef } from 'react';
import { Resizable } from 're-resizable';
import { Send, GraduationCap, LayoutPanelLeft, Sparkles } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid'; // 如果没有uuid库，可以用 Date.now().toString() 替代
import { cn } from './components/ui';

// Components
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { MessageBubble } from './components/MessageBubble';
import { LearningPanel } from './components/LearningPanel';
import { Textarea } from './components/ui';

// Utils & Types
import { storage } from './utils/storage';
import { simulateChatStream } from './utils/mockService';
import { Conversation, Message, MCPTool, TextBlock, ToolCallBlock } from './types';

// Mock Initial Data
const INITIAL_TOOLS: MCPTool[] = [
  {
    id: '1',
    name: 'Tavily Search',
    description: '强大的 AI 搜索引擎，支持实时联网查询。',
    icon: '🔍',
    iconBg: 'bg-blue-100',
    introduction: '',
    config: { mcpServers: {} },
    enabled: true,
    type: 'stdio'
  },
  {
    id: '2',
    name: 'Browser',
    description: '自动化浏览器操作，支持网页抓取。',
    icon: '🌐',
    iconBg: 'bg-orange-100',
    introduction: '',
    config: { mcpServers: {} },
    enabled: false,
    type: 'stdio'
  }
];

function App() {
  // --- State ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>(INITIAL_TOOLS);
  
  // Layout State
  const [showLeftPanel, setShowLeftPanel] = useState(false); // Learning Panel

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  
  // Load Data
  useEffect(() => {
    const loadedConvs = storage.getConversations();
    const loadedTools = storage.getMCPTools();
    
    if (loadedConvs.length > 0) {
      setConversations(loadedConvs);
      const lastActive = storage.getActiveConversationId();
      setActiveId(lastActive || loadedConvs[0].id);
    } else {
      createNewConversation();
    }

    if (loadedTools.length > 0) setMcpTools(loadedTools);
  }, []);

  // Save Data
  useEffect(() => {
    storage.saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (activeId) storage.setActiveConversationId(activeId);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, isStreaming]);

  // --- Helpers ---

  const activeConversation = conversations.find(c => c.id === activeId);

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: uuidv4(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveId(newConv.id);
  };

  const deleteConversation = (id: string) => {
    const newConvs = conversations.filter(c => c.id !== id);
    setConversations(newConvs);
    if (activeId === id) {
      setActiveId(newConvs.length > 0 ? newConvs[0].id : null);
    }
    if (newConvs.length === 0) createNewConversation();
  };

  const handleSend = async () => {
    if (!input.trim() || !activeId || isStreaming) return;

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    // Update UI with User Message
    setConversations(prev => prev.map(c => {
      if (c.id === activeId) {
        return {
          ...c,
          messages: [...c.messages, userMsg],
          title: c.messages.length === 0 ? input.slice(0, 20) : c.title // Rename first chat
        };
      }
      return c;
    }));
    
    setInput('');
    setIsStreaming(true);

    // Prepare Assistant Message Placeholder
    const assistantMsgId = uuidv4();
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      blocks: [],
      timestamp: Date.now(),
      isStreaming: true
    };

    setConversations(prev => prev.map(c => 
      c.id === activeId ? { ...c, messages: [...c.messages, initialAssistantMsg] } : c
    ));

    // Call Mock Stream
    try {
      await simulateChatStream(userMsg.content || '', (event) => {
        setConversations(currentConvs => {
          return currentConvs.map(conv => {
            if (conv.id !== activeId) return conv;

            const msgs = [...conv.messages];
            const lastMsgIndex = msgs.findIndex(m => m.id === assistantMsgId);
            if (lastMsgIndex === -1) return conv;

            const msg = { ...msgs[lastMsgIndex] };
            let blocks = [...(msg.blocks || [])];

            if (event.type === 'token') {
              // Handle Text Token
              const lastBlock = blocks[blocks.length - 1];
              if (lastBlock && lastBlock.type === 'text') {
                blocks[blocks.length - 1] = {
                  ...lastBlock,
                  content: lastBlock.content + event.data.content
                };
              } else {
                blocks.push({
                  id: uuidv4(),
                  type: 'text',
                  content: event.data.content,
                  timestamp: Date.now()
                });
              }
            } else if (event.type === 'tool_start') {
              // Handle Tool Start
              blocks.push({
                id: uuidv4(),
                type: 'tool_call',
                toolName: event.data.tool_name,
                input: event.data.input,
                status: 'running',
                timestamp: Date.now()
              });
            } else if (event.type === 'tool_end') {
              // Handle Tool End
              const toolBlockIndex = blocks.findIndex(b => 
                b.type === 'tool_call' && b.toolName === event.data.tool_name && b.status === 'running'
              );
              if (toolBlockIndex !== -1) {
                blocks[toolBlockIndex] = {
                  ...(blocks[toolBlockIndex] as ToolCallBlock),
                  status: 'completed',
                  output: event.data.output
                };
              }
            } else if (event.type === 'finish') {
              msg.isStreaming = false;
              msg.isComplete = true;
            }

            msg.blocks = blocks;
            msgs[lastMsgIndex] = msg;
            return { ...conv, messages: msgs };
          });
        });
      });
    } catch (err) {
      toast.error("消息发送失败");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- Render ---

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-slate-900 font-sans">
      <Toaster position="top-center" richColors />

      {/* 1. Learning Mode Panel (Optional Left) */}
      {showLeftPanel && (
        <Resizable
          defaultSize={{ width: '25%', height: '100%' }}
          minWidth={300}
          maxWidth={800}
          enable={{ right: true }}
          className="z-20"
        >
          <LearningPanel onClose={() => setShowLeftPanel(false)} />
        </Resizable>
      )}

      {/* 2. Chat Sidebar (Conversations) */}
      <Resizable
        defaultSize={{ width: 260, height: '100%' }}
        minWidth={200}
        maxWidth={400}
        enable={{ right: true }}
        className="hidden md:block z-10"
      >
        <LeftSidebar 
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={createNewConversation}
          onDelete={deleteConversation}
        />
      </Resizable>

      {/* 3. Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* Header */}
        <header className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white/80 backdrop-blur">
          <div className="font-semibold text-slate-700">DeepSeek Agent V3.2</div>
          <button 
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            className={cn("p-2 rounded hover:bg-slate-100", showLeftPanel && "text-indigo-600 bg-indigo-50")}
            title="打开学习模式"
          >
            <GraduationCap className="h-5 w-5" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:px-12 scroll-smooth">
          {activeConversation?.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="bg-indigo-50 p-4 rounded-full">
                <Sparkles className="h-8 w-8 text-indigo-500" />
              </div>
              <p className="text-lg font-medium text-slate-600">有什么我可以帮你的吗？</p>
              <div className="flex gap-2">
                <span className="text-xs border px-2 py-1 rounded-full cursor-pointer hover:bg-slate-50">分析网页</span>
                <span className="text-xs border px-2 py-1 rounded-full cursor-pointer hover:bg-slate-50">搜索 Rust 教程</span>
              </div>
            </div>
          ) : (
            activeConversation?.messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="max-w-3xl mx-auto relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="发送消息给 Agent..."
              className="pr-12 shadow-sm resize-none py-3"
              disabled={isStreaming}
              rows={1}
              style={{ minHeight: '50px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="absolute right-2 bottom-2.5 p-1.5 bg-indigo-600 text-white rounded-md disabled:bg-slate-300 hover:bg-indigo-700 transition-colors"
            >
              {isStreaming ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="text-center mt-2 text-[10px] text-slate-400">
            AI 生成内容可能包含错误，请核查重要信息。
          </div>
        </div>
      </div>

      {/* 4. MCP Tools Sidebar */}
      <Resizable
        defaultSize={{ width: 300, height: '100%' }}
        minWidth={250}
        maxWidth={500}
        enable={{ left: true }}
        handleClasses={{ left: "w-1 hover:bg-indigo-500 transition-colors" }}
      >
        <RightSidebar 
          tools={mcpTools}
          onToggleTool={(id) => {
            setMcpTools(tools => tools.map(t => t.id === id ? {...t, enabled: !t.enabled} : t));
            toast.success("工具状态已更新");
          }}
          onAddWish={(wish) => {
            toast.info("AI 正在分析您的需求...", { description: wish });
            setTimeout(() => {
              toast.success("已为您推荐相关工具", { description: "浏览器自动化插件" });
            }, 1500);
          }}
        />
      </Resizable>
    </div>
  );
}

export default App;