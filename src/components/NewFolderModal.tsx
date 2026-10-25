import React, { useState } from 'react';
import { FolderPlus, X } from 'lucide-react';
import { useTranslation } from '../i18n/context';

interface NewFolderModalProps {
  isOpen: boolean;
  currentPath: string;
  remote: string;
  onClose: () => void;
  onCreate: (folderName: string) => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  isOpen,
  currentPath,
  remote,
  onClose,
  onCreate,
}) => {
  const { t, isRtl, dir } = useTranslation();
  const [folderName, setFolderName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    onCreate(folderName.trim());
    setFolderName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-subtle animate-in fade-in duration-100 select-none" dir={dir}>
      <div className={`w-96 rounded-2xl bg-surface border border-surface-border shadow-popover overflow-hidden ${isRtl ? 'text-right' : 'text-left'}`}>
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between bg-surface-muted">
            <div className="flex items-center space-x-2 space-x-reverse">
              <FolderPlus className="w-4 h-4 text-mac-warning" />
              <h3 className="text-sm font-semibold text-foreground">{t('newFolder.title', 'יצירת תיקייה חדשה')}</h3>
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
              {t('newFolder.location', 'יצירת תיקייה במיקום:')}{' '}
              <span className="text-foreground font-mono font-medium" dir="ltr">
                {remote === 'Local Mac' ? 'Mac' : remote}:{(currentPath || '').replace(/^(?:file|mac|local\s*mac):\/{0,3}/i, '/').replace(/^\/+/, '/') || '/'}
              </span>
            </p>
            <input
              type="text"
              autoFocus
              placeholder={t('newFolder.placeholder', 'שם התיקייה')}
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-surface-muted border border-surface-border text-foreground focus:border-mac-accent"
            />
          </div>

          <div className="px-5 py-3 border-t border-surface-border bg-surface-muted flex items-center justify-end space-x-2 space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white"
            >
              {t('common.cancel', 'ביטול')}
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-mac-accent hover:bg-mac-accentHover text-white disabled:opacity-40 shadow-sm"
            >
              {t('newFolder.createBtn', 'צור תיקייה')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
