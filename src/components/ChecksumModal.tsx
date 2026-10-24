import React, { useState } from 'react';
import { X, Hash, Copy, Check, ShieldCheck } from 'lucide-react';

interface ChecksumModalProps {
  isOpen: boolean;
  fileName: string;
  filePath: string;
  hash: string;
  algorithm: 'md5' | 'sha256';
  onClose: () => void;
}

export const ChecksumModal: React.FC<ChecksumModalProps> = ({
  isOpen,
  fileName,
  filePath,
  hash,
  algorithm,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs animate-in fade-in duration-100 select-none text-right">
      <div className="w-[450px] rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between bg-surface-muted">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                בדיקת שלמות קובץ ({algorithm.toUpperCase()})
              </h3>
              <p className="text-[11px] text-gray-400 truncate max-w-[280px]">
                {fileName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-surface-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-gray-400 font-medium">ערך גיבוב ({algorithm.toUpperCase()} Hash):</label>
            <div className="relative flex items-center">
              <input
                type="text"
                readOnly
                value={hash}
                dir="ltr"
                className="w-full pl-20 pr-3 py-2 text-xs font-mono rounded-lg bg-surface-muted border border-surface-border text-foreground select-all focus:border-mac-accent"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="absolute left-1.5 flex items-center space-x-1 space-x-reverse px-2.5 py-1 text-[11px] font-medium rounded-md bg-surface border border-surface-border text-gray-300 hover:text-white hover:bg-surface-hover"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-mac-success" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'הועתק' : 'העתק'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-muted border border-surface-border space-y-1 text-[11px] text-gray-400">
            <p>💡 <strong>למה משמש Checksum?</strong></p>
            <p>ערך גיבוב ייחודי זה מאמת שהקובץ הועבר במלואו ולא ניזוק או שונה במהלך העברה או הורדה.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border bg-surface-muted flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-mac-accent hover:bg-mac-accentHover text-white shadow-sm transition-colors"
          >
            אישור
          </button>
        </div>
      </div>
    </div>
  );
};
