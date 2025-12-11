import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, ChevronDown, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Message, TextBlock, ToolCallBlock } from '../types';
import { cn } from './ui';

const ToolCard = ({ block }: { block: ToolCallBlock }) => {
  const [expanded, setExpanded] = useState(false);
  const isRunning = block.status === 'running';

  return (
    <div className="my-2 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div 
        className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          <span className="font-mono text-xs font-semibold text-slate-700">
            调用工具: {block.toolName}
          </span>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </div>
      
      {expanded && (
        <div className="p-3 text-xs font-mono bg-slate-50 border-t border-slate-200">
          <div className="mb-2">
            <div className="text-slate-500 mb-1">输入 (Input):</div>
            <pre className="bg-slate-100 p-2 rounded text-slate-700 overflow-x-auto">
              {JSON.stringify(block.input, null, 2)}
            </pre>
          </div>
          {!isRunning && block.output && (
            <div>
              <div className="text-slate-500 mb-1">输出 (Output):</div>
              <pre className="bg-indigo-50 p-2 rounded text-indigo-900 overflow-x-auto">
                {JSON.stringify(block.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[85%] md:max-w-[75%]", isUser ? "flex-row-reverse" : "flex-row")}>
        {/* Avatar */}
        <div className={cn(
          "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-1",
          isUser ? "bg-indigo-600 ml-3" : "bg-white border border-slate-200 mr-3"
        )}>
          {isUser ? <User className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-indigo-600" />}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-1 min-w-0">
          {isUser ? (
            <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm">
              {message.content}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm">
              {message.blocks?.map((block) => {
                if (block.type === 'text') {
                  return (
                    <div key={block.id} className="prose prose-slate prose-sm max-w-none">
                      <ReactMarkdown>{block.content}</ReactMarkdown>
                    </div>
                  );
                }
                if (block.type === 'tool_call') {
                  return <ToolCard key={block.id} block={block} />;
                }
                return null;
              })}
              {message.isStreaming && <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1 align-middle" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};