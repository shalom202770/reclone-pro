export interface RcloneItem {
  Path: string;
  Name: string;
  Size: number;
  MimeType?: string;
  ModTime: string;
  IsDir: boolean;
  ID?: string;
}

export interface RemoteInfo {
  name: string;
  type: string;
  icon?: string;
  isLocal?: boolean;
  isUnion?: boolean;
  storage?: RemoteStorageInfo;
}

export interface RemoteStorageInfo {
  total: number;
  used: number;
  free: number;
  trashed?: number;
}

export type TransferStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type TransferOperation = 'copy' | 'move' | 'sync' | 'copyto' | 'moveto';

export interface TransferSubFile {
  name: string;
  size: number;
  transferred: number;
  percentage: number;
  speed?: string;
  eta?: string;
  status?: 'transferring' | 'completed' | 'queued';
}

export interface TransferTask {
  id: string;
  name: string;
  srcRemote: string;
  srcPath: string;
  dstRemote: string;
  dstPath: string;
  size: number;
  transferred: number;
  percentage: number;
  speed: string;
  speedBytes: number;
  eta: string;
  status: TransferStatus;
  operation: TransferOperation;
  startTime: number;
  error?: string;
  isDir?: boolean;
  transfersCount?: number;
  totalTransfersCount?: number;
  subFiles?: TransferSubFile[];
}

export type ThemeMode =
  | 'light'
  | 'warm'
  | 'dark'
  | 'light-mac'
  | 'warm-mac'
  | 'dark-mac'
  | 'macos'
  | 'light-blue-folders'
  | 'warm-blue-folders'
  | 'dark-blue-folders'
  | 'custom';

export interface CustomThemeColors {
  accent: string;        // Light orange / primary accent
  accentHover: string;   // Secondary / dark orange accent
  background: string;    // App background
  surface: string;       // Surface panels
  surfaceMuted: string;  // Toolbars / headers
  border: string;        // Frames & dividers
  text: string;          // Main text color
}

export interface AppSettings {
  rclonePath: string;
  rcloneDetected: boolean;
  rcloneVersion: string;
  rcloneConfigPath: string;
  transfers: number;
  checkers: number;
  retries: number;
  checksum: boolean;
  bwlimitDownload: string;
  bwlimitUpload: string;
  fastList: boolean;
  showHiddenFiles: boolean;
  language: 'he' | 'en';
  fontFamily?: string;
  theme: ThemeMode;
  customTheme?: CustomThemeColors;
  defaultLocalPath: string;
  autoBackupEnabled?: boolean;
  autoBackupIntervalHours?: number;
  autoBackupSource?: string;
  autoBackupDestRemote?: string;
  autoBackupDestPath?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'command';
  message: string;
}

export type ViewMode = 'list' | 'grid';
export type SortField = 'Name' | 'Size' | 'ModTime' | 'IsDir';
export type SortOrder = 'asc' | 'desc';

export interface PaneState {
  id: 'left' | 'right';
  remote: string;
  path: string;
  items: RcloneItem[];
  selectedItems: Set<string>;
  searchQuery: string;
  sortField: SortField;
  sortOrder: SortOrder;
  viewMode: ViewMode;
  loading: boolean;
  error: string | null;
  history: string[];
  historyIndex: number;
  gridIconSize: number;
}

export interface CompareResult {
  leftOnly: RcloneItem[];
  rightOnly: RcloneItem[];
  different: { left: RcloneItem; right: RcloneItem }[];
  identical: RcloneItem[];
}
