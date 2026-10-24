import React from 'react';
import { X, Info, Calendar, HardDrive, Shield, FileText, Folder } from 'lucide-react';
import { formatBytes, formatDate } from '../lib/utils';

interface FileInfoModalProps {
  isOpen: boolean;
  metadata: {
    name: string;
    path: string;
    isDir: boolean;
    size: number;
    fileCount?: number;
    dirCount?: number;
    created?: string | Date;
    modified?: string | Date;
    accessed?: string | Date;
    permissions?: string;
  } | null;
  onClose: () => void;
}

export const FileInfoModal: React.FC<FileInfoModalProps> = ({ isOpen, metadata, onClose }) => {
  if (!isOpen || !metadata) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs animate-in fade-in duration-100 select-none text-right">
      <div className="w-[420px] rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between bg-surface-muted">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="w-7 h-7 rounded-lg bg-mac-accent/20 border border-mac-accent/30 flex items-center justify-center text-mac-accent">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground truncate max-w-[280px]">
                {metadata.name}
              </h3>
              <p className="text-[11px] text-gray-400">
                {metadata.isDir ? 'פרטי תיקייה (Properties)' : 'פרטי קובץ (Get Info)'}
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
          {/* Main Stats Card */}
          <div className="p-3.5 rounded-xl bg-surface-muted border border-surface-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">סוג פריט:</span>
              <span className="font-semibold flex items-center gap-1.5 text-foreground">
                {metadata.isDir ? <Folder className="w-3.5 h-3.5 text-[var(--folder-icon-color,#f59e0b)]" /> : <FileText className="w-3.5 h-3.5 text-mac-accent" />}
                {metadata.isDir ? 'תיקייה' : 'קובץ'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">גודל כולל:</span>
              <span className="font-mono font-bold text-mac-accent">{formatBytes(metadata.size)}</span>
            </div>
            {metadata.isDir && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">תכולה:</span>
                <span className="font-mono text-gray-300">
                  {metadata.fileCount ?? 0} קבצים, {metadata.dirCount ?? 0} תיקיות
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-400">הרשאות (Permissions):</span>
              <span className="font-mono text-gray-400">{metadata.permissions || '755'}</span>
            </div>
          </div>

          {/* Path Details */}
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-medium">נתיב מלא:</span>
            <div className="p-2 rounded-lg bg-surface-muted border border-surface-border font-mono text-[11px] text-gray-300 break-all select-text" dir="ltr">
              {metadata.path}
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2 border-t border-surface-border/60 pt-3 text-[11px]">
            {metadata.modified && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  <span>שונה לאחרונה:</span>
                </span>
                <span className="font-mono text-gray-300">{formatDate(String(metadata.modified))}</span>
              </div>
            )}
            {metadata.created && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  <span>נוצר:</span>
                </span>
                <span className="font-mono text-gray-300">{formatDate(String(metadata.created))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border bg-surface-muted flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-mac-accent hover:bg-mac-accentHover text-white shadow-sm transition-colors"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
