import React from 'react';
import { 
  Columns2, 
  Square, 
  Settings, 
  Terminal, 
  RefreshCw, 
  Cloud, 
  Users,
  GitCompare
} from 'lucide-react';
import type { AppSettings } from '../types';

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
  activeTransferCount,
}) => {
  // Native macOS traffic lights are rendered automatically by titleBarStyle: 'hiddenInset'

  return (
    <header className="mac-drag-region h-11 bg-surface border-b border-surface-border flex items-center justify-between px-3 shrink-0 select-none z-30">
      {/* Left side: Spacing for macOS native traffic lights + Branding */}
      <div className="flex items-center space-x-3.5 pr-[110px]">
        {/* Logo & App Name */}
        <div className="flex items-center space-x-1.5 space-x-reverse">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-mac-accent to-amber-700 flex items-center justify-center shadow-sm shrink-0">
            <Cloud className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-xs tracking-tight text-foreground select-none">
            Reclone <span className="text-mac-accent font-bold">Pro</span>
          </span>
        </div>

        {/* Engine status indicator */}
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-surface-muted border border-surface-border text-[11px] text-gray-300">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              settings.rcloneDetected ? 'bg-mac-success' : 'bg-mac-warning animate-pulse'
            }`}
          />
          <span className="font-sans text-[10px]">
            {settings.rcloneDetected ? (
              `Rclone פעיל (${settings.rcloneVersion.replace(/^rclone\s*/i, '').split(' ')[0]})`
            ) : (
              'Rclone חסר במערכת'
            )}
          </span>
        </div>
      </div>

      {/* Middle side: Pane Toggle & Tools */}
      <div className="mac-no-drag flex items-center space-x-1 bg-surface-muted p-0.5 rounded-lg border border-surface-border">
        <button
          onClick={onToggleDualPane}
          title={dualPane ? 'מעבר לחלון יחיד' : 'מעבר לתצוגה כפולה'}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            dualPane
              ? 'bg-mac-accent text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-surface-hover'
          }`}
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span>תצוגה כפולה</span>
        </button>

        <button
          onClick={onToggleDualPane}
          title="חלון יחיד"
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            !dualPane
              ? 'bg-mac-accent text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-surface-hover'
          }`}
        >
          <Square className="w-3.5 h-3.5" />
          <span>חלון יחיד</span>
        </button>
      </div>

      {/* Right side: Top Tools & Management */}
      <div className="mac-no-drag flex items-center space-x-1.5 space-x-reverse">
        {/* Accounts management */}
        <button
          onClick={onOpenAccounts}
          title="ניהול חשבונות ענן ואחסון"
          className="flex items-center space-x-1.5 space-x-reverse px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-xs font-medium text-gray-200 hover:text-white hover:bg-surface-hover active:bg-surface-active transition-colors shadow-sm"
        >
          <Users className="w-3.5 h-3.5 text-mac-accent" />
          <span>ניהול חשבונות</span>
        </button>

        {/* Compare folders */}
        <button
          onClick={onOpenCompare}
          title="השוואת תיקיות וסנכרון בין הפאנלים"
          className="flex items-center space-x-1.5 space-x-reverse px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-xs font-medium text-gray-200 hover:text-white hover:bg-surface-hover active:bg-surface-active transition-colors shadow-sm"
        >
          <GitCompare className="w-3.5 h-3.5 text-mac-cyan" />
          <span>השוואה</span>
        </button>

        {/* Refresh */}
        <button
          onClick={onRefreshAll}
          title="טען מחדש את שני הפאנלים"
          className="p-1.5 rounded-lg text-foreground/75 hover:text-foreground hover:bg-surface-hover active:bg-surface-active transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Logs */}
        <button
          onClick={onToggleLogs}
          title="יומן פקודות Rclone בזמן אמת"
          className={`flex items-center space-x-1 space-x-reverse px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
            logsOpen
              ? 'bg-mac-accent/15 text-mac-accent border border-mac-accent/30'
              : 'text-foreground/75 hover:text-foreground hover:bg-surface-hover'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>יומן</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="הגדרות מתקדמות"
          className="p-1.5 rounded-lg text-foreground/75 hover:text-foreground hover:bg-surface-hover active:bg-surface-active transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
