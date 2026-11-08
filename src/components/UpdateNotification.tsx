import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowDownCircle, 
  RotateCcw, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useTranslation } from '../i18n/context';
import { formatBytes } from '../lib/utils';

export type UpdateState = 'idle' | 'checking' | 'available' | 'up-to-date' | 'downloading' | 'downloaded' | 'error';

export interface UpdateInfo {
  status: UpdateState;
  version?: string;
  releaseNotes?: string;
  releaseName?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  error?: string;
}

const cleanReleaseNotes = (notes: string) => notes
  .replace(/<\/?(?:p|div|br|li|h[1-6])\b[^>]*>/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/^\s{0,3}#{1,6}\s+/gm, '')
  .replace(/\*\*|__|~~|`|\*|_/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

interface UpdateNotificationProps {
  updateInfo: UpdateInfo;
  onDownload: () => void;
  onInstall: () => void;
  onDismiss: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  updateInfo,
  onDownload,
  onInstall,
  onDismiss,
}) => {
  const { t, isRtl } = useTranslation();
  const [showNotes, setShowNotes] = useState(false);

  // Only display notification for actionable states
  if (
    updateInfo.status === 'idle' ||
    updateInfo.status === 'checking' ||
    updateInfo.status === 'up-to-date'
  ) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-5 ${isRtl ? 'left-5' : 'right-5'} z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300 select-none shadow-2xl`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="relative rounded-2xl bg-[#1c1917]/95 backdrop-blur-xl border border-white/15 p-4 text-foreground shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Glow ambient background effect */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-mac-accent/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top bar with close button */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            {updateInfo.status === 'available' && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mac-accent to-amber-600 flex items-center justify-center text-white shadow-md shrink-0 ring-2 ring-mac-accent/30">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
            )}
            {updateInfo.status === 'downloading' && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            {updateInfo.status === 'downloaded' && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shrink-0 ring-2 ring-emerald-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            {updateInfo.status === 'error' && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center text-white shadow-md shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}

            <div>
              <div className="flex items-center space-x-1.5 space-x-reverse">
                <h4 className="font-bold text-xs text-white">
                  {updateInfo.status === 'available' && (t('updater.newVersionFound', 'גרסה חדשה זמינה!') || 'גרסה חדשה זמינה!')}
                  {updateInfo.status === 'downloading' && (t('updater.downloading', 'מוריד עדכון ברקע...') || 'מוריד עדכון ברקע...')}
                  {updateInfo.status === 'downloaded' && (t('updater.readyToInstall', 'העדכון מוכן להתקנה! 🚀') || 'העדכון מוכן להתקנה! 🚀')}
                  {updateInfo.status === 'error' && (t('updater.errorTitle', 'שגיאת עדכון') || 'שגיאת עדכון')}
                </h4>
                {updateInfo.version && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-mac-accent border border-white/10">
                    v{updateInfo.version}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-300 mt-0.5">
                {updateInfo.status === 'available' && (t('updater.promptDownload', 'גרסה חדשה זמינה. האם להוריד כעת?') || 'גרסה חדשה זמינה. האם להוריד כעת?')}
                {updateInfo.status === 'downloading' && (t('updater.downloadingDesc', 'התוכנה מורידה את הקבצים, ניתן להמשיך לעבוד כרגיל.') || 'התוכנה מורידה את הקבצים, ניתן להמשיך לעבוד כרגיל.')}
                {updateInfo.status === 'downloaded' && (t('updater.downloadedDesc', 'העדכון הורד בהצלחה. הפעל מחדש כדי להחיל אותו מיידית.') || 'העדכון הורד בהצלחה. הפעל מחדש כדי להחיל אותו מיידית.')}
                {updateInfo.status === 'error' && (updateInfo.error || (t('updater.unknownError', 'שגיאה בהורדת העדכון') || 'שגיאה בהורדת העדכון'))}
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title={t('common.close', 'סגור')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Downloading Progress Bar */}
        {updateInfo.status === 'downloading' && (
          <div className="mt-3 space-y-1.5 relative z-10">
            <div className="flex items-center justify-between text-[11px] text-gray-300 font-mono">
              <span className="text-mac-accent font-semibold">{updateInfo.percent || 0}%</span>
              <span>
                {updateInfo.bytesPerSecond
                  ? `${(updateInfo.bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
                  : ''}
                {updateInfo.transferred != null && updateInfo.total != null && updateInfo.total > 0
                  ? ` • ${formatBytes(updateInfo.transferred)} / ${formatBytes(updateInfo.total)}`
                  : ''}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-mac-accent to-emerald-400 transition-all duration-300 ease-out shadow-sm"
                style={{ width: `${Math.min(100, Math.max(2, updateInfo.percent || 0))}%` }}
              />
            </div>
          </div>
        )}

        {/* Release notes expander if available */}
        {updateInfo.releaseNotes && (
          <div className="mt-2.5 relative z-10">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center space-x-1 space-x-reverse text-[11px] text-gray-400 hover:text-mac-accent transition-colors"
            >
              <span>{showNotes ? t('updater.hideNotes', 'הסתר פרטי גרסה') : t('updater.viewNotes', 'מה חדש בגרסה זו?')}</span>
              {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showNotes && (
              <div className="mt-1.5 p-2 rounded-lg bg-black/40 border border-white/10 text-[10px] text-gray-300 max-h-24 overflow-y-auto whitespace-pre-wrap font-sans">
                {cleanReleaseNotes(updateInfo.releaseNotes || '')}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3.5 flex items-center justify-end space-x-2 space-x-reverse relative z-10">
          {updateInfo.status === 'available' && (
            <span className="text-[11px] text-blue-300">{t('updater.downloading', 'מוריד עדכון ברקע...')}</span>
          )}

          {updateInfo.status === 'downloaded' && (
            <button
                type="button"
                onClick={onInstall}
                className="inline-flex items-center space-x-1.5 space-x-reverse px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md hover:shadow-emerald-500/20 transition-all cursor-pointer ring-1 ring-emerald-400/30"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('updater.restartAndInstall', 'הפעל מחדש והתקן')}</span>
            </button>
          )}

          {updateInfo.status === 'error' && (
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              {t('common.dismiss', 'הבנתי')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
