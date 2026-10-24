import React, { useMemo } from 'react';
import { 
  GitCompare, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  FileText,
  Copy,
  Layers
} from 'lucide-react';
import type { RcloneItem } from '../types';
import { formatBytes, formatDate } from '../lib/utils';

interface CompareModalProps {
  isOpen: boolean;
  leftRemote: string;
  leftPath: string;
  leftItems: RcloneItem[];
  rightRemote: string;
  rightPath: string;
  rightItems: RcloneItem[];
  onClose: () => void;
  onSyncToRight: (items: RcloneItem[]) => void;
  onSyncToLeft: (items: RcloneItem[]) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  leftRemote,
  leftPath,
  leftItems,
  rightRemote,
  rightPath,
  rightItems,
  onClose,
  onSyncToRight,
  onSyncToLeft,
}) => {
  if (!isOpen) return null;

  // Comparison logic
  const comparison = useMemo(() => {
    const leftMap = new Map<string, RcloneItem>();
    const rightMap = new Map<string, RcloneItem>();

    leftItems.forEach((i) => leftMap.set(i.Name, i));
    rightItems.forEach((i) => rightMap.set(i.Name, i));

    const leftOnly: RcloneItem[] = [];
    const rightOnly: RcloneItem[] = [];
    const different: { left: RcloneItem; right: RcloneItem }[] = [];
    const identical: RcloneItem[] = [];

    leftMap.forEach((leftItem, name) => {
      const rightItem = rightMap.get(name);
      if (!rightItem) {
        leftOnly.push(leftItem);
      } else {
        const sizeDiff = leftItem.Size !== rightItem.Size;
        const timeDiff = Math.abs(new Date(leftItem.ModTime).getTime() - new Date(rightItem.ModTime).getTime()) > 2000;
        if (sizeDiff || timeDiff) {
          different.push({ left: leftItem, right: rightItem });
        } else {
          identical.push(leftItem);
        }
      }
    });

    rightMap.forEach((rightItem, name) => {
      if (!leftMap.has(name)) {
        rightOnly.push(rightItem);
      }
    });

    return { leftOnly, rightOnly, different, identical };
  }, [leftItems, rightItems]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-subtle animate-in fade-in duration-150 select-none">
      <div className="w-[780px] max-h-[85vh] rounded-2xl bg-surface border border-surface-border shadow-popover overflow-hidden flex flex-col text-right">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between bg-surface-muted">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-8 h-8 rounded-lg bg-surface-active border border-surface-border flex items-center justify-center text-mac-accent">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">השוואת תיקיות וסנכרון (Folder Comparison)</h2>
              <p className="text-[11px] text-gray-400">
                השוואה בין [{leftRemote}:{leftPath || '/'}] לבין [{rightRemote}:{rightPath || '/'}]
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-surface-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comparison Summary Cards */}
        <div className="p-4 grid grid-cols-4 gap-2.5 bg-surface-muted/50 border-b border-surface-border">
          <div className="p-3 rounded-xl bg-surface border border-surface-border text-center">
            <span className="text-[10px] text-gray-400 block mb-0.5">קיימים רק בימין</span>
            <span className="text-sm font-bold text-mac-cyan font-mono">{comparison.leftOnly.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-surface-border text-center">
            <span className="text-[10px] text-gray-400 block mb-0.5">קיימים רק בשמאל</span>
            <span className="text-sm font-bold text-mac-warning font-mono">{comparison.rightOnly.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-surface-border text-center">
            <span className="text-[10px] text-gray-400 block mb-0.5">קבצים שונים</span>
            <span className="text-sm font-bold text-mac-danger font-mono">{comparison.different.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-surface-border text-center">
            <span className="text-[10px] text-gray-400 block mb-0.5">קבצים זהים</span>
            <span className="text-sm font-bold text-mac-success font-mono">{comparison.identical.length}</span>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Section: Left Only */}
          {comparison.leftOnly.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-mac-cyan">
                <span>קיימים רק ב-{leftRemote} ({comparison.leftOnly.length})</span>
                <button
                  onClick={() => {
                    onSyncToRight(comparison.leftOnly);
                    onClose();
                  }}
                  className="px-2 py-0.5 text-[11px] rounded bg-mac-cyan/15 text-mac-cyan hover:bg-mac-cyan/25 flex items-center space-x-1 space-x-reverse"
                >
                  <Copy className="w-3 h-3" />
                  <span>העתק הכל ל-{rightRemote}</span>
                </button>
              </div>
              <div className="bg-surface-muted rounded-lg border border-surface-border divide-y divide-surface-border/50">
                {comparison.leftOnly.map((item) => (
                  <div key={item.Path} className="px-3 py-1.5 text-xs flex items-center justify-between font-mono">
                    <span className="text-foreground">{item.Name}</span>
                    <span className="text-gray-400 text-[11px]">{formatBytes(item.Size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Right Only */}
          {comparison.rightOnly.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-mac-warning">
                <span>קיימים רק ב-{rightRemote} ({comparison.rightOnly.length})</span>
                <button
                  onClick={() => {
                    onSyncToLeft(comparison.rightOnly);
                    onClose();
                  }}
                  className="px-2 py-0.5 text-[11px] rounded bg-mac-warning/15 text-mac-warning hover:bg-mac-warning/25 flex items-center space-x-1 space-x-reverse"
                >
                  <Copy className="w-3 h-3" />
                  <span>העתק הכל ל-{leftRemote}</span>
                </button>
              </div>
              <div className="bg-surface-muted rounded-lg border border-surface-border divide-y divide-surface-border/50">
                {comparison.rightOnly.map((item) => (
                  <div key={item.Path} className="px-3 py-1.5 text-xs flex items-center justify-between font-mono">
                    <span className="text-foreground">{item.Name}</span>
                    <span className="text-gray-400 text-[11px]">{formatBytes(item.Size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Different */}
          {comparison.different.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-mac-danger block">
                קבצים עם הבדלי גודל או תאריך שינוי ({comparison.different.length})
              </span>
              <div className="bg-surface-muted rounded-lg border border-surface-border divide-y divide-surface-border/50">
                {comparison.different.map(({ left, right }) => (
                  <div key={left.Path} className="px-3 py-2 text-xs flex items-center justify-between font-mono">
                    <span className="text-foreground">{left.Name}</span>
                    <div className="text-[11px] text-gray-400 flex items-center space-x-3 space-x-reverse">
                      <span>ימין: {formatBytes(left.Size)}</span>
                      <span>שמאל: {formatBytes(right.Size)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {comparison.leftOnly.length === 0 && comparison.rightOnly.length === 0 && comparison.different.length === 0 && (
            <div className="h-44 flex flex-col items-center justify-center text-center text-gray-400">
              <CheckCircle className="w-10 h-10 text-mac-success mb-2" />
              <p className="text-sm font-semibold text-foreground">שתי התיקיות מסונכרנות באופן מלא!</p>
              <p className="text-xs text-gray-500 mt-1">כל הקבצים זהים בשמם, גודלם ומועדי השינוי שלהם.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border bg-surface-muted flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-surface-border text-gray-300 hover:text-white"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
