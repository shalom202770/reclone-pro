import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from '../i18n/context';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  itemCount: number;
  remote: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  itemCount,
  remote,
  onClose,
  onConfirm,
}) => {
  const { t, isRtl, dir } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-subtle animate-in fade-in duration-100 select-none" dir={dir}>
      <div className={`w-96 rounded-2xl bg-surface border border-surface-border shadow-popover overflow-hidden ${isRtl ? 'text-right' : 'text-left'}`}>
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between bg-surface-muted">
          <div className="flex items-center space-x-2 space-x-reverse text-mac-danger">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-foreground">{t('deleteConfirm.title', 'אישור מחיקה לצמיתות')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2">
          <p className="text-xs text-gray-300">
            {t('deleteConfirm.message', { count: itemCount, remote })}
          </p>
          <p className="text-[11px] text-gray-500">
            {t('deleteConfirm.warning', 'פעולה זו אינה ניתנת לביטול.')}
          </p>
        </div>

        <div className="px-5 py-3 border-t border-surface-border bg-surface-muted flex items-center justify-end space-x-2 space-x-reverse">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white"
          >
            {t('common.cancel', 'ביטול')}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-mac-danger hover:bg-red-600 text-white shadow-sm"
          >
            {t('deleteConfirm.deleteBtn', 'מחק לצמיתות')}
          </button>
        </div>
      </div>
    </div>
  );
};
