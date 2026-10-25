import { contextBridge, ipcRenderer } from 'electron';
import type { RemoteInfo, RcloneItem, TransferTask, AppSettings, LogEntry, RemoteStorageInfo } from '../src/types';

const api = {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  platform: process.platform,

  // Window Controls
  windowMinimize: () => {
    ipcRenderer.send('window-minimize');
  },
  windowMaximize: () => {
    ipcRenderer.send('window-maximize');
  },
  windowClose: () => {
    ipcRenderer.send('window-close');
  },
  windowControl: (action: 'minimize' | 'maximize' | 'close') => {
    ipcRenderer.send('window:control', action);
  },

  // Remotes & Files
  listRemotes: (): Promise<RemoteInfo[]> => {
    return ipcRenderer.invoke('rclone:list-remotes');
  },
  listItems: (remote: string, path: string, showHidden: boolean = false): Promise<RcloneItem[]> => {
    return ipcRenderer.invoke('rclone:list-items', { remote, path, showHidden });
  },
  getStorageUsage: (remote: string): Promise<RemoteStorageInfo> => {
    return ipcRenderer.invoke('rclone:get-storage-usage', remote);
  },
  createFolder: (remote: string, path: string, folderName: string): Promise<boolean> => {
    return ipcRenderer.invoke('rclone:create-folder', { remote, path, folderName });
  },
  deleteItem: (remote: string, itemPath: string, isDir: boolean): Promise<boolean> => {
    return ipcRenderer.invoke('rclone:delete-item', { remote, itemPath, isDir });
  },
  renameItem: (remote: string, oldPath: string, newPath: string): Promise<boolean> => {
    return ipcRenderer.invoke('rclone:rename-item', { remote, oldPath, newPath });
  },

  // Accounts & Config
  createRemote: (name: string, type: string, params: Record<string, string>): Promise<boolean> => {
    return ipcRenderer.invoke('rclone:create-remote', { name, type, params });
  },
  deleteRemote: (name: string): Promise<boolean> => {
    return ipcRenderer.invoke('rclone:delete-remote', name);
  },
  readConfigContent: (): Promise<string> => {
    return ipcRenderer.invoke('rclone:read-config');
  },
  writeConfigContent: (content: string): Promise<boolean> => {
    return ipcRenderer.invoke('rclone:write-config', content);
  },
  installViaHomebrew: (): Promise<{ success: boolean; message: string }> => {
    return ipcRenderer.invoke('rclone:install-homebrew');
  },
  installForWindows: (): Promise<{ success: boolean; message: string; path?: string }> => {
    return ipcRenderer.invoke('rclone:install-windows');
  },

  // Transfers
  startTransfer: (task: TransferTask, settings: any): Promise<void> => {
    return ipcRenderer.invoke('rclone:start-transfer', { task, settings });
  },
  pauseTransfer: (taskId: string): Promise<void> => {
    return ipcRenderer.invoke('rclone:pause-transfer', taskId);
  },
  resumeTransfer: (taskId: string): Promise<void> => {
    return ipcRenderer.invoke('rclone:resume-transfer', taskId);
  },
  cancelTransfer: (taskId: string): Promise<void> => {
    return ipcRenderer.invoke('rclone:cancel-transfer', taskId);
  },

  // Settings & CLI
  getSettings: (): Promise<AppSettings> => {
    return ipcRenderer.invoke('rclone:get-settings');
  },
  detectRclone: (customPath?: string): Promise<{ detected: boolean; path: string; version: string; configPath: string }> => {
    return ipcRenderer.invoke('rclone:detect-path', customPath);
  },
  openPath: (filePath: string, remote?: string): Promise<void> => {
    return ipcRenderer.invoke('shell:open-path', { remote, filePath });
  },
  openExternal: (url: string): Promise<boolean> => {
    return ipcRenderer.invoke('shell:open-external', url);
  },
  getThumbnailUrl: (remote: string, filePath: string, fileId?: string): Promise<string | null> => {
    return ipcRenderer.invoke('rclone:get-thumbnail-url', { remote, filePath, fileId });
  },
  mediaConvert: (inputPath: string, outputPath: string, preset: 'mp4' | 'mp3' | 'web', remote?: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('media:convert', { inputPath, outputPath, preset, remote });
  },
  archiveCompress: (sourcePath: string, outputPath: string, remote?: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('archive:compress', { sourcePath, outputPath, remote });
  },
  archiveExtract: (archivePath: string, destDir: string, remote?: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('archive:extract', { archivePath, destDir, remote });
  },

  imageConvert: (inputPath: string, targetFormat: 'jpeg' | 'png', remote?: string): Promise<{ success: boolean; outputPath?: string; error?: string }> => {
    return ipcRenderer.invoke('image:convert', { inputPath, targetFormat, remote });
  },

  // Advanced File Management
  getChecksum: (filePath: string, algorithm: 'md5' | 'sha256', remote?: string): Promise<{ success: boolean; hash?: string; algorithm?: string; error?: string }> => {
    return ipcRenderer.invoke('file:checksum', { filePath, algorithm, remote });
  },
  getFileMetadata: (filePath: string, remote?: string): Promise<{ success: boolean; metadata?: any; error?: string }> => {
    return ipcRenderer.invoke('file:metadata', { filePath, remote });
  },
  moveItems: (sourcePaths: string[], targetDir: string, remote?: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('file:move-items', { sourcePaths, targetDir, remote });
  },
  findDuplicates: (dirPath: string, remote?: string): Promise<{ success: boolean; duplicates?: Array<{ hash: string; size: number; files: string[] }>; error?: string }> => {
    return ipcRenderer.invoke('file:find-duplicates', { dirPath, remote });
  },

  // Subscriptions
  onTransferProgress: (callback: (data: Partial<TransferTask> & { id: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('rclone:transfer-progress', handler);
    return () => {
      ipcRenderer.removeListener('rclone:transfer-progress', handler);
    };
  },
  onLog: (callback: (data: LogEntry) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('rclone:log', handler);
    return () => {
      ipcRenderer.removeListener('rclone:log', handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
export type ElectronAPI = typeof api;
