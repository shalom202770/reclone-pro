import React, { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { FilePane } from './components/FilePane';
import { TransferManager } from './components/TransferManager';
import { SettingsModal } from './components/SettingsModal';
import { AccountsModal } from './components/AccountsModal';
import { CompareModal } from './components/CompareModal';
import { RenameModal } from './components/RenameModal';
import { LogsDrawer } from './components/LogsDrawer';
import { NewFolderModal } from './components/NewFolderModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { FileInfoModal } from './components/FileInfoModal';
import { ChecksumModal } from './components/ChecksumModal';
import { BatchRenameModal } from './components/BatchRenameModal';
import { DuplicateScannerModal } from './components/DuplicateScannerModal';
import { WelcomeModal } from './components/WelcomeModal';
import { useTranslation } from './i18n/context';
import type { 
  PaneState, 
  RemoteInfo, 
  TransferTask, 
  AppSettings, 
  LogEntry, 
  SortField, 
  ViewMode, 
  RcloneItem 
} from './types';

const INITIAL_SETTINGS: AppSettings = {
  rclonePath: 'rclone',
  rcloneDetected: false,
  rcloneVersion: 'בודק...',
  rcloneConfigPath: '',
  transfers: 8,
  checkers: 16,
  retries: 3,
  checksum: true,
  bwlimitDownload: 'Unlimited',
  bwlimitUpload: 'Unlimited',
  fastList: true,
  showHiddenFiles: false,
  language: 'he',
  theme: 'warm',
  defaultLocalPath: '',
};

const INITIAL_PANE = (id: 'left' | 'right', defaultRemote: string): PaneState => ({
  id,
  remote: defaultRemote,
  path: '',
  items: [],
  selectedItems: new Set(),
  searchQuery: '',
  sortField: 'Name',
  sortOrder: 'asc',
  viewMode: 'list',
  loading: false,
  error: null,
  history: [''],
  historyIndex: 0,
  gridIconSize: 130,
});

export const App: React.FC = () => {
  const { t, isRtl, dir } = useTranslation();
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('hasSeenOnboarding'));
  const [dualPane, setDualPane] = useState(true);
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);
  const [leftPane, setLeftPane] = useState<PaneState>(INITIAL_PANE('left', 'Local Mac'));
  const [rightPane, setRightPane] = useState<PaneState>(INITIAL_PANE('right', 'Local Mac'));
  const [tasks, setTasks] = useState<TransferTask[]>([]);
  const [transferManagerExpanded, setTransferManagerExpanded] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [accountsModalOpen, setAccountsModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  const [newFolderModal, setNewFolderModal] = useState<{
    isOpen: boolean;
    paneId: 'left' | 'right';
  }>({ isOpen: false, paneId: 'left' });

  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    paneId: 'left' | 'right';
    currentName: string;
    itemPath: string;
  }>({ isOpen: false, paneId: 'left', currentName: '', itemPath: '' });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    paneId: 'left' | 'right';
  }>({ isOpen: false, paneId: 'left' });

  const [fileInfoModal, setFileInfoModal] = useState<{
    isOpen: boolean;
    metadata: any;
  }>({ isOpen: false, metadata: null });

  const [checksumModal, setChecksumModal] = useState<{
    isOpen: boolean;
    fileName: string;
    filePath: string;
    hash: string;
    algorithm: 'md5' | 'sha256';
  }>({ isOpen: false, fileName: '', filePath: '', hash: '', algorithm: 'md5' });

  const [batchRenameModal, setBatchRenameModal] = useState<{
    isOpen: boolean;
    items: RcloneItem[];
    paneId: 'left' | 'right';
  }>({ isOpen: false, items: [], paneId: 'left' });

  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    paneId: 'left' | 'right';
  }>({ isOpen: false, paneId: 'left' });

  const addLog = useCallback((level: 'info' | 'warn' | 'error' | 'command', message: string) => {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };
    setLogs((prev) => [...prev.slice(-400), entry]);
  }, []);

  const refreshRemotesList = useCallback(async () => {
    if (window.electronAPI) {
      const remoteList = await window.electronAPI.listRemotes();
      setRemotes(remoteList);
      if (remoteList.length > 0) {
        setLeftPane((p) => {
          if (!remoteList.some((r) => r.name === p.remote)) {
            return { ...p, remote: remoteList[0].name };
          }
          return p;
        });
        setRightPane((p) => {
          if (!remoteList.some((r) => r.name === p.remote)) {
            const cloud = remoteList.find((r) => !r.isLocal) || remoteList[0];
            return { ...p, remote: cloud.name };
          }
          return p;
        });
      }
    }
  }, []);

  // Initialize electron IPC subscriptions and load remotes
  useEffect(() => {
    addLog('info', 'Reclone Pro אותחל בהצלחה בממשק עברית מלא (RTL).');

    if (window.electronAPI) {
      // Load settings
      window.electronAPI.getSettings().then((res) => {
        setSettings((prev) => ({
          ...prev,
          rclonePath: res.rclonePath,
          rcloneDetected: res.rcloneDetected,
          rcloneVersion: res.rcloneVersion,
          rcloneConfigPath: res.rcloneConfigPath,
        }));
      });

      refreshRemotesList();

      const unsubTransfer = window.electronAPI.onTransferProgress((data) => {
        setTasks((prevTasks) =>
          prevTasks.map((t) => {
            if (t.id === data.id) {
              return { ...t, ...data };
            }
            return t;
          })
        );
      });

      const unsubLog = window.electronAPI.onLog((entry) => {
        setLogs((prev) => [...prev.slice(-400), entry]);
      });

      return () => {
        unsubTransfer();
        unsubLog();
      };
    } else {
      // Web fallback
      setRemotes([
        { name: 'Local Mac', type: 'local', isLocal: true },
        { name: 'gdrive', type: 'drive', isLocal: false },
      ]);
    }
  }, [addLog, refreshRemotesList]);

  // Periodic Auto-Backup runner
  useEffect(() => {
    if (!settings.autoBackupEnabled || !settings.autoBackupSource) return;

    const intervalMs = (settings.autoBackupIntervalHours || 24) * 3600 * 1000;
    const targetRemote = remotes.find((r) => !r.isLocal)?.name || 'gdrive';

    const runBackup = async () => {
      addLog('command', `מתחיל גיבוי אוטומטי מתוזמן: ${settings.autoBackupSource} -> ${targetRemote}:Reclone_Backups`);
      if (window.electronAPI) {
        const taskId = `backup-${Date.now()}`;
        const task: TransferTask = {
          id: taskId,
          name: `Auto-Backup: ${settings.autoBackupSource.split('/').pop() || 'קבצים'}`,
          srcRemote: 'Local Mac',
          srcPath: settings.autoBackupSource,
          dstRemote: targetRemote,
          dstPath: 'Reclone_Backups',
          size: 0,
          transferred: 0,
          percentage: 0,
          speed: '0 B/s',
          speedBytes: 0,
          eta: '--',
          status: 'queued',
          operation: 'sync',
          startTime: Date.now(),
        };
        setTasks((prev) => [task, ...prev]);
        window.electronAPI.startTransfer(task, {
          transfers: settings.transfers,
          checkers: settings.checkers,
          retries: settings.retries,
          bwlimitDownload: settings.bwlimitDownload,
          bwlimitUpload: settings.bwlimitUpload,
          checksum: settings.checksum,
          fastList: settings.fastList,
        });
      }
    };

    const timer = setInterval(runBackup, intervalMs);
    return () => clearInterval(timer);
  }, [settings.autoBackupEnabled, settings.autoBackupSource, settings.autoBackupIntervalHours, remotes, addLog, settings.transfers, settings.checkers, settings.retries, settings.bwlimitDownload, settings.bwlimitUpload, settings.checksum, settings.fastList]);

  // Load items for a given pane
  const loadPaneItems = useCallback(
    async (paneId: 'left' | 'right', targetRemote?: string, targetPath?: string) => {
      const isLeft = paneId === 'left';
      const pane = isLeft ? leftPane : rightPane;
      const remote = targetRemote !== undefined ? targetRemote : pane.remote;
      const path = targetPath !== undefined ? targetPath : pane.path;

      if (!remote) return;

      const setPane = isLeft ? setLeftPane : setRightPane;
      setPane((prev) => ({ ...prev, loading: true, error: null, remote, path }));

      try {
        let items: RcloneItem[] = [];
        if (window.electronAPI) {
          items = await window.electronAPI.listItems(remote, path, showHiddenFiles);
        }

        setPane((prev) => ({
          ...prev,
          items,
          loading: false,
          selectedItems: new Set(),
        }));
      } catch (err: any) {
        setPane((prev) => ({
          ...prev,
          items: [],
          loading: false,
          error: err?.message || 'שגיאה בקריאת התיקייה',
        }));
        addLog('error', `שגיאה בטעינת קבצים: ${err?.message || err}`);
      }
    },
    [leftPane, rightPane, showHiddenFiles, addLog]
  );

  useEffect(() => {
    if (remotes.length > 0) {
      loadPaneItems('left', leftPane.remote, leftPane.path);
      loadPaneItems('right', rightPane.remote, rightPane.path);
    }
  }, [remotes.length, showHiddenFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Left navigation
  const handleNavigateLeft = (newPath: string) => {
    const history = leftPane.history.slice(0, leftPane.historyIndex + 1);
    history.push(newPath);
    setLeftPane((prev) => ({
      ...prev,
      path: newPath,
      history,
      historyIndex: history.length - 1,
    }));
    loadPaneItems('left', leftPane.remote, newPath);
  };

  const handleGoBackLeft = () => {
    if (leftPane.historyIndex > 0) {
      const newIndex = leftPane.historyIndex - 1;
      const targetPath = leftPane.history[newIndex];
      setLeftPane((prev) => ({ ...prev, path: targetPath, historyIndex: newIndex }));
      loadPaneItems('left', leftPane.remote, targetPath);
    }
  };

  const handleGoForwardLeft = () => {
    if (leftPane.historyIndex < leftPane.history.length - 1) {
      const newIndex = leftPane.historyIndex + 1;
      const targetPath = leftPane.history[newIndex];
      setLeftPane((prev) => ({ ...prev, path: targetPath, historyIndex: newIndex }));
      loadPaneItems('left', leftPane.remote, targetPath);
    }
  };

  const handleGoUpLeft = () => {
    const segments = leftPane.path.split('/').filter(Boolean);
    segments.pop();
    handleNavigateLeft(segments.join('/'));
  };

  // Right navigation
  const handleNavigateRight = (newPath: string) => {
    const history = rightPane.history.slice(0, rightPane.historyIndex + 1);
    history.push(newPath);
    setRightPane((prev) => ({
      ...prev,
      path: newPath,
      history,
      historyIndex: history.length - 1,
    }));
    loadPaneItems('right', rightPane.remote, newPath);
  };

  const handleGoBackRight = () => {
    if (rightPane.historyIndex > 0) {
      const newIndex = rightPane.historyIndex - 1;
      const targetPath = rightPane.history[newIndex];
      setRightPane((prev) => ({ ...prev, path: targetPath, historyIndex: newIndex }));
      loadPaneItems('right', rightPane.remote, targetPath);
    }
  };

  const handleGoForwardRight = () => {
    if (rightPane.historyIndex < rightPane.history.length - 1) {
      const newIndex = rightPane.historyIndex + 1;
      const targetPath = rightPane.history[newIndex];
      setRightPane((prev) => ({ ...prev, path: targetPath, historyIndex: newIndex }));
      loadPaneItems('right', rightPane.remote, targetPath);
    }
  };

  const handleGoUpRight = () => {
    const segments = rightPane.path.split('/').filter(Boolean);
    segments.pop();
    handleNavigateRight(segments.join('/'));
  };

  // Item selection
  const handleSelectItem = (
    paneId: 'left' | 'right',
    itemPath: string,
    multi: boolean,
    rangeSelect?: boolean
  ) => {
    const setPane = paneId === 'left' ? setLeftPane : setRightPane;
    setPane((prev) => {
      const next = new Set(prev.selectedItems);
      if (multi) {
        if (next.has(itemPath)) next.delete(itemPath);
        else next.add(itemPath);
      } else {
        next.clear();
        next.add(itemPath);
      }
      return { ...prev, selectedItems: next };
    });
  };

  // Execute transfer between panes
  const executeTransfer = (
    sourcePaneId: 'left' | 'right',
    itemsToTransfer: RcloneItem[]
  ) => {
    const srcPane = sourcePaneId === 'left' ? leftPane : rightPane;
    const dstPane = sourcePaneId === 'left' ? rightPane : leftPane;

    if (itemsToTransfer.length === 0) return;

    itemsToTransfer.forEach((item) => {
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const isDir = item.IsDir;
      const task: TransferTask = {
        id: taskId,
        name: item.Name,
        srcRemote: srcPane.remote,
        srcPath: item.Path,
        dstRemote: dstPane.remote,
        dstPath: dstPane.path ? `${dstPane.path}/${item.Name}` : item.Name,
        size: item.Size || 0,
        transferred: 0,
        percentage: 0,
        speed: '0 B/s',
        speedBytes: 0,
        eta: 'מתחיל...',
        status: 'queued',
        operation: isDir ? 'copy' : 'copyto',
        startTime: Date.now(),
        isDir,
      };

      setTasks((prev) => [task, ...prev]);
      setTransferManagerExpanded(true);

      if (window.electronAPI) {
        window.electronAPI.startTransfer(task, {
          transfers: settings.transfers,
          checkers: settings.checkers,
          retries: settings.retries,
          checksum: settings.checksum,
          bwlimitDownload: settings.bwlimitDownload,
          bwlimitUpload: settings.bwlimitUpload,
          fastList: settings.fastList,
        });
      }
    });

    addLog(
      'command',
      `נוספו ${itemsToTransfer.length} פריטים להעברה מ-[${srcPane.remote}] ל-[${dstPane.remote}]`
    );
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    const isLeft = deleteModal.paneId === 'left';
    const pane = isLeft ? leftPane : rightPane;
    const selected = Array.from(pane.selectedItems);

    for (const itemPath of selected) {
      const item = pane.items.find((i) => i.Path === itemPath);
      if (item && window.electronAPI) {
        await window.electronAPI.deleteItem(pane.remote, item.Path, item.IsDir);
      }
    }

    addLog('warn', `נמחקו ${selected.length} פריטים מתוך ${pane.remote}`);
    loadPaneItems(deleteModal.paneId);
  };

  // Rename handler
  const handleRenameConfirm = async (newName: string) => {
    const isLeft = renameModal.paneId === 'left';
    const pane = isLeft ? leftPane : rightPane;

    const targetItem = pane.items.find((i) => i.Path === renameModal.itemPath);
    if (!targetItem) return;

    const dir = pane.path;
    const newPath = dir ? `${dir}/${newName}` : newName;

    if (window.electronAPI) {
      await window.electronAPI.renameItem(pane.remote, targetItem.Path, newPath);
    }
    addLog('info', `שם הפריט שונה ל-"${newName}" ב-${pane.remote}`);
    loadPaneItems(renameModal.paneId);
  };

  // Create folder handler
  const handleCreateFolder = async (folderName: string) => {
    const isLeft = newFolderModal.paneId === 'left';
    const pane = isLeft ? leftPane : rightPane;

    if (window.electronAPI) {
      await window.electronAPI.createFolder(pane.remote, pane.path, folderName);
    }
    addLog('info', `נוצרה תיקייה חדשה "${folderName}" ב-${pane.remote}`);
    loadPaneItems(newFolderModal.paneId);
  };

  // Get Info metadata handler
  const handleGetInfo = async (paneId: 'left' | 'right', item: RcloneItem) => {
    const pane = paneId === 'left' ? leftPane : rightPane;
    setFileInfoModal({
      isOpen: true,
      metadata: {
        name: item.Name,
        path: item.Path,
        isDir: item.IsDir,
        size: item.Size > 0 ? item.Size : 0,
        modified: item.ModTime,
      },
    });

    if (window.electronAPI?.getFileMetadata) {
      const res = await window.electronAPI.getFileMetadata(item.Path, pane.remote);
      if (res.success && res.metadata) {
        setFileInfoModal((prev) => {
          if (!prev.isOpen) return prev;
          return {
            isOpen: true,
            metadata: {
              ...res.metadata,
              name: item.Name,
              path: item.Path,
              isDir: item.IsDir,
              modified: item.ModTime || res.metadata.modified,
            },
          };
        });
      }
    }
  };

  // Checksum calculation handler
  const handleChecksum = async (paneId: 'left' | 'right', item: RcloneItem, algo: 'md5' | 'sha256') => {
    const pane = paneId === 'left' ? leftPane : rightPane;
    if (window.electronAPI?.getChecksum) {
      addLog('command', `מחשב חתימת ${algo.toUpperCase()} עבור ${item.Name}...`);
      const res = await window.electronAPI.getChecksum(item.Path, algo, pane.remote);
      if (res.success && res.hash) {
        setChecksumModal({
          isOpen: true,
          fileName: item.Name,
          filePath: item.Path,
          hash: res.hash,
          algorithm: algo,
        });
      } else {
        addLog('error', `שגיאה בחישוב Checksum: ${res.error || 'נכשל'}`);
      }
    }
  };

  // New Folder with Selection handler (macOS style)
  const handleNewFolderWithSelection = async (paneId: 'left' | 'right', selectedList: RcloneItem[]) => {
    const pane = paneId === 'left' ? leftPane : rightPane;
    const baseFolderName = 'תיקייה חדשה עם פריטים';
    const targetDir = pane.path ? `${pane.path}/${baseFolderName}` : baseFolderName;

    if (window.electronAPI) {
      await window.electronAPI.createFolder(pane.remote, pane.path, baseFolderName);
      if (window.electronAPI.moveItems) {
        await window.electronAPI.moveItems(selectedList.map((i) => i.Path), targetDir, pane.remote);
      }
      addLog('info', `נוצרה תיקייה עם ${selectedList.length} פריטים שנבחרו`);
      loadPaneItems(paneId);
    }
  };

  // Batch rename confirmation handler
  const handleBatchRenameConfirm = async (changes: Array<{ oldPath: string; newPath: string }>) => {
    const paneId = batchRenameModal.paneId;
    const pane = paneId === 'left' ? leftPane : rightPane;
    if (window.electronAPI) {
      for (const ch of changes) {
        await window.electronAPI.renameItem(pane.remote, ch.oldPath, ch.newPath);
      }
      addLog('info', `שמות ${changes.length} פריטים שונו בהצלחה ב-${pane.remote}`);
      loadPaneItems(paneId);
    }
  };

  // Queue actions
  const handlePauseTask = (id: string) => {
    if (window.electronAPI) window.electronAPI.pauseTransfer(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'paused' } : t)));
  };

  const handleResumeTask = (id: string) => {
    if (window.electronAPI) window.electronAPI.resumeTransfer(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'running' } : t)));
  };

  const handleCancelTask = (id: string) => {
    if (window.electronAPI) window.electronAPI.cancelTransfer(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'cancelled' } : t)));
  };

  // Dynamic custom theme style variables
  const themeClass = `theme-${settings.theme || 'warm'}`;
  const customStyles: React.CSSProperties = settings.theme === 'custom' && settings.customTheme ? {
    ['--background' as any]: settings.customTheme.background,
    ['--foreground' as any]: settings.customTheme.text || '#f3ece7',
    ['--surface' as any]: settings.customTheme.surface,
    ['--surface-muted' as any]: settings.customTheme.surfaceMuted,
    ['--surface-border' as any]: settings.customTheme.border,
    ['--border' as any]: settings.customTheme.border,
    ['--mac-accent' as any]: settings.customTheme.accent,
    ['--mac-accent-hover' as any]: settings.customTheme.accentHover,
    ['--folder-border' as any]: settings.customTheme.accent,
    ['--folder-border-hover' as any]: settings.customTheme.accentHover,
    ['--icon-container-border' as any]: settings.customTheme.border,
    ['--icon-container-border-hover' as any]: settings.customTheme.accent,
    ['--selection-border' as any]: settings.customTheme.accent,
    ['--selection-bg' as any]: `${settings.customTheme.accent}25`,
  } : {};

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground font-sans ${themeClass}`}
      style={customStyles}
      dir={dir}
    >
      {/* Welcome / Onboarding Modal — first launch only */}
      {showWelcome && (
        <WelcomeModal
          onDismiss={() => {
            localStorage.setItem('hasSeenOnboarding', '1');
            setShowWelcome(false);
          }}
          onConnectRemote={() => setAccountsModalOpen(true)}
        />
      )}
      {/* 1. macOS Frameless TitleBar */}
      <TitleBar
        dualPane={dualPane}
        onToggleDualPane={() => setDualPane(!dualPane)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenAccounts={() => setAccountsModalOpen(true)}
        onOpenCompare={() => setCompareModalOpen(true)}
        onToggleLogs={() => setLogsOpen(!logsOpen)}
        onRefreshAll={() => {
          loadPaneItems('left');
          if (dualPane) loadPaneItems('right');
        }}
        logsOpen={logsOpen}
        settings={settings}
        activeTransferCount={tasks.filter((t) => t.status === 'running').length}
      />

      {/* 2. Main File Panes Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative m-0 p-0">
        {/* Left Pane (visual order follows dir) */}
        <div className={`flex-1 flex flex-col min-w-0 ${dualPane ? (isRtl ? 'border-l' : 'border-r') + ' border-surface-border' : ''}`}>
          <Toolbar
            paneId="left"
            remote={leftPane.remote}
            remotes={remotes}
            path={leftPane.path}
            viewMode={leftPane.viewMode}
            searchQuery={leftPane.searchQuery}
            showHiddenFiles={showHiddenFiles}
            canGoBack={leftPane.historyIndex > 0}
            canGoForward={leftPane.historyIndex < leftPane.history.length - 1}
            selectedCount={leftPane.selectedItems.size}
            targetPaneRemote={dualPane ? rightPane.remote : undefined}
            onSelectRemote={(r) => {
              setLeftPane((p) => ({ ...p, remote: r, path: '', history: [''], historyIndex: 0 }));
              loadPaneItems('left', r, '');
            }}
            onNavigate={handleNavigateLeft}
            onGoBack={handleGoBackLeft}
            onGoForward={handleGoForwardLeft}
            onGoUp={handleGoUpLeft}
            onGoHome={() => handleNavigateLeft('')}
            onToggleViewMode={(m) => setLeftPane((p) => ({ ...p, viewMode: m }))}
            onToggleHiddenFiles={() => setShowHiddenFiles(!showHiddenFiles)}
            onSearchChange={(q) => setLeftPane((p) => ({ ...p, searchQuery: q }))}
            onRefresh={() => loadPaneItems('left')}
            onOpenNewFolderModal={() => setNewFolderModal({ isOpen: true, paneId: 'left' })}
            onOpenRenameModal={() => {
              const selectedPath = Array.from(leftPane.selectedItems)[0];
              const item = leftPane.items.find((i) => i.Path === selectedPath);
              if (item) {
                setRenameModal({
                  isOpen: true,
                  paneId: 'left',
                  currentName: item.Name,
                  itemPath: item.Path,
                });
              }
            }}
            onTransferToTarget={() => {
              const selected = leftPane.items.filter((i) => leftPane.selectedItems.has(i.Path));
              executeTransfer('left', selected);
            }}
            onDeleteSelected={() => setDeleteModal({ isOpen: true, paneId: 'left' })}
            onOpenDuplicateScanner={() => setDuplicateModal({ isOpen: true, paneId: 'left' })}
            gridIconSize={leftPane.gridIconSize}
            onGridIconSizeChange={(size) => setLeftPane((p) => ({ ...p, gridIconSize: size }))}
          />

          <FilePane
            paneId="left"
            remote={leftPane.remote}
            path={leftPane.path}
            items={leftPane.items}
            selectedItems={leftPane.selectedItems}
            searchQuery={leftPane.searchQuery}
            sortField={leftPane.sortField}
            sortOrder={leftPane.sortOrder}
            viewMode={leftPane.viewMode}
            loading={leftPane.loading}
            error={leftPane.error}
            targetPaneRemote={dualPane ? rightPane.remote : undefined}
            onSelectItem={(path, multi, range) => handleSelectItem('left', path, multi, range)}
            onSelectAll={() =>
              setLeftPane((p) => ({
                ...p,
                selectedItems: new Set(p.items.map((i) => i.Path)),
              }))
            }
            onClearSelection={() => setLeftPane((p) => ({ ...p, selectedItems: new Set() }))}
            onOpenFolder={(fPath) => handleNavigateLeft(fPath)}
            onSort={(field) =>
              setLeftPane((p) => ({
                ...p,
                sortField: field,
                sortOrder: p.sortField === field && p.sortOrder === 'asc' ? 'desc' : 'asc',
              }))
            }
            onTransferItem={(item) => executeTransfer('left', [item])}
            onDeleteItem={(item) => {
              setLeftPane((p) => ({ ...p, selectedItems: new Set([item.Path]) }));
              setDeleteModal({ isOpen: true, paneId: 'left' });
            }}
            onDropTransfer={(droppedItems) => executeTransfer('right', droppedItems)}
            onRefresh={() => loadPaneItems('left')}
            gridIconSize={leftPane.gridIconSize}
            onGetInfo={(item) => handleGetInfo('left', item)}
            onChecksum={(item, algo) => handleChecksum('left', item, algo)}
            onNewFolderWithSelection={(selected) => handleNewFolderWithSelection('left', selected)}
            onBatchRename={(selected) => setBatchRenameModal({ isOpen: true, items: selected, paneId: 'left' })}
          />
        </div>

        {/* Left Pane (in RTL, second pane is on the left) */}
        {dualPane && (
          <div className="flex-1 flex flex-col min-w-0">
            <Toolbar
              paneId="right"
              remote={rightPane.remote}
              remotes={remotes}
              path={rightPane.path}
              viewMode={rightPane.viewMode}
              searchQuery={rightPane.searchQuery}
              showHiddenFiles={showHiddenFiles}
              canGoBack={rightPane.historyIndex > 0}
              canGoForward={rightPane.historyIndex < rightPane.history.length - 1}
              selectedCount={rightPane.selectedItems.size}
              targetPaneRemote={leftPane.remote}
              onSelectRemote={(r) => {
                setRightPane((p) => ({ ...p, remote: r, path: '', history: [''], historyIndex: 0 }));
                loadPaneItems('right', r, '');
              }}
              onNavigate={handleNavigateRight}
              onGoBack={handleGoBackRight}
              onGoForward={handleGoForwardRight}
              onGoUp={handleGoUpRight}
              onGoHome={() => handleNavigateRight('')}
              onToggleViewMode={(m) => setRightPane((p) => ({ ...p, viewMode: m }))}
              onToggleHiddenFiles={() => setShowHiddenFiles(!showHiddenFiles)}
              onSearchChange={(q) => setRightPane((p) => ({ ...p, searchQuery: q }))}
              onRefresh={() => loadPaneItems('right')}
              onOpenNewFolderModal={() => setNewFolderModal({ isOpen: true, paneId: 'right' })}
              onOpenRenameModal={() => {
                const selectedPath = Array.from(rightPane.selectedItems)[0];
                const item = rightPane.items.find((i) => i.Path === selectedPath);
                if (item) {
                  setRenameModal({
                    isOpen: true,
                    paneId: 'right',
                    currentName: item.Name,
                    itemPath: item.Path,
                  });
                }
              }}
              onTransferToTarget={() => {
                const selected = rightPane.items.filter((i) => rightPane.selectedItems.has(i.Path));
                executeTransfer('right', selected);
              }}
              onDeleteSelected={() => setDeleteModal({ isOpen: true, paneId: 'right' })}
              onOpenDuplicateScanner={() => setDuplicateModal({ isOpen: true, paneId: 'right' })}
              gridIconSize={rightPane.gridIconSize}
              onGridIconSizeChange={(size) => setRightPane((p) => ({ ...p, gridIconSize: size }))}
            />

            <FilePane
              paneId="right"
              remote={rightPane.remote}
              path={rightPane.path}
              items={rightPane.items}
              selectedItems={rightPane.selectedItems}
              searchQuery={rightPane.searchQuery}
              sortField={rightPane.sortField}
              sortOrder={rightPane.sortOrder}
              viewMode={rightPane.viewMode}
              loading={rightPane.loading}
              error={rightPane.error}
              targetPaneRemote={leftPane.remote}
              onSelectItem={(path, multi, range) => handleSelectItem('right', path, multi, range)}
              onSelectAll={() =>
                setRightPane((p) => ({
                  ...p,
                  selectedItems: new Set(p.items.map((i) => i.Path)),
                }))
              }
              onClearSelection={() => setRightPane((p) => ({ ...p, selectedItems: new Set() }))}
              onOpenFolder={(fPath) => handleNavigateRight(fPath)}
              onSort={(field) =>
                setRightPane((p) => ({
                  ...p,
                  sortField: field,
                  sortOrder: p.sortField === field && p.sortOrder === 'asc' ? 'desc' : 'asc',
                }))
              }
              onTransferItem={(item) => executeTransfer('right', [item])}
              onDeleteItem={(item) => {
                setRightPane((p) => ({ ...p, selectedItems: new Set([item.Path]) }));
                setDeleteModal({ isOpen: true, paneId: 'right' });
              }}
              onDropTransfer={(droppedItems) => executeTransfer('left', droppedItems)}
              onRefresh={() => loadPaneItems('right')}
              gridIconSize={rightPane.gridIconSize}
              onGetInfo={(item) => handleGetInfo('right', item)}
              onChecksum={(item, algo) => handleChecksum('right', item, algo)}
              onNewFolderWithSelection={(selected) => handleNewFolderWithSelection('right', selected)}
              onBatchRename={(selected) => setBatchRenameModal({ isOpen: true, items: selected, paneId: 'right' })}
            />
          </div>
        )}
      </div>

      {/* 3. Bottom Transfer Queue Manager */}
      <TransferManager
        tasks={tasks}
        isExpanded={transferManagerExpanded}
        onToggleExpand={() => setTransferManagerExpanded(!transferManagerExpanded)}
        onPauseTask={handlePauseTask}
        onResumeTask={handleResumeTask}
        onCancelTask={handleCancelTask}
        onDismissTask={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
        onClearCompleted={() => setTasks((prev) => prev.filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'failed'))}
        onPauseAll={() => tasks.forEach((t) => t.status === 'running' && handlePauseTask(t.id))}
        onResumeAll={() => tasks.forEach((t) => t.status === 'paused' && handleResumeTask(t.id))}
      />

      {/* 4. Terminal Activity Logs Drawer */}
      <LogsDrawer
        isOpen={logsOpen}
        logs={logs}
        onClose={() => setLogsOpen(false)}
        onClear={() => setLogs([])}
      />

      {/* 5. Accounts Management Modal */}
      <AccountsModal
        isOpen={accountsModalOpen}
        remotes={remotes}
        rcloneConfigPath={settings.rcloneConfigPath}
        onClose={() => setAccountsModalOpen(false)}
        onRefreshRemotes={refreshRemotesList}
        onSelectRemote={(rName) => {
          setLeftPane((p) => ({ ...p, remote: rName, path: '', history: [''], historyIndex: 0 }));
          loadPaneItems('left', rName, '');
        }}
      />

      {/* 6. Compare & Sync Modal */}
      <CompareModal
        isOpen={compareModalOpen}
        leftRemote={leftPane.remote}
        leftPath={leftPane.path}
        leftItems={leftPane.items}
        rightRemote={rightPane.remote}
        rightPath={rightPane.path}
        rightItems={rightPane.items}
        onClose={() => setCompareModalOpen(false)}
        onSyncToRight={(items) => executeTransfer('left', items)}
        onSyncToLeft={(items) => executeTransfer('right', items)}
      />

      {/* 7. Rename Modal */}
      <RenameModal
        isOpen={renameModal.isOpen}
        currentName={renameModal.currentName}
        onClose={() => setRenameModal((prev) => ({ ...prev, isOpen: false }))}
        onRename={handleRenameConfirm}
      />

      {/* 8. Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        settings={settings}
        onClose={() => setSettingsModalOpen(false)}
        onSave={(newSettings) => {
          setSettings((prev) => ({ ...prev, ...newSettings }));
          addLog('info', 'הגדרות המנוע עודכנו בהצלחה.');
        }}
        onDetectRclone={async (path) => {
          if (window.electronAPI) {
            const res = await window.electronAPI.detectRclone(path);
            setSettings((prev) => ({
              ...prev,
              rcloneDetected: res.detected,
              rcloneVersion: res.version,
              rclonePath: res.path,
              rcloneConfigPath: res.configPath,
            }));
            return res;
          }
          return { detected: false, path: 'rclone', version: 'לא מותקן', configPath: '' };
        }}
        onInstallHomebrew={async () => {
          if (window.electronAPI) {
            return await window.electronAPI.installViaHomebrew();
          }
          return { success: false, message: 'API אינו זמין' };
        }}
        onInstallWindows={async () => {
          if (window.electronAPI) {
            return await window.electronAPI.installForWindows();
          }
          return { success: false, message: 'API אינו זמין' };
        }}
      />

      {/* 9. New Folder Modal */}
      <NewFolderModal
        isOpen={newFolderModal.isOpen}
        remote={newFolderModal.paneId === 'left' ? leftPane.remote : rightPane.remote}
        currentPath={newFolderModal.paneId === 'left' ? leftPane.path : rightPane.path}
        onClose={() => setNewFolderModal((prev) => ({ ...prev, isOpen: false }))}
        onCreate={handleCreateFolder}
      />

      {/* 10. Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        itemCount={
          deleteModal.paneId === 'left'
            ? leftPane.selectedItems.size
            : rightPane.selectedItems.size
        }
        remote={deleteModal.paneId === 'left' ? leftPane.remote : rightPane.remote}
        onClose={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleDeleteConfirm}
      />

      {/* 11. File Info / Properties Modal */}
      <FileInfoModal
        isOpen={fileInfoModal.isOpen}
        metadata={fileInfoModal.metadata}
        onClose={() => setFileInfoModal({ isOpen: false, metadata: null })}
      />

      {/* 12. Checksum Modal */}
      <ChecksumModal
        isOpen={checksumModal.isOpen}
        fileName={checksumModal.fileName}
        filePath={checksumModal.filePath}
        hash={checksumModal.hash}
        algorithm={checksumModal.algorithm}
        onClose={() => setChecksumModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 13. Batch Rename Modal */}
      <BatchRenameModal
        isOpen={batchRenameModal.isOpen}
        items={batchRenameModal.items}
        onClose={() => setBatchRenameModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleBatchRenameConfirm}
      />

      {/* 14. Duplicate Scanner Modal */}
      <DuplicateScannerModal
        isOpen={duplicateModal.isOpen}
        remote={duplicateModal.paneId === 'left' ? leftPane.remote : rightPane.remote}
        currentPath={duplicateModal.paneId === 'left' ? leftPane.path : rightPane.path}
        onClose={() => setDuplicateModal((prev) => ({ ...prev, isOpen: false }))}
        onRefresh={() => loadPaneItems(duplicateModal.paneId)}
      />
    </div>
  );
};
export default App;
