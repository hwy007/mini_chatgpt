import React from 'react';
import { Plus, MessageSquare, Trash2, Edit2 } from 'lucide-react';
import { Conversation } from '../types';
import { cn } from './ui';

interface LeftSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export const LeftSidebar = ({ conversations, activeId, onSelect, onNew, onDelete }: LeftSidebarProps) => {
  return (
    <div className="h-full bg-slate-50 border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <button 
          onClick={onNew}
          className="w-full flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          新建对话
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "group flex items-center justify-between p-3 rounded-lg cursor-pointer text-sm transition-colors",
              activeId === conv.id ? "bg-white shadow-sm border border-slate-200 text-indigo-600 font-medium" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{conv.title}</span>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500 transition-all"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};