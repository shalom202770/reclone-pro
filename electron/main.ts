import { app, BrowserWindow, ipcMain, shell, Menu, protocol, net, Notification } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { execFile, exec, spawn } from 'child_process';
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import { promisify } from 'util';
const execAsync = promisify(exec);
import { RcloneManager } from './rclone';
import type { TransferTask } from '../src/types';

// MUST be called before app 'ready' event
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-resource', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } },
]);

const systemPaths = [
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  '/usr/local/bin',
  '/Library/Frameworks/Python.framework/Versions/3.14/bin',
  '/Library/Frameworks/Python.framework/Versions/3.13/bin',
  '/Library/Frameworks/Python.framework/Versions/3.12/bin',
  `${os.homedir()}/.local/bin`,
  `${os.homedir()}/Library/Python/3.14/bin`,
  `${os.homedir()}/Library/Python/3.13/bin`,
  `${os.homedir()}/Library/Python/3.12/bin`,
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin',
];
process.env.PATH = `${systemPaths.join(':')}:${process.env.PATH || ''}`;

let mainWindow: BrowserWindow | null = null;
const rclone = new RcloneManager();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 480,
    minHeight: 380,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#120e0c',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  });

  // Wire up log, progress, and OAuth URL opener
  rclone.setCallbacks(
    (logEntry) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('rclone:log', {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          ...logEntry,
        });
      }
    },
    (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('rclone:transfer-progress', progress);
      }
    },
    (oauthUrl) => {
      // Automatically launch default browser for OAuth login
      shell.openExternal(oauthUrl);
    }
  );

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupMenu();
}

function setupMenu() {
  if (process.platform === 'darwin') {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Reclone Pro',
        submenu: [
          { role: 'about', label: 'אודות Reclone Pro' },
          { type: 'separator' },
          {
            label: 'הגדרות...',
            accelerator: 'CmdOrCtrl+,',
            click: () => mainWindow?.webContents.send('rclone:open-settings'),
          },
          { type: 'separator' },
          { role: 'hide', label: 'הסתר את Reclone Pro' },
          { role: 'hideOthers', label: 'הסתר אחרים' },
          { role: 'unhide', label: 'הצג הכל' },
          { type: 'separator' },
          { role: 'quit', label: 'יציאה' },
        ],
      },
      {
        label: 'עריכה',
        submenu: [
          { role: 'undo', label: 'בטל' },
          { role: 'redo', label: 'בצע שוב' },
          { type: 'separator' },
          { role: 'cut', label: 'גזור' },
          { role: 'copy', label: 'העתק' },
          { role: 'paste', label: 'הדבק' },
          { role: 'selectAll', label: 'בחר הכל' },
        ],
      },
      {
        label: 'תצוגה',
        submenu: [
          { role: 'reload', label: 'טען מחדש' },
          { role: 'forceReload', label: 'טעינה מאולצת' },
          { role: 'toggleDevTools', label: 'כלי פיתוח' },
          { type: 'separator' },
          { role: 'resetZoom', label: 'איפוס זום' },
          { role: 'zoomIn', label: 'הגדל' },
          { role: 'zoomOut', label: 'הקטן' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'מסך מלא' },
        ],
      },
      {
        label: 'חלון',
        submenu: [
          { role: 'minimize', label: 'מזער' },
          { role: 'zoom', label: 'הגדל' },
          { type: 'separator' },
          { role: 'front', label: 'הבא הכל לחזית' },
        ],
      },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }
}

// Window Management IPC Handlers
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.on('window:control', (_event, action) => {
  if (action === 'minimize') mainWindow?.minimize();
  if (action === 'maximize') {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  }
  if (action === 'close') mainWindow?.close();
});

// Remotes & Files IPC Handlers
ipcMain.handle('rclone:list-remotes', async () => {
  return await rclone.listRemotes();
});

ipcMain.handle('rclone:list-items', async (_event, { remote, path: dirPath, showHidden }) => {
  return await rclone.listItems(remote, dirPath, showHidden);
});

ipcMain.handle('rclone:get-storage-usage', async (_event, remote: string) => {
  return await rclone.getStorageUsage(remote);
});

ipcMain.handle('rclone:create-folder', async (_event, { remote, path: dirPath, folderName }) => {
  return await rclone.createDirectory(remote, dirPath, folderName);
});

ipcMain.handle('rclone:delete-item', async (_event, { remote, itemPath, isDir }) => {
  return await rclone.deleteItem(remote, itemPath, isDir);
});

ipcMain.handle('rclone:rename-item', async (_event, { remote, oldPath, newPath }) => {
  return await rclone.renameItem(remote, oldPath, newPath);
});

// Accounts & Config IPC Handlers
ipcMain.handle('rclone:create-remote', async (_event, { name, type, params }) => {
  return await rclone.createRemote(name, type, params);
});

ipcMain.handle('rclone:delete-remote', async (_event, name: string) => {
  return await rclone.deleteRemote(name);
});

ipcMain.handle('rclone:read-config', async () => {
  return await rclone.readConfigContent();
});

ipcMain.handle('rclone:write-config', async (_event, content: string) => {
  return await rclone.writeConfigContent(content);
});

ipcMain.handle('rclone:install-homebrew', async () => {
  return await rclone.installViaHomebrew();
});

// Transfers IPC Handlers
ipcMain.handle('rclone:start-transfer', async (_event, { task, settings }) => {
  rclone.startTransfer(task as TransferTask, settings);
  return true;
});

ipcMain.handle('rclone:pause-transfer', async (_event, taskId: string) => {
  rclone.pauseTransfer(taskId);
  return true;
});

ipcMain.handle('rclone:resume-transfer', async (_event, taskId: string) => {
  rclone.resumeTransfer(taskId);
  return true;
});

ipcMain.handle('rclone:cancel-transfer', async (_event, taskId: string) => {
  rclone.cancelTransfer(taskId);
  return true;
});

ipcMain.handle('rclone:get-settings', async () => {
  return rclone.getSettings();
});

ipcMain.handle('rclone:detect-path', async (_event, customPath?: string) => {
  return await rclone.detectRclonePath(customPath);
});

ipcMain.handle('shell:open-path', async (_event, { remote: rem, filePath }: { remote?: string; filePath: string }) => {
  let absPath = filePath;
  if (rem && !path.isAbsolute(filePath)) {
    absPath = path.join(rem === 'Local Mac' ? os.homedir() : rem, filePath);
  }
  await shell.openPath(absPath);
});

// Helper: locate executable binaries across system and package manager paths
function findExecutable(binName: string): string {
  const candidates = [
    `/opt/homebrew/bin/${binName}`,
    `/usr/local/bin/${binName}`,
    `/Library/Frameworks/Python.framework/Versions/3.14/bin/${binName}`,
    `/Library/Frameworks/Python.framework/Versions/3.13/bin/${binName}`,
    `/Library/Frameworks/Python.framework/Versions/3.12/bin/${binName}`,
    `${os.homedir()}/.local/bin/${binName}`,
    `${os.homedir()}/Library/Python/3.14/bin/${binName}`,
    `${os.homedir()}/Library/Python/3.13/bin/${binName}`,
    `${os.homedir()}/Library/Python/3.12/bin/${binName}`,
    `/usr/bin/${binName}`,
    `/bin/${binName}`,
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return binName;
}

// Helper: resolve relative paths for local remotes and clean up any UI prefix
function resolveLocalPath(filePath: string, remote?: string): string {
  // Strip Mac://, file://, or similar URI schemes completely
  let cleaned = (filePath || '').replace(/^(?:file|mac|local\s*mac):\/{0,3}/i, '/').replace(/^\/+/, '/');
  if (path.isAbsolute(cleaned)) return path.normalize(cleaned);
  if (remote === 'Local Mac') return path.normalize(path.join(os.homedir(), cleaned));
  if (remote && remote.startsWith('/')) return path.normalize(path.join(remote, cleaned));
  return path.normalize(path.join(os.homedir(), cleaned));
}

// --- MEDIA CONVERSION (ffmpeg) ---
ipcMain.handle('media:convert', async (_event, { inputPath, outputPath, preset, remote: rem }: { inputPath: string; outputPath: string; preset: 'mp4' | 'mp3' | 'web'; remote?: string }) => {
  const inAbs = resolveLocalPath(inputPath, rem);
  const outAbs = resolveLocalPath(outputPath, rem);
  const presets: Record<string, string[]> = {
    mp4: ['-i', inAbs, '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-c:a', 'aac', '-b:a', '192k', '-y', outAbs],
    mp3: ['-i', inAbs, '-vn', '-acodec', 'libmp3lame', '-b:a', '192k', '-y', outAbs],
    web: ['-i', inAbs, '-c:v', 'libx264', '-preset', 'medium', '-crf', '28', '-vf', 'scale=-2:720', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', outAbs],
  };
  const args = presets[preset];
  if (!args) return { success: false, error: 'Unknown preset' };
  try {
    const ffmpegBin = findExecutable('ffmpeg');
    await new Promise<void>((resolve, reject) => {
      execFile(ffmpegBin, args, { timeout: 600000 }, (err) => {
        if (err) reject(err); else resolve();
      });
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
});

// --- IMAGE CONVERSION (sips on macOS) ---
ipcMain.handle('image:convert', async (_event, { inputPath, targetFormat, remote: rem }: { inputPath: string; targetFormat: 'jpeg' | 'png'; remote?: string }) => {
  const inAbs = resolveLocalPath(inputPath, rem);
  const outExt = targetFormat === 'jpeg' ? '.jpg' : '.png';
  let outAbs = inAbs.replace(/\.[^.]+$/, '') + outExt;
  if (outAbs === inAbs) {
    outAbs = inAbs.replace(/\.[^.]+$/, '') + `_converted${outExt}`;
  }
  try {
    if (process.platform === 'darwin') {
      await execAsync(`/usr/bin/sips -s format ${targetFormat} "${inAbs}" --out "${outAbs}"`, { timeout: 60000 });
    } else {
      await execAsync(`ffmpeg -y -i "${inAbs}" "${outAbs}"`, { timeout: 60000 });
    }
    if (Notification.isSupported()) {
      new Notification({
        title: 'המרת תמונה הושלמה!',
        body: path.basename(outAbs),
      }).show();
    }
    return { success: true, outputPath: outAbs };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
});

// --- ARCHIVE COMPRESSION (zip) ---
ipcMain.handle('archive:compress', async (_event, { sourcePath, outputPath, remote: rem }: { sourcePath: string; outputPath: string; remote?: string }) => {
  const srcAbs = resolveLocalPath(sourcePath, rem);
  const outAbs = resolveLocalPath(outputPath, rem);
  try {
    const basename = path.basename(srcAbs);
    const parentDir = path.dirname(srcAbs);
    await execAsync(`cd "${parentDir}" && zip -r -q "${outAbs}" "${basename}"`, { timeout: 300000 });
    if (Notification.isSupported()) {
      new Notification({
        title: 'דחיסת ארכיון הושלמה!',
        body: path.basename(outAbs),
      }).show();
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
});

// --- ARCHIVE EXTRACTION ---
ipcMain.handle('archive:extract', async (_event, { archivePath, destDir, remote: rem }: { archivePath: string; destDir: string; remote?: string }) => {
  const arcAbs = resolveLocalPath(archivePath, rem);
  const dstAbs = resolveLocalPath(destDir, rem);
  const ext = path.extname(arcAbs).toLowerCase();
  try {
    if (!fs.existsSync(dstAbs)) {
      fs.mkdirSync(dstAbs, { recursive: true });
    }
    if (ext === '.zip') {
      await execAsync(`unzip -o -q "${arcAbs}" -d "${dstAbs}"`, { timeout: 300000 });
    } else if (ext === '.7z') {
      await execAsync(`7z x "${arcAbs}" -o"${dstAbs}" -y`, { timeout: 300000 });
    } else if (ext === '.rar') {
      await execAsync(`unrar x "${arcAbs}" "${dstAbs}/" -y`, { timeout: 300000 });
    } else if (ext === '.tar' || arcAbs.endsWith('.tar.gz') || ext === '.tgz') {
      await execAsync(`tar -xf "${arcAbs}" -C "${dstAbs}"`, { timeout: 300000 });
    } else {
      return { success: false, error: `Unsupported archive format: ${ext}` };
    }
    if (Notification.isSupported()) {
      new Notification({
        title: 'חילוץ ארכיון הושלם!',
        body: path.basename(arcAbs),
      }).show();
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
});

// --- HASH CHECKSUM (MD5 & SHA-256) ---
ipcMain.handle('file:checksum', async (_event, { filePath, algorithm, remote: rem }: { filePath: string; algorithm: 'md5' | 'sha256'; remote?: string }) => {
  const absPath = resolveLocalPath(filePath, rem);
  try {
    if (!fs.existsSync(absPath)) return { success: false, error: 'הקובץ אינו קיים' };
    const crypto = await import('crypto');
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(absPath);
    return new Promise((resolve) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve({ success: true, hash: hash.digest('hex'), algorithm }));
      stream.on('error', (err) => resolve({ success: false, error: err.message }));
    });
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
});

// --- GET INFO / METADATA ---
ipcMain.handle('file:metadata', async (_event, { filePath, remote: rem }: { filePath: string; remote?: string }) => {
  const isLocal = !rem || rem === 'Local Mac' || rem === 'local' || rem.startsWith('/');

  if (!isLocal) {
    try {
      const sizeInfo = await rclone.getPathSize(rem, filePath);
      const cleanName = filePath.split('/').filter(Boolean).pop() || filePath || rem;
      return {
        success: true,
        metadata: {
          path: `${rem}:${filePath}`,
          name: cleanName,
          isDir: true,
          size: sizeInfo.bytes,
          fileCount: sizeInfo.count,
          dirCount: 0,
          created: undefined,
          modified: undefined,
          permissions: 'Remote Storage',
        },
      };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  const absPath = resolveLocalPath(filePath, rem);
  try {
    if (!fs.existsSync(absPath)) return { success: false, error: 'הפריט לא נמצא' };
    const stat = fs.statSync(absPath);
    let totalFiles = 0;
    let totalDirs = 0;
    let totalSize = stat.size;

    if (stat.isDirectory()) {
      const walk = (dir: string) => {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const ent of entries) {
            const p = path.join(dir, ent.name);
            if (ent.isDirectory()) {
              totalDirs++;
              walk(p);
            } else if (ent.isFile()) {
              totalFiles++;
              try { totalSize += fs.statSync(p).size; } catch {}
            }
          }
        } catch {}
      };
      walk(absPath);
    }

    return {
      success: true,
      metadata: {
        path: absPath,
        name: path.basename(absPath),
        isDir: stat.isDirectory(),
        size: totalSize,
        fileCount: totalFiles,
        dirCount: totalDirs,
        created: stat.birthtime,
        modified: stat.mtime,
        accessed: stat.atime,
        permissions: (stat.mode & 0o777).toString(8),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
});

// --- MOVE MULTIPLE ITEMS (for New Folder with Selection) ---
ipcMain.handle('file:move-items', async (_event, { sourcePaths, targetDir, remote: rem }: { sourcePaths: string[]; targetDir: string; remote?: string }) => {
  const dstAbs = resolveLocalPath(targetDir, rem);
  try {
    if (!fs.existsSync(dstAbs)) fs.mkdirSync(dstAbs, { recursive: true });
    for (const src of sourcePaths) {
      const srcAbs = resolveLocalPath(src, rem);
      if (fs.existsSync(srcAbs)) {
        const destFile = path.join(dstAbs, path.basename(srcAbs));
        fs.renameSync(srcAbs, destFile);
      }
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
});

// --- DUPLICATE FINDER ---
ipcMain.handle('file:find-duplicates', async (_event, { dirPath, remote: rem }: { dirPath: string; remote?: string }) => {
  const targetDir = resolveLocalPath(dirPath, rem);
  try {
    if (!fs.existsSync(targetDir)) return { success: false, error: 'התיקייה לא קיימת' };
    const crypto = await import('crypto');
    const sizeMap = new Map<number, string[]>();

    const scan = (curr: string) => {
      try {
        const entries = fs.readdirSync(curr, { withFileTypes: true });
        for (const ent of entries) {
          const p = path.join(curr, ent.name);
          if (ent.isDirectory()) {
            scan(p);
          } else if (ent.isFile()) {
            try {
              const s = fs.statSync(p).size;
              if (s > 0) {
                const list = sizeMap.get(s) || [];
                list.push(p);
                sizeMap.set(s, list);
              }
            } catch {}
          }
        }
      } catch {}
    };
    scan(targetDir);

    const duplicateGroups: Array<{ hash: string; size: number; files: string[] }> = [];

    for (const [size, files] of sizeMap.entries()) {
      if (files.length > 1) {
        const hashMap = new Map<string, string[]>();
        for (const f of files) {
          try {
            const buf = Buffer.alloc(Math.min(size, 1024 * 1024));
            const fd = fs.openSync(f, 'r');
            fs.readSync(fd, buf, 0, buf.length, 0);
            fs.closeSync(fd);
            const h = crypto.createHash('md5').update(buf).digest('hex');
            const hList = hashMap.get(h) || [];
            hList.push(f);
            hashMap.set(h, hList);
          } catch {}
        }

        for (const [h, matchingFiles] of hashMap.entries()) {
          if (matchingFiles.length > 1) {
            duplicateGroups.push({ hash: h, size, files: matchingFiles });
          }
        }
      }
    }

    return { success: true, duplicates: duplicateGroups };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
});

const THUMB_CACHE_DIR = path.join(os.tmpdir(), 'reclone_thumbs');
try {
  if (!fs.existsSync(THUMB_CACHE_DIR)) {
    fs.mkdirSync(THUMB_CACHE_DIR, { recursive: true });
  }
} catch {}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi']);
const PDF_EXTS = new Set(['.pdf']);

function runCommandAsync(file: string, args: string[], timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(file, args, { timeout: timeoutMs }, (err) => {
      resolve(!err);
    });
  });
}

// Thumbnail: resolve local or remote file path to a protocol or preview URL
ipcMain.handle('rclone:get-thumbnail-url', async (_event, { remote, filePath, fileId }: { remote: string; filePath: string; fileId?: string }) => {
  const isLocal = remote === 'Local Mac' || remote.startsWith('/');

  // --- LOCAL FILES ---
  if (isLocal) {
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(remote === 'Local Mac' ? os.homedir() : remote, filePath);

    try {
      const stat = await fs.promises.stat(absPath);
      if (stat.isDirectory()) return null;

      const ext = path.extname(absPath).toLowerCase();

      // 1. Direct web-supported image formats
      if (IMAGE_EXTS.has(ext)) {
        return `local-resource://${encodeURIComponent(absPath)}`;
      }

      // Cache key based on path & mtime
      const hash = crypto.createHash('md5').update(`${absPath}:${stat.mtimeMs}`).digest('hex');

      // 2. Videos (.mp4, .mov, .m4v, .webm, etc.)
      if (VIDEO_EXTS.has(ext)) {
        const cachedJpg = path.join(THUMB_CACHE_DIR, `video_${hash}.jpg`);
        if (fs.existsSync(cachedJpg)) {
          return `local-resource://${encodeURIComponent(cachedJpg)}`;
        }

        // Try ffmpeg poster frame extraction (try 1s, fallback to 0s)
        let ok = await runCommandAsync('ffmpeg', [
          '-y', '-ss', '00:00:01', '-i', absPath, '-vframes', '1', '-vf', 'scale=320:-1', '-update', '1', cachedJpg
        ]);

        if (!ok) {
          ok = await runCommandAsync('ffmpeg', [
            '-y', '-ss', '00:00:00', '-i', absPath, '-vframes', '1', '-vf', 'scale=320:-1', '-update', '1', cachedJpg
          ]);
        }

        // Fallback to macOS qlmanage if ffmpeg is unavailable or fails
        if (!ok && process.platform === 'darwin') {
          const qlOk = await runCommandAsync('/usr/bin/qlmanage', ['-t', '-s', '320', '-o', THUMB_CACHE_DIR, absPath]);
          if (qlOk) {
            const qlGenerated = path.join(THUMB_CACHE_DIR, `${path.basename(absPath)}.png`);
            if (fs.existsSync(qlGenerated)) {
              try {
                await fs.promises.rename(qlGenerated, cachedJpg);
                ok = true;
              } catch {
                return `local-resource://${encodeURIComponent(qlGenerated)}`;
              }
            }
          }
        }

        if (ok && fs.existsSync(cachedJpg)) {
          return `local-resource://${encodeURIComponent(cachedJpg)}`;
        }
        return null;
      }

      // 3. PDFs (.pdf) -> first page preview using macOS qlmanage
      if (PDF_EXTS.has(ext)) {
        const cachedPdfThumb = path.join(THUMB_CACHE_DIR, `pdf_${hash}.png`);
        if (fs.existsSync(cachedPdfThumb)) {
          return `local-resource://${encodeURIComponent(cachedPdfThumb)}`;
        }

        if (process.platform === 'darwin') {
          const qlOk = await runCommandAsync('/usr/bin/qlmanage', ['-t', '-s', '320', '-o', THUMB_CACHE_DIR, absPath]);
          if (qlOk) {
            const qlGenerated = path.join(THUMB_CACHE_DIR, `${path.basename(absPath)}.png`);
            if (fs.existsSync(qlGenerated)) {
              try {
                await fs.promises.rename(qlGenerated, cachedPdfThumb);
                return `local-resource://${encodeURIComponent(cachedPdfThumb)}`;
              } catch {
                return `local-resource://${encodeURIComponent(qlGenerated)}`;
              }
            }
          }
        }
        return null;
      }

      // 4. Apple HEIC / HEIF images
      if (ext === '.heic' || ext === '.heif') {
        const cachedHeic = path.join(THUMB_CACHE_DIR, `heic_${hash}.jpg`);
        if (fs.existsSync(cachedHeic)) {
          return `local-resource://${encodeURIComponent(cachedHeic)}`;
        }
        if (process.platform === 'darwin') {
          const ok = await runCommandAsync('/usr/bin/sips', ['-s', 'format', 'jpeg', absPath, '--out', cachedHeic]);
          if (ok && fs.existsSync(cachedHeic)) {
            return `local-resource://${encodeURIComponent(cachedHeic)}`;
          }
        }
        return null;
      }

      return null;
    } catch {
      return null;
    }
  }

  // --- CLOUD / REMOTE FILES (e.g. Google Drive) ---
  const cloudKey = fileId
    ? `cloud_${fileId.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    : `cloud_${crypto.createHash('md5').update(`${remote}:${filePath}`).digest('hex')}`;
  const cloudCachedJpg = path.join(THUMB_CACHE_DIR, `${cloudKey}.jpg`);

  if (fs.existsSync(cloudCachedJpg)) {
    return `local-resource://${encodeURIComponent(cloudCachedJpg)}`;
  }

  try {
    const remoteConf = await rclone.getRemoteConfig(remote);
    if (remoteConf && remoteConf.type === 'drive') {
      let accessToken = '';
      if (remoteConf.token) {
        try {
          const parsed = JSON.parse(remoteConf.token);
          accessToken = parsed.access_token || '';
        } catch {}
      }

      let targetId = fileId ? fileId.split('\t')[0].trim() : undefined;
      if (!targetId && remote && filePath) {
        try {
          const rclonePath = rclone.getRcloneInfo().rclonePath || 'rclone';
          const { stdout } = await execAsync(`"${rclonePath}" lsjson "${remote}:${filePath}"`, { env: process.env });
          const items = JSON.parse(stdout);
          if (items && items[0]?.ID) targetId = items[0].ID.split('\t')[0].trim();
        } catch {}
      }

      if (targetId && accessToken) {
        try {
          const apiRes = await fetch(`https://www.googleapis.com/drive/v3/files/${targetId}?fields=id,thumbnailLink`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (apiRes.ok) {
            const data = (await apiRes.json()) as any;
            if (data.thumbnailLink) {
              const highRes = data.thumbnailLink.replace(/=s\d+/, '=s320');
              // Download and cache locally for instant access & offline use
              try {
                const imgRes = await fetch(highRes);
                if (imgRes.ok) {
                  const buf = Buffer.from(await imgRes.arrayBuffer());
                  await fs.promises.writeFile(cloudCachedJpg, buf);
                  return `local-resource://${encodeURIComponent(cloudCachedJpg)}`;
                }
              } catch {}
              return highRes;
            }
          }
        } catch {}
      }
    }

    // Direct image copy cache fallback for other cloud providers
    const ext = path.extname(filePath).toLowerCase();
    if (IMAGE_EXTS.has(ext)) {
      const rclonePath = rclone.getRcloneInfo().rclonePath || 'rclone';
      const ok = await runCommandAsync(rclonePath, ['copyto', `${remote}:${filePath}`, cloudCachedJpg], 6000);
      if (ok && fs.existsSync(cloudCachedJpg)) {
        return `local-resource://${encodeURIComponent(cloudCachedJpg)}`;
      }
    }
  } catch {}

  return null;
});

app.whenReady().then(() => {
  // Register protocol handler for local file access with safe URL conversion
  protocol.handle('local-resource', (request) => {
    const raw = request.url.replace('local-resource://', '');
    const filePath = decodeURIComponent(raw);
    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
