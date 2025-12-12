import { X } from 'lucide-react';
import qrCodeImage from 'figma:asset/7c73b617c5328633b79d49ed6ad1fb89a67402d7.png';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeModal({ isOpen, onClose }: QRCodeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-white">领取课件&源码</h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center space-y-6">
          {/* QR Code */}
          <div className="bg-white rounded-xl shadow-lg border-2 border-slate-100 p-4">
            <ImageWithFallback 
              src={qrCodeImage}
              alt="微信二维码" 
              className="w-64 h-64 object-contain"
            />
          </div>

          {/* Description */}
          <div className="text-center space-y-2">
            <p className="text-slate-700">
              微信扫码领取公开课课件 & 项目源码
            </p>
            <p className="text-sm text-slate-500">
              更多精彩内容等你来探索
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500">
            扫码后添加好友即可获取完整资料
          </p>
        </div>
      </div>
    </div>
  );
}