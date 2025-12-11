import React from 'react';
import { Search, Settings, Power, ExternalLink } from 'lucide-react';
import { MCPTool } from '../types';
import { cn } from './ui';

interface RightSidebarProps {
  tools: MCPTool[];
  onToggleTool: (id: string) => void;
  onAddWish: (wish: string) => void;
}

export const RightSidebar = ({ tools, onToggleTool, onAddWish }: RightSidebarProps) => {
  const [wish, setWish] = React.useState('');

  const handleWishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wish.trim()) return;
    onAddWish(wish);
    setWish('');
  };

  return (
    <div className="h-full bg-slate-50 border-l border-slate-200 flex flex-col">
      {/* 许愿池区域 */}
      <div className="p-4 border-b border-slate-200 bg-indigo-50/50">
        <h3 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
          ✨ 工具许愿池
        </h3>
        <form onSubmit={handleWishSubmit} className="flex gap-2">
          <input
            type="text"
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            placeholder="我想操作浏览器..."
            className="flex-1 text-xs border border-indigo-200 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-400"
          />
          <button type="submit" className="bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-700">
            <Search className="h-3 w-3" />
          </button>
        </form>
      </div>

      {/* 工具列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tools.map((tool) => (
          <div key={tool.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={cn("text-lg p-1 rounded", tool.iconBg)}>{tool.icon}</span>
                <div>
                  <div className="font-semibold text-sm text-slate-800">{tool.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{tool.type}</div>
                </div>
              </div>
              <button
                onClick={() => onToggleTool(tool.id)}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  tool.enabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                )}
              >
                <Power className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-3 line-clamp-2">{tool.description}</p>
            <div className="flex justify-end border-t border-slate-100 pt-2">
               <button className="text-xs text-slate-500 flex items-center gap-1 hover:text-indigo-600">
                 <Settings className="h-3 w-3" /> 配置
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};