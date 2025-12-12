import { X, Maximize, Minimize, Gift } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Resizable } from 're-resizable';

interface LearningModePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onWidthChange?: (width: number) => void;
  onOpenQRCode: () => void;
}

export function LearningModePanel({ isOpen, onClose, onWidthChange, onOpenQRCode }: LearningModePanelProps) {
  const [width, setWidth] = useState(window.innerWidth * 0.33);
  const [timestamp, setTimestamp] = useState(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 每次打开面板时更新时间戳,确保获取最新内容
  useEffect(() => {
    if (isOpen) {
      setTimestamp(Date.now());
    }
  }, [isOpen]);

  // 切换全屏（CSS模拟）
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  // 全屏模式下的样式
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-between px-6 shrink-0 relative shadow-sm">
          <h2 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">课程课件</h2>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Minimize className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Resizable
      size={{ width, height: '100vh' }}
      onResizeStop={(e, direction, ref, d) => {
        const newWidth = width + d.width;
        setWidth(newWidth);
        onWidthChange?.(newWidth);
      }}
      minWidth={300}
      maxWidth={window.innerWidth * 0.6}
      enable={{ right: true }}
      handleStyles={{
        right: {
          width: '8px',
          right: '-4px',
          cursor: 'ew-resize',
        }
      }}
      handleComponent={{
        right: (
          <div className="h-full w-8 flex items-center justify-center group cursor-ew-resize">
            <div className="h-12 w-1 bg-slate-300 rounded-full group-hover:bg-indigo-500 group-hover:w-1.5 transition-all duration-200 shadow-sm" />
          </div>
        )
      }}
      className="fixed left-0 top-0 bottom-0 bg-white border-r border-slate-200 shadow-2xl z-30 flex flex-col"
    >
      {/* Header */}
      <div className="h-16 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-between px-6 shrink-0 relative shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </Resizable>
  );
}