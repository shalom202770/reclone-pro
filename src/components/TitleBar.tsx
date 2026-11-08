import React from 'react';
import { 
  Columns2, 
  Square, 
  Settings, 
  Terminal, 
  RefreshCw, 
  Cloud, 
  Users,
  GitCompare,
  Sparkles,
  Loader2,
  RotateCcw
} from 'lucide-react';
import type { AppSettings } from '../types';
import type { UpdateInfo } from './UpdateNotification';
import { useTranslation } from '../i18n/context';

interface TitleBarProps {
  dualPane: boolean;
  onToggleDualPane: () => void;
  onOpenSettings: () => void;
  onOpenAccounts: () => void;
  onOpenCompare: () => void;
  onToggleLogs: () => void;
  onRefreshAll: () => void;
  logsOpen: boolean;
  settings: AppSettings;
  activeTransferCount: number;
  updateInfo?: UpdateInfo;
  onOpenUpdatePrompt?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  dualPane,
  onToggleDualPane,
  onOpenSettings,
  onOpenAccounts,
  onOpenCompare,
  onToggleLogs,
  onRefreshAll,
  logsOpen,
  settings,
  updateInfo,
  onOpenUpdatePrompt,
}) => {
  const { t, isRtl } = useTranslation();

  return (
    <header className="mac-drag-region h-11 bg-surface border-b border-surface-border flex items-center justify-between px-3 shrink-0 select-none z-30">
      {/* Branding & Status Indicator */}
      <div className={`flex items-center gap-4 min-w-0 ${isRtl ? 'pr-[110px]' : 'pl-[78px]'}`}>
        {/* Logo & App Name */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-mac-accent to-amber-700 flex items-center justify-center shadow-sm shrink-0">
            <Cloud className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-xs tracking-tight text-foreground select-none">
            Reclone <span className="text-mac-accent font-bold">Pro</span>
          </span>
        </div>

        {/* Engine status indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 ml-1 rounded-full bg-surface-muted border border-surface-border text-[11px] text-gray-300 shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              settings.rcloneDetected ? 'bg-mac-success' : 'bg-mac-warning animate-pulse'
            }`}
          />
          <span className="font-sans text-[10px]">
            {settings.rcloneDetected ? (
              `${t('titlebar.rcloneActive', 'Rclone פעיל')} (${settings.rcloneVersion.replace(/^rclone\s*/i, '').split(' ')[0]})`
            ) : (
              t('titlebar.rcloneMissing', 'Rclone חסר במערכת')
            )}
          </span>
        </div>

        {/* Update Status Pill */}
        {updateInfo?.status === 'available' && (
          <button
            onClick={onOpenUpdatePrompt}
            className="mac-no-drag flex items-center space-x-1.5 space-x-reverse px-2.5 py-0.5 rounded-full bg-mac-accent/20 border border-mac-accent/40 text-[10px] text-mac-accent hover:border-mac-accent transition-all animate-pulse cursor-pointer shadow-xs"
            title={t('updater.newVersionFound', 'גרסה חדשה זמינה! לחץ לפתיחה')}
          >
            <Sparkles className="w-3 h-3 text-mac-accent" />
            <span className="font-bold">v{updateInfo.version} {t('updater.availableBadge', 'זמינה')}</span>
          </button>
        )}

        {updateInfo?.status === 'downloading' && (
          <button
            onClick={onOpenUpdatePrompt}
            className="mac-no-drag flex items-center space-x-1.5 space-x-reverse px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-[10px] text-blue-400 hover:border-blue-400 transition-all cursor-pointer shadow-xs"
            title={t('updater.downloading', 'מוריד עדכון')}
          >
            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
            <span className="font-mono font-semibold">{updateInfo.percent || 0}%</span>
          </button>
        )}

        {updateInfo?.status === 'downloaded' && (
          <button
            onClick={onOpenUpdatePrompt}
            className="mac-no-drag flex items-center space-x-1.5 space-x-reverse px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] text-emerald-400 hover:border-emerald-400 transition-all cursor-pointer shadow-xs ring-1 ring-emerald-500/30"
            title={t('updater.readyToInstall', 'העדכון מוכן להתקנה! לחץ להפעלה מחדש')}
          >
            <RotateCcw className="w-3 h-3 text-emerald-400" />
            <span className="font-bold">{t('updater.restartAndInstall', 'הפעל והתקן')}</span>
          </button>
        )}
      </div>

      {/* Middle side: Pane Toggle */}
      <div className="mac-no-drag flex items-center gap-1 bg-surface-muted p-1 rounded-lg border border-surface-border shrink-0">
        <button
          onClick={onToggleDualPane}
          title={dualPane ? t('titlebar.singlePaneTitle', 'מעבר לחלון יחיד') : t('titlebar.dualPaneTitle', 'מעבר לתצוגה כפולה')}
          className={`flex min-h-8 min-w-[112px] items-center justify-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            dualPane
              ? 'bg-mac-accent text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-surface-hover'
          }`}
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span>{t('titlebar.dualPane', 'תצוגה כפולה')}</span>
        </button>

        <button
          onClick={onToggleDualPane}
          title={t('titlebar.singlePaneTitle', 'חלון יחיד')}
          className={`flex min-h-8 min-w-[112px] items-center justify-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            !dualPane
              ? 'bg-mac-accent text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-surface-hover'
          }`}
        >
          <Square className="w-3.5 h-3.5" />
          <span>{t('titlebar.singlePane', 'חלון יחיד')}</span>
        </button>
      </div>

      {/* Right / Left Side Tools */}
      <div className="mac-no-drag flex items-center space-x-1.5 space-x-reverse">
        {/* Accounts management */}
        <button
          onClick={onOpenAccounts}
          title={t('titlebar.accountsTitle', 'ניהול חשבונות ענן ואחסון')}
          className="flex items-center space-x-1.5 space-x-reverse px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-xs font-medium text-gray-200 hover:text-white hover:bg-surface-hover active:bg-surface-active transition-colors shadow-sm"
        >
          <Users className="w-3.5 h-3.5 text-mac-accent" />
          <span>{t('titlebar.accounts', 'ניהול חשבונות')}</span>
        </button>

        {/* Compare folders */}
        <button
          onClick={onOpenCompare}
          title={t('titlebar.compareTitle', 'השוואת תיקיות וסנכרון בין הפאנלים')}
          className="flex items-center space-x-1.5 space-x-reverse px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-xs font-medium text-gray-200 hover:text-white hover:bg-surface-hover active:bg-surface-active transition-colors shadow-sm"
        >
          <GitCompare className="w-3.5 h-3.5 text-mac-cyan" />
          <span>{t('titlebar.compare', 'השוואה')}</span>
        </button>

        {/* Refresh */}
        <button
          onClick={onRefreshAll}
          title={t('titlebar.refreshAllTitle', 'טען מחדש את שני הפאנלים')}
          className="p-1.5 rounded-lg text-foreground/75 hover:text-foreground hover:bg-surface-hover active:bg-surface-active transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Logs */}
        <button
          onClick={onToggleLogs}
          title={t('titlebar.logsTitle', 'יומן פקודות Rclone בזמן אמת')}
          className={`flex items-center space-x-1 space-x-reverse px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
            logsOpen
              ? 'bg-mac-accent/15 text-mac-accent border border-mac-accent/30'
              : 'text-foreground/75 hover:text-foreground hover:bg-surface-hover'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>{t('titlebar.logs', 'יומן')}</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title={t('titlebar.settingsTitle', 'הגדרות מתקדמות')}
          className="p-1.5 rounded-lg text-foreground/75 hover:text-foreground hover:bg-surface-hover active:bg-surface-active transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
