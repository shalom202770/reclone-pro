import React, { useState } from 'react';
import { X, Edit3, ArrowRight } from 'lucide-react';
import type { RcloneItem } from '../types';

interface BatchRenameModalProps {
  isOpen: boolean;
  items: RcloneItem[];
  onClose: () => void;
  onConfirm: (renameMap: Array<{ oldPath: string; newPath: string }>) => Promise<void>;
}

export const BatchRenameModal: React.FC<BatchRenameModalProps> = ({
  isOpen,
  items,
  onClose,
  onConfirm,
}) => {
  const [mode, setMode] = useState<'sequence' | 'replace'>('sequence');
  const [prefix, setPrefix] = useState('Item_');
  const [startNumber, setStartNumber] = useState(1);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  if (!isOpen || items.length === 0) return null;

  const preview = items.map((item, idx) => {
    const ext = item.IsDir ? '' : (item.Name.includes('.') ? `.${item.Name.split('.').pop()}` : '');
    const parent = item.Path.includes('/') ? item.Path.slice(0, item.Path.lastIndexOf('/')) : '';
    let newName = item.Name;

    if (mode === 'sequence') {
      const num = String(startNumber + idx).padStart(2, '0');
      newName = `${prefix}${num}${ext}`;
    } else {
      if (findText) {
        newName = item.Name.replaceAll(findText, replaceText);
      }
    }

    const newPath = parent ? `${parent}/${newName}` : newName;
    return {
      oldName: item.Name,
      oldPath: item.Path,
      newName,
      newPath,
    };
  });

  const handleApply = async () => {
    setIsRenaming(true);
    try {
      const validChanges = preview.filter((p) => p.oldPath !== p.newPath);
      await onConfirm(validChanges);
      onClose();
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs animate-in fade-in duration-100 select-none text-right">
      <div className="w-[520px] rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between bg-surface-muted">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="w-7 h-7 rounded-lg bg-mac-accent/20 border border-mac-accent/30 flex items-center justify-center text-mac-accent">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                שינוי שמות מרוכז ({items.length} פריטים)
              </h3>
              <p className="text-[11px] text-gray-400">
                שינוי שמות עקבי לפי רצף מספרי או החלפת מחרוזות
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
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('sequence')}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                mode === 'sequence'
                  ? 'bg-mac-accent text-white border-mac-accent shadow-sm'
                  : 'bg-surface-muted border-surface-border text-gray-400 hover:text-white'
              }`}
            >
              מספור רציף (1, 2, 3...)
            </button>
            <button
              type="button"
              onClick={() => setMode('replace')}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                mode === 'replace'
                  ? 'bg-mac-accent text-white border-mac-accent shadow-sm'
                  : 'bg-surface-muted border-surface-border text-gray-400 hover:text-white'
              }`}
            >
              החלפת טקסט (Find & Replace)
            </button>
          </div>

          {mode === 'sequence' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-gray-400 font-medium">קידומת קובץ (Prefix):</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-muted border border-surface-border text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 font-medium">מספר התחלתי:</label>
                <input
                  type="number"
                  min={1}
                  value={startNumber}
                  onChange={(e) => setStartNumber(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-muted border border-surface-border text-foreground"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-gray-400 font-medium">חפש טקסט:</label>
                <input
                  type="text"
                  placeholder="טקסט קיים..."
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-muted border border-surface-border text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 font-medium">החלף ב:</label>
                <input
                  type="text"
                  placeholder="טקסט חדש..."
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-muted border border-surface-border text-foreground"
                />
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="space-y-1">
            <span className="text-gray-400 font-medium">תצוגה מקדימה:</span>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-surface-border bg-surface-muted/60 p-2 space-y-1 font-mono text-[11px]">
              {preview.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-1 rounded bg-surface/50">
                  <span className="text-gray-400 truncate flex-1">{p.oldName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-mac-accent shrink-0" />
                  <span className="text-foreground font-semibold truncate flex-1">{p.newName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border bg-surface-muted flex items-center justify-end space-x-2 space-x-reverse">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isRenaming}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-mac-accent hover:bg-mac-accentHover text-white shadow-sm disabled:opacity-40"
          >
            {isRenaming ? 'משנה שמות...' : 'שמור שינויים'}
          </button>
        </div>
      </div>
    </div>
  );
};
