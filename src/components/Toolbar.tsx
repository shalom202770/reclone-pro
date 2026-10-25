import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  ArrowUp, 
  Home, 
  Search, 
  LayoutList, 
  LayoutGrid, 
  FolderPlus, 
  RefreshCw, 
  Trash2, 
  ArrowLeftRight, 
  HardDrive, 
  Cloud, 
  ChevronDown,
  X,
  Eye,
  EyeOff,
  Edit2,
  ZoomIn,
  Copy
} from 'lucide-react';
import type { RemoteInfo, ViewMode } from '../types';
import { useTranslation } from '../i18n/context';

interface ToolbarProps {
  paneId: 'left' | 'right';
  remote: string;
  remotes: RemoteInfo[];
  path: string;
  viewMode: ViewMode;
  searchQuery: string;
  showHiddenFiles: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  selectedCount: number;
  targetPaneRemote?: string;
  onSelectRemote: (remote: string) => void;
  onNavigate: (newPath: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onGoHome: () => void;
  onToggleViewMode: (mode: ViewMode) => void;
  onToggleHiddenFiles: () => void;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onOpenNewFolderModal: () => void;
  onOpenRenameModal: () => void;
  onTransferToTarget: () => void;
  onDeleteSelected: () => void;
  onOpenDuplicateScanner?: () => void;
  gridIconSize: number;
  onGridIconSizeChange: (size: number) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  paneId,
  remote,
  remotes,
  path,
  viewMode,
  searchQuery,
  showHiddenFiles,
  canGoBack,
  canGoForward,
  selectedCount,
  targetPaneRemote,
  onSelectRemote,
  onNavigate,
  onGoBack,
  onGoForward,
  onGoUp,
  onGoHome,
  onToggleViewMode,
  onToggleHiddenFiles,
  onSearchChange,
  onRefresh,
  onOpenNewFolderModal,
  onOpenRenameModal,
  onTransferToTarget,
  onDeleteSelected,
  onOpenDuplicateScanner,
  gridIconSize,
  onGridIconSizeChange,
}) => {
  const { t, isRtl } = useTranslation();
  const [remoteDropdownOpen, setRemoteDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRemoteDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format and sanitize path to clean POSIX without Mac:// or file:// URI schemes
  const cleanPath = (path || '')
    .replace(/^(?:file|mac|local\s*mac):\/{0,3}/i, '/')
    .replace(/^\/+/, '/');
  const pathSegments = cleanPath.split('/').filter(Boolean);

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      onNavigate('');
      return;
    }
    const newPath = pathSegments.slice(0, index + 1).join('/');
    onNavigate(newPath);
  };

  const currentRemoteInfo = remotes.find((r) => r.name === remote);

  return (
    <div className={`bg-surface-muted/95 border-b border-surface-border px-3 py-2 flex flex-col gap-2 select-none ${isRtl ? 'text-right' : 'text-left'}`}>
      {/* Top line: Remote selector & Actions */}
      <div className="flex items-center justify-between gap-2">
        {/* Remote selector dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setRemoteDropdownOpen(!remoteDropdownOpen)}
            className="flex items-center space-x-2 space-x-reverse px-2.5 py-1.5 rounded-lg bg-surface border border-surface-border hover:border-gray-500 text-xs font-semibold text-foreground transition-all shadow-sm"
          >
            {currentRemoteInfo?.isLocal ? (
              <HardDrive className="w-4 h-4 text-mac-cyan" />
            ) : (
              <Cloud className="w-4 h-4 text-mac-accent" />
            )}
            <span className="truncate max-w-[140px]">
              {remote === 'Local Mac' ? (isRtl ? 'דיסק מקומי (Mac)' : 'Local Disk (Mac)') : remote || (isRtl ? 'בחר שירות ענן' : 'Select Remote')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {/* Dropdown Menu */}
          {remoteDropdownOpen && (
            <div className={`absolute ${isRtl ? 'right-0' : 'left-0'} mt-1 w-64 rounded-xl glass-dropdown border border-surface-border z-50 py-1 overflow-hidden animate-in fade-in duration-100 ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 border-b border-surface-border">
                {t('accounts.connectedAccounts', 'חשבונות מחוברים (Remotes)')}
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {remotes.map((r) => (
                  <button
                    key={r.name}
                    onClick={() => {
                      onSelectRemote(r.name);
                      setRemoteDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                      r.name === remote
                        ? 'bg-mac-accent/15 text-mac-accent font-medium'
                        : 'text-gray-300 hover:bg-surface-hover hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 space-x-reverse truncate">
                      {r.isLocal ? (
                        <HardDrive className="w-4 h-4 text-mac-cyan shrink-0" />
                      ) : (
                        <Cloud className="w-4 h-4 text-mac-accent shrink-0" />
                      )}
                      <span className="truncate">{r.name === 'Local Mac' ? (isRtl ? 'דיסק מקומי (Mac)' : 'Local Disk (Mac)') : r.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase font-mono">
                      {r.isLocal ? (isRtl ? 'מקומי' : 'local') : r.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Transfer & File Action Buttons */}
        <div className="flex items-center space-x-1.5 space-x-reverse">
          {/* Transfer button */}
          {targetPaneRemote && (
            <button
              onClick={onTransferToTarget}
              disabled={selectedCount === 0}
              title={t('toolbar.copyToTargetTitle', { count: selectedCount })}
              className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCount > 0
                  ? 'bg-mac-accent text-white hover:bg-mac-accentHover shadow-sm cursor-pointer'
                  : 'bg-surface-border/50 text-gray-500 cursor-not-allowed'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{t('toolbar.copyToTarget', 'העתק')} {selectedCount > 0 ? `(${selectedCount})` : ''}</span>
            </button>
          )}

          {/* New Folder */}
          <button
            onClick={onOpenNewFolderModal}
            title={t('toolbar.newFolder', 'תיקייה חדשה')}
            className="p-1.5 rounded-lg text-[var(--folder-icon-color,#f59e0b)] hover:bg-surface-hover active:bg-surface-active transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
          </button>

          {/* Rename */}
          <button
            onClick={onOpenRenameModal}
            disabled={selectedCount !== 1}
            title={t('toolbar.renameTitle', 'שינוי שם לפריט הנבחר')}
            className={`p-1.5 rounded-lg transition-colors ${
              selectedCount === 1
                ? 'text-foreground/80 hover:text-foreground hover:bg-surface-hover active:bg-surface-active cursor-pointer'
                : 'text-foreground/25 cursor-not-allowed'
            }`}
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
            title={selectedCount > 0 ? t('toolbar.deleteTitle', { count: selectedCount }) : t('toolbar.deleteSelectPrompt', 'בחר פריטים למחיקה')}
            className={`p-1.5 rounded-lg transition-colors ${
              selectedCount > 0
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/15 active:bg-red-500/25 cursor-pointer'
                : 'text-foreground/25 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Hidden files toggle */}
          <button
            onClick={onToggleHiddenFiles}
            title={showHiddenFiles ? t('toolbar.hideHidden', 'הסתר קבצים נסתרים') : t('toolbar.showHidden', 'הצג קבצים נסתרים')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              showHiddenFiles
                ? 'bg-mac-accent/15 text-mac-accent'
                : 'text-foreground/70 hover:text-foreground hover:bg-surface-hover'
            }`}
          >
            {showHiddenFiles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Duplicate Scanner */}
          {onOpenDuplicateScanner && (
            <button
              onClick={onOpenDuplicateScanner}
              title={t('toolbar.duplicateScanner', 'סורק קבצים כפולים')}
              className="p-1.5 rounded-lg text-mac-warning hover:bg-mac-warning/15 transition-colors shrink-0 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={onRefresh}
            title={t('toolbar.refreshFolder', 'רענן תיקייה')}
            className="p-1.5 rounded-lg text-foreground/75 hover:text-foreground hover:bg-surface-hover active:bg-surface-active transition-colors shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom line: Navigation Breadcrumbs, Search, View switch */}
      <div className="flex items-center justify-between gap-2">
        {/* Navigation History & Breadcrumbs */}
        <div className="flex items-center space-x-1 space-x-reverse min-w-0 flex-1">
          {/* Back button */}
          <button
            onClick={onGoBack}
            disabled={!canGoBack}
            title={t('toolbar.back', 'הקודם')}
            className="p-1 rounded-md text-foreground/60 hover:text-foreground hover:bg-surface-hover disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
          >
            {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Forward button */}
          <button
            onClick={onGoForward}
            disabled={!canGoForward}
            title={t('toolbar.forward', 'הבא')}
            className="p-1 rounded-md text-foreground/60 hover:text-foreground hover:bg-surface-hover disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
          >
            {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Up button */}
          <button
            onClick={onGoUp}
            disabled={!path}
            title={t('toolbar.parentFolder', 'תיקיית אב')}
            className="p-1 rounded-md text-foreground/60 hover:text-foreground hover:bg-surface-hover disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          {/* Home button */}
          <button
            onClick={onGoHome}
            title={t('toolbar.rootHome', 'תיקיית שורש / בית')}
            className="p-1 rounded-md text-foreground/60 hover:text-foreground hover:bg-surface-hover cursor-pointer"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Breadcrumb path bar */}
          <div className="flex items-center space-x-1 space-x-reverse px-2 py-1 rounded-md bg-surface/80 border border-surface-border text-xs min-w-0 overflow-x-auto whitespace-nowrap scrollbar-none flex-1 font-mono">
            <button
              onClick={() => handleBreadcrumbClick(-1)}
              className="text-gray-400 hover:text-mac-accent font-medium transition-colors"
            >
              {t('toolbar.root', 'שורש')}
            </button>
            {pathSegments.map((segment, idx) => (
              <React.Fragment key={idx}>
                <span className="text-gray-600 text-[10px]">/</span>
                <button
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={`hover:text-mac-accent transition-colors ${
                    idx === pathSegments.length - 1
                      ? 'text-foreground font-semibold'
                      : 'text-gray-400'
                  }`}
                >
                  {segment}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Search filter input */}
        <div className="relative w-28 sm:w-36 md:w-44 shrink-0">
          <Search className={`w-3.5 h-3.5 text-gray-500 absolute ${isRtl ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2`} />
          <input
            type="text"
            placeholder={t('toolbar.searchPlaceholder', 'סינון קבצים...')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full ${isRtl ? 'pr-8 pl-7 text-right' : 'pl-8 pr-7 text-left'} py-1 text-xs rounded-md bg-surface border border-surface-border text-foreground placeholder-gray-500 focus:border-mac-accent transition-all`}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className={`absolute ${isRtl ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-surface p-0.5 rounded-md border border-surface-border shrink-0">
          <button
            onClick={() => onToggleViewMode('list')}
            title={t('toolbar.listView', 'תצוגת טבלה מפורטת')}
            className={`p-1 rounded cursor-pointer ${
              viewMode === 'list'
                ? 'bg-mac-accent text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggleViewMode('grid')}
            title={t('toolbar.gridView', 'תצוגת רשת כרטיסים')}
            className={`p-1 rounded cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-mac-accent text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Icon Zoom Slider (visible in grid mode) */}
        {viewMode === 'grid' && (
          <div className="hidden sm:flex items-center space-x-1.5 space-x-reverse shrink-0">
            <ZoomIn className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="range"
              min={80}
              max={260}
              step={10}
              value={gridIconSize}
              onChange={(e) => onGridIconSizeChange(Number(e.target.value))}
              className="w-16 md:w-20 h-1 accent-amber-600 rounded-lg cursor-pointer appearance-none bg-surface-border"
              title={t('toolbar.iconSize', { size: gridIconSize })}
            />
          </div>
        )}
      </div>
    </div>
  );
};
