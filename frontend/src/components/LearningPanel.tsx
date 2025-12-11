import React from 'react';
import { X, Maximize2, QrCode } from 'lucide-react';

export const LearningPanel = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="h-full bg-white flex flex-col border-r border-slate-200 shadow-xl">
      <div className="h-12 bg-slate-900 text-white flex items-center justify-between px-4">
        <span className="font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          课程课件
        </span>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-slate-800 rounded"><QrCode className="h-4 w-4" /></button>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="flex-1 bg-slate-100 relative">
        <iframe 
          src="about:blank" 
          className="w-full h-full border-none" 
          title="courseware"
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-slate-400">课件内容加载区域 (IFrame)</span>
        </div>
      </div>
    </div>
  );
};