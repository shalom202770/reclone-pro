import React, { useState } from 'react';
import { X, Copy, Trash2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { formatBytes } from '../lib/utils';

interface DuplicateScannerModalProps {
  isOpen: boolean;
  currentPath: string;
  remote: string;
  onClose: () => void;
  onRefresh: () => void;
}

export const DuplicateScannerModal: React.FC<DuplicateScannerModalProps> = ({
  isOpen,
  currentPath,
  remote,
  onClose,
  onRefresh,
}) => {
  const [scanning, setScanning] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<Array<{ hash: string; size: number; files: string[] }>>([]);
  const [selectedToDelete, setSelectedToDelete] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleScan = async () => {
    if (!window.electronAPI?.findDuplicates) return;
    setScanning(true);
    setMessage(null);
    setDuplicateGroups([]);
    setSelectedToDelete(new Set());
    try {
      const res = await window.electronAPI.findDuplicates(currentPath, remote);
      if (res.success && res.duplicates) {
        setDuplicateGroups(res.duplicates);
        if (res.duplicates.length === 0) {
          setMessage('מעולה! לא נמצאו קבצים כפולים בתיקייה זו.');
        }
      } else {
        setMessage(res.error || 'שגיאה בסריקת קבצים כפולים');
      }
    } finally {
      setScanning(false);
    }
  };

  const toggleSelect = (file: string) => {
    setSelectedToDelete((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  const handleAutoSelectDuplicates = () => {
    // Keep 1 file from each group, select the rest for deletion
    const toDelete = new Set<string>();
    duplicateGroups.forEach((group) => {
      group.files.slice(1).forEach((f) => toDelete.add(f));
    });
    setSelectedToDelete(toDelete);
  };

  const handleDeleteSelected = async () => {
    if (selectedToDelete.size === 0 || !window.electronAPI?.deleteItem) return;
    setDeleting(true);
    try {
      for (const f of selectedToDelete) {
        await window.electronAPI.deleteItem(remote, f, false);
      }
      onRefresh();
      handleScan();
    } finally {
      setDeleting(false);
    }
  };

  const totalWastedBytes = duplicateGroups.reduce((acc, g) => acc + (g.size * (g.files.length - 1)), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs animate-in fade-in duration-100 select-none text-right">
      <div className="w-[600px] rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between bg-surface-muted">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="w-7 h-7 rounded-lg bg-mac-warning/20 border border-mac-warning/30 flex items-center justify-center text-mac-warning">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                איתור קבצים כפולים (Duplicate Finder)
              </h3>
              <p className="text-[11px] text-gray-400">
                סריקה קלת-משקל לפי גודל מזהה וחתימת גיבוב MD5
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
          {/* Scan bar */}
          <div className="p-3.5 rounded-xl bg-surface-muted border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-gray-300 font-medium">מיקום סריקה נוכחי:</div>
              <div className="font-mono text-[11px] text-gray-400" dir="ltr">{remote}:{currentPath || '/'}</div>
            </div>
            <button
              type="button"
              onClick={handleScan}
              disabled={scanning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-mac-accent hover:bg-mac-accentHover text-white font-semibold transition-all disabled:opacity-40 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'סורק עכשיו...' : 'התחל סריקה'}</span>
            </button>
          </div>

          {message && (
            <div className="p-3 rounded-xl bg-surface-muted border border-surface-border text-center text-gray-300">
              {message}
            </div>
          )}

          {duplicateGroups.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">
                  נמצאו <strong>{duplicateGroups.length}</strong> קבוצות כפולים (בזבוז שטח:{' '}
                  <span className="text-mac-warning font-mono font-bold">{formatBytes(totalWastedBytes)}</span>)
                </span>
                <button
                  type="button"
                  onClick={handleAutoSelectDuplicates}
                  className="text-mac-accent hover:underline text-[11px] font-medium"
                >
                  בחר עותקים מיותרים אוטומטית
                </button>
              </div>

              {/* Group list */}
              <div className="max-h-60 overflow-y-auto space-y-2 rounded-xl border border-surface-border bg-surface-muted/50 p-2">
                {duplicateGroups.map((group, gIdx) => (
                  <div key={gIdx} className="p-2.5 rounded-lg bg-surface border border-surface-border space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>קבוצה #{gIdx + 1} ({group.files.length} עותקים)</span>
                      <span className="font-mono font-medium text-mac-accent">{formatBytes(group.size)} כל אחד</span>
                    </div>
                    <div className="space-y-1">
                      {group.files.map((file, fIdx) => (
                        <label
                          key={fIdx}
                          className="flex items-center space-x-2 space-x-reverse text-[11px] font-mono text-gray-300 hover:text-white cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={selectedToDelete.has(file)}
                            onChange={() => toggleSelect(file)}
                            className="rounded border-surface-border accent-mac-accent"
                          />
                          <span className="truncate" dir="ltr">{file}</span>
                          {fIdx === 0 && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-sans">
                              מקורי
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border bg-surface-muted flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            {selectedToDelete.size > 0 && `${selectedToDelete.size} פריטים נבחרו למחיקה`}
          </span>
          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white"
            >
              סגור
            </button>
            {selectedToDelete.size > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-sm disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'מוחק...' : `מחק ${selectedToDelete.size} עותקים`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
