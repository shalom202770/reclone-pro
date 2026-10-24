import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import type { RcloneItem, RemoteInfo, RemoteStorageInfo, TransferTask, TransferSubFile } from '../src/types';

// Prepend macOS package manager paths to process.env.PATH so rclone & brew are always detected
const systemPaths = [
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  '/usr/local/bin',
  `${os.homedir()}/.local/bin`,
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin',
];
process.env.PATH = `${systemPaths.join(':')}:${process.env.PATH || ''}`;

const execAsync = promisify(exec);

function formatEtaHebrew(secs: number | null | undefined): string {
  if (secs == null || isNaN(secs) || secs < 0) return '--';
  const s = Math.round(secs);
  if (s === 0) return 'פחות מדקה';
  if (s < 60) return `${s} שניות`;
  const totalMins = Math.floor(s / 60);
  if (totalMins < 60) return `${totalMins} דקות`;
  const hours = Math.floor(totalMins / 60);
  const remMins = totalMins % 60;
  if (remMins === 0) return hours === 1 ? 'שעה אחת' : `${hours} שעות`;
  const hourText = hours === 1 ? 'שעה אחת' : `${hours} שעות`;
  return `${hourText} ו-${remMins} דקות`;
}

export class RcloneManager {
  private rclonePath: string = '/opt/homebrew/bin/rclone';
  private configPath: string = '';
  private activeProcesses: Map<string, any> = new Map();
  private isDetected: boolean = false;
  private versionInfo: string = '';
  private onLogCallback?: (entry: { level: 'info' | 'warn' | 'error' | 'command'; message: string }) => void;
  private onProgressCallback?: (task: Partial<TransferTask> & { id: string }) => void;
  private onOpenUrlCallback?: (url: string) => void;

  constructor() {
    this.configPath = path.join(os.homedir(), '.config/rclone/rclone.conf');
    this.detectRclonePath();
  }

  public setCallbacks(
    onLog: (entry: { level: 'info' | 'warn' | 'error' | 'command'; message: string }) => void,
    onProgress: (task: Partial<TransferTask> & { id: string }) => void,
    onOpenUrl?: (url: string) => void
  ) {
    this.onLogCallback = onLog;
    this.onProgressCallback = onProgress;
    this.onOpenUrlCallback = onOpenUrl;
  }

  public log(level: 'info' | 'warn' | 'error' | 'command', message: string) {
    if (this.onLogCallback) {
      this.onLogCallback({ level, message });
    }
  }

  public async detectRclonePath(customPath?: string): Promise<{ detected: boolean; path: string; version: string; configPath: string }> {
    const candidatePaths = [
      customPath,
      '/opt/homebrew/bin/rclone',
      '/usr/local/bin/rclone',
      '/usr/bin/rclone',
      path.join(os.homedir(), '.local/bin/rclone'),
      this.rclonePath,
      'rclone',
    ].filter(Boolean) as string[];

    for (const testPath of candidatePaths) {
      try {
        if (testPath.startsWith('/') && !fs.existsSync(testPath)) {
          continue;
        }

        const { stdout } = await execAsync(`"${testPath}" version`, {
          env: process.env,
        });
        const firstLine = stdout.split('\n')[0] || '';
        this.rclonePath = testPath;
        this.isDetected = true;
        this.versionInfo = firstLine.trim();

        // Detect config path via rclone config file
        try {
          const { stdout: cfgOut } = await execAsync(`"${testPath}" config file`, { env: process.env });
          const match = cfgOut.match(/(?:stored at:|file:)\s*(.+)/i);
          if (match && match[1]) {
            this.configPath = match[1].trim();
          }
        } catch {}

        this.log('info', `זוהה Rclone תקין במערכת: "${testPath}" (${this.versionInfo})`);
        return { detected: true, path: testPath, version: this.versionInfo, configPath: this.configPath };
      } catch {}
    }

    this.isDetected = false;
    this.versionInfo = 'לא מותקן (נדרשת התקנה דרך Homebrew או הגדרת נתיב)';
    this.log('warn', 'קובץ ההרצה של Rclone לא נמצא במערכת.');
    return { detected: false, path: this.rclonePath, version: this.versionInfo, configPath: this.configPath };
  }

  public getSettings() {
    return {
      rclonePath: this.rclonePath,
      rcloneDetected: this.isDetected,
      rcloneVersion: this.versionInfo,
      rcloneConfigPath: this.configPath,
    };
  }

  public getRcloneInfo() {
    return this.getSettings();
  }

  public getRclonePath(): string {
    return this.rclonePath;
  }

  public async installViaHomebrew(): Promise<{ success: boolean; message: string }> {
    const brewCmd = fs.existsSync('/opt/homebrew/bin/brew')
      ? '/opt/homebrew/bin/brew'
      : fs.existsSync('/usr/local/bin/brew')
      ? '/usr/local/bin/brew'
      : 'brew';

    this.log('command', `הפעלת התקנה דרך Homebrew: ${brewCmd} install rclone`);
    try {
      const { stdout, stderr } = await execAsync(`"${brewCmd}" install rclone`, {
        env: process.env,
      });
      this.log('info', `פלט התקנת Homebrew: ${stdout || stderr}`);
      await this.detectRclonePath('/opt/homebrew/bin/rclone');
      return { success: true, message: 'ההתקנה הושלמה בהצלחה' };
    } catch (err: any) {
      this.log('error', `שגיאה בהתקנת Homebrew: ${err?.message || err}`);
      return { success: false, message: err?.message || 'ההתקנה נכשלה' };
    }
  }

  public async listRemotes(): Promise<RemoteInfo[]> {
    const remotes: RemoteInfo[] = [
      {
        name: 'Local Mac',
        type: 'local',
        icon: 'laptop',
        isLocal: true,
      },
    ];

    if (this.isDetected) {
      try {
        const { stdout } = await execAsync(`"${this.rclonePath}" listremotes`, { env: process.env });
        const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
          const remoteName = line.replace(/:$/, '');
          remotes.push({
            name: remoteName,
            type: 'cloud',
            icon: 'cloud',
            isLocal: false,
          });
        }
      } catch (err: any) {
        this.log('error', `שגיאה בקריאת remotes מ-Rclone: ${err?.message || err}`);
      }
    }

    // Direct fallback from rclone.conf
    if (remotes.length === 1 && fs.existsSync(this.configPath)) {
      try {
        const content = await fs.promises.readFile(this.configPath, 'utf-8');
        const lines = content.split('\n');
        let currentSection = '';
        let currentType = 'cloud';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          const sectionMatch = line.match(/^\[(.*)\]$/);
          if (sectionMatch) {
            if (currentSection && !remotes.some((r) => r.name === currentSection)) {
              remotes.push({ name: currentSection, type: currentType, isLocal: false });
            }
            currentSection = sectionMatch[1];
            currentType = 'cloud';
          } else if (line.startsWith('type =') || line.startsWith('type=')) {
            currentType = line.split('=')[1].trim();
          }
        }
        if (currentSection && !remotes.some((r) => r.name === currentSection)) {
          remotes.push({ name: currentSection, type: currentType, isLocal: false });
        }
      } catch (e: any) {
        this.log('error', `שגיאה בפענוח rclone.conf: ${e.message}`);
      }
    }

    return remotes;
  }

  public async getStorageUsage(remote: string): Promise<RemoteStorageInfo> {
    if (remote === 'Local Mac' || remote === 'local' || remote === '') {
      try {
        const stat = await fs.promises.statfs(os.homedir());
        const bsize = stat.bsize || 4096;
        const total = stat.blocks * bsize;
        const free = stat.bavail * bsize;
        const used = total - free;
        return { total, used, free };
      } catch {
        return { total: 0, used: 0, free: 0 };
      }
    }

    if (this.isDetected) {
      try {
        const { stdout } = await execAsync(`"${this.rclonePath}" about "${remote}:" --json`, {
          env: process.env,
          timeout: 10000,
        });
        const json = JSON.parse(stdout);
        return {
          total: json.total || 0,
          used: json.used || 0,
          free: json.free || 0,
          trashed: json.trashed || 0,
        };
      } catch (err: any) {
        this.log('warn', `לא ניתן לחשב נפח עבור ${remote}: ${err.message}`);
      }
    }

    return { total: 0, used: 0, free: 0 };
  }

  public async getPathSize(remote: string, dirPath: string = ''): Promise<{ count: number; bytes: number }> {
    const cleanPath = (dirPath || '').replace(/^\/+/, '');
    const isLocal = !remote || remote === 'Local Mac' || remote === 'local' || remote.startsWith('/');

    if (isLocal) {
      const rootDir = remote && remote.startsWith('/')
        ? path.join(remote, cleanPath)
        : (cleanPath.startsWith('/') ? cleanPath : path.join(os.homedir(), cleanPath));

      let totalFiles = 0;
      let totalSize = 0;
      const walk = (d: string) => {
        try {
          const entries = fs.readdirSync(d, { withFileTypes: true });
          for (const ent of entries) {
            const p = path.join(d, ent.name);
            if (ent.isDirectory()) {
              walk(p);
            } else if (ent.isFile()) {
              totalFiles++;
              try { totalSize += fs.statSync(p).size; } catch {}
            }
          }
        } catch {}
      };

      if (fs.existsSync(rootDir)) {
        if (fs.statSync(rootDir).isDirectory()) {
          walk(rootDir);
        } else {
          return { count: 1, bytes: fs.statSync(rootDir).size };
        }
      }
      return { count: totalFiles, bytes: totalSize };
    }

    // Remote Rclone path
    const remoteTarget = cleanPath ? `${remote}:${cleanPath}` : `${remote}:`;
    try {
      const { stdout } = await execAsync(`"${this.rclonePath}" size "${remoteTarget}" --json`, {
        env: process.env,
        timeout: 30000,
      });
      const data = JSON.parse(stdout);
      return {
        count: Number(data.count || 0),
        bytes: Number(data.bytes || 0),
      };
    } catch {
      try {
        const { stdout } = await execAsync(`"${this.rclonePath}" size "${remoteTarget}"`, {
          env: process.env,
          timeout: 30000,
        });
        const countMatch = stdout.match(/Total objects:\s*(\d+)/i);
        const bytesMatch = stdout.match(/Total size:.*?\((\d+)\s*Byte/i);
        const count = countMatch ? parseInt(countMatch[1], 10) : 0;
        const bytes = bytesMatch ? parseInt(bytesMatch[1], 10) : 0;
        return { count, bytes };
      } catch {
        return { count: 0, bytes: 0 };
      }
    }
  }

  public async listItems(remote: string, dirPath: string = '', showHidden: boolean = false): Promise<RcloneItem[]> {
    if (remote === 'Local Mac' || remote === 'local' || remote === '') {
      return this.listLocalItems(dirPath || os.homedir(), showHidden);
    }

    if (this.isDetected) {
      try {
        const fullRemotePath = dirPath ? `${remote}:${dirPath}` : `${remote}:`;
        this.log('command', `${this.rclonePath} lsjson "${fullRemotePath}" --fast-list`);
        const { stdout } = await execAsync(`"${this.rclonePath}" lsjson "${fullRemotePath}" --fast-list --max-depth 1`, {
          env: process.env,
          maxBuffer: 25 * 1024 * 1024,
        });
        let items = JSON.parse(stdout) as RcloneItem[];
        if (!showHidden) {
          items = items.filter((i) => !i.Name.startsWith('.'));
        }
        return items;
      } catch (err: any) {
        this.log('error', `שגיאה בטעינת קבצים מ-${remote}: ${err?.message || err}`);
        throw err;
      }
    }

    throw new Error(`Rclone אינו זמין עבור פריטי ענן (${remote}).`);
  }

  private async listLocalItems(dirPath: string, showHidden: boolean): Promise<RcloneItem[]> {
    const targetDir = dirPath ? path.resolve(dirPath) : os.homedir();
    const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });
    const items: RcloneItem[] = [];

    for (const entry of entries) {
      if (!showHidden && entry.name.startsWith('.')) continue;
      if (entry.name === '.DS_Store') continue;

      const fullPath = path.join(targetDir, entry.name);
      try {
        const stats = await fs.promises.stat(fullPath);
        items.push({
          Path: fullPath,
          Name: entry.name,
          Size: entry.isDirectory() ? 0 : stats.size,
          ModTime: stats.mtime.toISOString(),
          IsDir: entry.isDirectory(),
          MimeType: entry.isDirectory() ? 'inode/directory' : this.guessMimeType(entry.name),
        });
      } catch {
        items.push({
          Path: fullPath,
          Name: entry.name,
          Size: 0,
          ModTime: new Date().toISOString(),
          IsDir: entry.isDirectory(),
        });
      }
    }

    return items;
  }

  public async createDirectory(remote: string, dirPath: string, folderName: string): Promise<boolean> {
    const targetPath = dirPath ? `${dirPath}/${folderName}` : folderName;
    if (remote === 'Local Mac' || remote === 'local' || remote === '') {
      const fullPath = path.resolve(dirPath || os.homedir(), folderName);
      await fs.promises.mkdir(fullPath, { recursive: true });
      this.log('info', `נוצרה תיקייה מקומית: ${fullPath}`);
      return true;
    }

    if (this.isDetected) {
      await execAsync(`"${this.rclonePath}" mkdir "${remote}:${targetPath}"`, { env: process.env });
      this.log('info', `נוצרה תיקייה בענן: ${remote}:${targetPath}`);
      return true;
    }

    throw new Error('Rclone CLI אינו זמין');
  }

  public async deleteItem(remote: string, itemPath: string, isDir: boolean): Promise<boolean> {
    if (remote === 'Local Mac' || remote === 'local' || remote === '') {
      await fs.promises.rm(itemPath, { recursive: true, force: true });
      this.log('info', `נמחק פריט מקומי: ${itemPath}`);
      return true;
    }

    if (this.isDetected) {
      const cmd = isDir ? 'purge' : 'deletefile';
      await execAsync(`"${this.rclonePath}" ${cmd} "${remote}:${itemPath}"`, { env: process.env });
      this.log('info', `נמחק פריט ענן: ${remote}:${itemPath}`);
      return true;
    }

    throw new Error('Rclone CLI אינו זמין');
  }

  public async renameItem(remote: string, oldPath: string, newPath: string): Promise<boolean> {
    if (remote === 'Local Mac' || remote === 'local' || remote === '') {
      await fs.promises.rename(oldPath, newPath);
      this.log('info', `שם פריט מקומי שונה ל-${newPath}`);
      return true;
    }

    if (this.isDetected) {
      await execAsync(`"${this.rclonePath}" moveto "${remote}:${oldPath}" "${remote}:${newPath}"`, { env: process.env });
      this.log('info', `שם פריט ענן שונה: ${newPath}`);
      return true;
    }

    throw new Error('Rclone CLI אינו זמין');
  }

  public async createRemote(name: string, type: string, params: Record<string, string>): Promise<boolean> {
    this.log('command', `יצירת חשבון חדש: [${name}] סוג: ${type}`);

    if (this.isDetected) {
      // Build rclone config create command
      const args = ['config', 'create', name, type];

      if (type === 'drive' || type === 'onedrive' || type === 'dropbox') {
        args.push('config_is_local', 'true');
      }

      for (const [k, v] of Object.entries(params)) {
        if (v && v.trim()) {
          args.push(`${k}=${v.trim()}`);
        }
      }

      this.log('command', `${this.rclonePath} ${args.join(' ')}`);

      return new Promise<boolean>((resolve, reject) => {
        const proc = spawn(this.rclonePath, args, { env: process.env });
        let urlOpened = false;

        const checkOutput = (data: Buffer) => {
          const text = data.toString();
          this.log('info', `[Rclone Auth] ${text.trim()}`);

          // Look for OAuth URLs
          const match = text.match(/(https:\/\/(?:accounts\.google\.com|login\.microsoftonline\.com|www\.dropbox\.com)[^\s]+|http:\/\/127\.0\.0\.1:\d+[^\s]+|http:\/\/localhost:\d+[^\s]+)/i);
          if (match && match[1] && !urlOpened) {
            urlOpened = true;
            this.log('info', `פותח דפדפן לאימות OAuth: ${match[1]}`);
            if (this.onOpenUrlCallback) {
              this.onOpenUrlCallback(match[1]);
            }
          }
        };

        proc.stdout.on('data', checkOutput);
        proc.stderr.on('data', checkOutput);

        proc.on('close', (code) => {
          if (code === 0) {
            this.log('info', `החשבון "${name}" נוצר בהצלחה ב-Rclone!`);
            resolve(true);
          } else {
            this.log('error', `יצירת החשבון נכשלה עם קוד יציאה ${code}`);
            reject(new Error(`ההרשאה נכשלה או בוטלה (קוד: ${code})`));
          }
        });

        proc.on('error', (err) => {
          this.log('error', `שגיאת הרצה: ${err.message}`);
          reject(err);
        });
      });
    }

    // Direct write fallback
    const confDir = path.dirname(this.configPath);
    await fs.promises.mkdir(confDir, { recursive: true });
    let block = `\n[${name}]\ntype = ${type}\n`;
    for (const [k, v] of Object.entries(params)) {
      if (v) block += `${k} = ${v}\n`;
    }
    await fs.promises.appendFile(this.configPath, block, 'utf-8');
    this.log('info', `החשבון ${name} נשמר בקובץ ${this.configPath}`);
    return true;
  }

  public async deleteRemote(name: string): Promise<boolean> {
    this.log('command', `מחיקת חשבון: [${name}]`);
    if (this.isDetected) {
      try {
        await execAsync(`"${this.rclonePath}" config delete "${name}"`, { env: process.env });
        this.log('info', `החשבון ${name} נמחק בהצלחה`);
        return true;
      } catch (err: any) {
        this.log('error', `שגיאה במחיקת חשבון דרך CLI: ${err.message}`);
      }
    }

    if (fs.existsSync(this.configPath)) {
      const content = await fs.promises.readFile(this.configPath, 'utf-8');
      const regex = new RegExp(`\\[${name}\\][\\s\\S]*?(?=\\n\\[|$)`, 'g');
      const updated = content.replace(regex, '').trim();
      await fs.promises.writeFile(this.configPath, updated + '\n', 'utf-8');
      this.log('info', `החשבון ${name} הוסר מקובץ ${this.configPath}`);
      return true;
    }

    return false;
  }

  public async readConfigContent(): Promise<string> {
    if (fs.existsSync(this.configPath)) {
      return await fs.promises.readFile(this.configPath, 'utf-8');
    }
    return '';
  }

  public async writeConfigContent(content: string): Promise<boolean> {
    const confDir = path.dirname(this.configPath);
    await fs.promises.mkdir(confDir, { recursive: true });
    await fs.promises.writeFile(this.configPath, content, 'utf-8');
    this.log('info', `קובץ ההגדרות עודכן בהצלחה`);
    return true;
  }

  public async getRemoteConfig(remoteName: string): Promise<Record<string, string> | null> {
    if (!fs.existsSync(this.configPath)) return null;
    try {
      const content = await fs.promises.readFile(this.configPath, 'utf-8');
      const lines = content.split('\n');
      let currentSection = '';
      const config: Record<string, string> = {};

      for (const line of lines) {
        const trimmed = line.trim();
        const sectionMatch = trimmed.match(/^\[(.*)\]$/);
        if (sectionMatch) {
          currentSection = sectionMatch[1];
          continue;
        }
        if (currentSection === remoteName) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            config[key] = val;
          }
        }
      }
      return Object.keys(config).length > 0 ? config : null;
    } catch {
      return null;
    }
  }

  public startTransfer(
    task: TransferTask,
    settings: {
      transfers: number;
      checkers: number;
      retries: number;
      checksum: boolean;
      bwlimitDownload: string;
      bwlimitUpload: string;
      fastList: boolean;
    }
  ) {
    this.log('command', `התחלת העברה: ${task.name} מ-[${task.srcRemote}:${task.srcPath}] ל-[${task.dstRemote}:${task.dstPath}]`);

    const isSrcLocal = task.srcRemote === 'Local Mac' || task.srcRemote === 'local';
    const isDstLocal = task.dstRemote === 'Local Mac' || task.dstRemote === 'local';

    const src = isSrcLocal ? task.srcPath : `${task.srcRemote}:${task.srcPath}`;
    const dst = isDstLocal ? task.dstPath : `${task.dstRemote}:${task.dstPath}`;

    if (!this.isDetected) {
      this.log('error', 'לא ניתן לבצע העברה ללא מנוע Rclone פעיל במערכת.');
      this.onProgressCallback?.({
        id: task.id,
        status: 'failed',
        error: 'Rclone אינו מותקן במערכת',
      });
      return;
    }

    // For single files, use copyto / moveto instead of copy / move so Rclone transfers directly without creating a nested folder
    let operation: string = task.operation;
    const isSingleFile = task.isDir === false || (task.isDir === undefined && (() => {
      if (isSrcLocal) {
        try {
          return !fs.statSync(task.srcPath).isDirectory();
        } catch {
          return false;
        }
      }
      return false;
    })());

    if (isSingleFile) {
      if (operation === 'copy') operation = 'copyto';
      else if (operation === 'move') operation = 'moveto';
    } else if (task.isDir === true) {
      if (operation === 'copyto') operation = 'copy';
      else if (operation === 'moveto') operation = 'move';
    }

    const args = [
      operation,
      src,
      dst,
      `--transfers=${settings.transfers || 8}`,
      `--checkers=${settings.checkers || 16}`,
      `--retries=${settings.retries || 3}`,
      '--drive-chunk-size=64M',
      '--buffer-size=32M',
      '--stats=1s',
      '--stats-log-level=NOTICE',
      '--use-json-log',
    ];

    if (settings.checksum) {
      args.push('--checksum');
    }

    const up = settings.bwlimitUpload && settings.bwlimitUpload !== '0' && settings.bwlimitUpload !== 'Unlimited' ? settings.bwlimitUpload : '';
    const down = settings.bwlimitDownload && settings.bwlimitDownload !== '0' && settings.bwlimitDownload !== 'Unlimited' ? settings.bwlimitDownload : '';
    if (up || down) {
      args.push(`--bwlimit=${up || '0'}:${down || '0'}`);
    }

    if (isSingleFile) {
      // Optimization: skip scanning destination directory tree to eliminate initial 5s delay!
      args.push('--no-traverse');
      args.push('--no-check-dest');
    } else {
      // Optimization: use fast-list for directory trees
      args.push('--fast-list');
    }

    // Optimization: avoid re-checking/overwriting existing files to bypass destination latency
    args.push('--ignore-existing');

    this.log('command', `הפעלת פקודה: ${this.rclonePath} ${args.join(' ')}`);

    const proc = spawn(this.rclonePath, args, { env: process.env });
    this.activeProcesses.set(task.id, proc);

    proc.stdout.on('data', (data) => {
      this.parseRcloneOutput(task.id, data.toString());
    });

    proc.stderr.on('data', (data) => {
      this.parseRcloneOutput(task.id, data.toString());
    });

    proc.on('close', (code) => {
      this.activeProcesses.delete(task.id);
      if (code === 0) {
        this.log('info', `ההעברה הושלמה בהצלחה: ${task.name}`);
        this.onProgressCallback?.({
          id: task.id,
          status: 'completed',
          percentage: 100,
          speed: '0 B/s',
          speedBytes: 0,
          eta: 'הסתיים',
          subFiles: [],
        });
      } else {
        this.log('error', `העברת ${task.name} נכשלה (קוד: ${code})`);
        this.onProgressCallback?.({
          id: task.id,
          status: 'failed',
          error: `קוד יציאה ${code}`,
          speed: '0 B/s',
          speedBytes: 0,
        });
      }
    });

    proc.on('error', (err) => {
      this.activeProcesses.delete(task.id);
      this.log('error', `שגיאת תהליך: ${err.message}`);
      this.onProgressCallback?.({
        id: task.id,
        status: 'failed',
        error: err.message,
      });
    });
  }

  private parseRcloneOutput(taskId: string, output: string) {
    const lines = output.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        if (json.stats) {
          const stats = json.stats;
          const bytes = stats.bytes || 0;
          const totalBytes = stats.totalBytes || 1;
          const percentage = Math.min(100, Math.round((bytes / totalBytes) * 100));
          const speedBytes = stats.speed || 0;
          const eta = stats.eta != null ? formatEtaHebrew(stats.eta) : '--';
          const transfersCount = stats.transfers || 0;
          const totalTransfersCount = stats.totalTransfers || 0;

          const subFiles: TransferSubFile[] = [];
          if (Array.isArray(stats.transferring)) {
            for (const f of stats.transferring) {
              subFiles.push({
                name: f.name || '',
                size: f.size || 0,
                transferred: f.bytes || 0,
                percentage: f.percentage || 0,
                speed: f.speed ? `${(f.speed / (1024 * 1024)).toFixed(2)} MB/s` : undefined,
                eta: f.eta != null ? formatEtaHebrew(f.eta) : undefined,
                status: 'transferring',
              });
            }
          }

          this.onProgressCallback?.({
            id: taskId,
            status: 'running',
            transferred: bytes,
            size: totalBytes,
            percentage,
            speedBytes,
            speed: `${(speedBytes / (1024 * 1024)).toFixed(2)} MB/s`,
            eta,
            transfersCount,
            totalTransfersCount,
            subFiles,
          });
        }
      } catch {
        this.log('info', `[Rclone] ${line.trim()}`);
      }
    }
  }

  public pauseTransfer(taskId: string) {
    const proc = this.activeProcesses.get(taskId);
    if (proc && proc.kill) {
      proc.kill('SIGSTOP');
      this.onProgressCallback?.({ id: taskId, status: 'paused', speed: '0 B/s', speedBytes: 0 });
      this.log('info', `משימה הושהתה: ${taskId}`);
    }
  }

  public resumeTransfer(taskId: string) {
    const proc = this.activeProcesses.get(taskId);
    if (proc && proc.kill) {
      proc.kill('SIGCONT');
      this.onProgressCallback?.({ id: taskId, status: 'running' });
      this.log('info', `משימה חודשה: ${taskId}`);
    }
  }

  public cancelTransfer(taskId: string) {
    const proc = this.activeProcesses.get(taskId);
    if (proc && proc.kill) {
      proc.kill('SIGTERM');
      this.activeProcesses.delete(taskId);
      this.onProgressCallback?.({ id: taskId, status: 'cancelled', speed: '0 B/s', speedBytes: 0 });
      this.log('warn', `משימה בוטלה: ${taskId}`);
    }
  }

  private guessMimeType(name: string): string {
    const ext = path.extname(name).toLowerCase();
    const map: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
    };
    return map[ext] || 'application/octet-stream';
  }
}
