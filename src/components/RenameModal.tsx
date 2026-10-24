import React, { useState } from 'react';
import { Edit2, X } from 'lucide-react';

interface RenameModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onRename: (newName: string) => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  currentName,
  onClose,
  onRename,
}) => {
  const [name, setName] = useState(currentName);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) {
      onClose();
      return;
    }
    onRename(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-subtle animate-in fade-in duration-100 select-none">
      <div className="w-96 rounded-2xl bg-surface border border-surface-border shadow-popover overflow-hidden text-right">
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between bg-surface-muted">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Edit2 className="w-4 h-4 text-mac-accent" />
              <h3 className="text-sm font-semibold text-foreground">שינוי שם פריט</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            <p className="text-xs text-gray-400">
              הזן שם חדש עבור הקובץ או התיקייה:
            </p>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-surface-muted border border-surface-border text-foreground focus:border-mac-accent"
            />
          </div>

          <div className="px-5 py-3 border-t border-surface-border bg-surface-muted flex items-center justify-end space-x-2 space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-mac-accent hover:bg-mac-accentHover text-white shadow-sm"
            >
              אישור ושינוי
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
