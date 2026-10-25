# Reclone Pro ☁️

**Reclone Pro** is a high-performance, professional-grade desktop application for macOS inspired by **ForkLift** and **Air Explorer**, serving as a feature-rich, native GUI wrapper for [Rclone](https://rclone.org).

![Reclone Pro App Icon](./resources/icon.png)

---

## Features

### 🗂️ Dual-Pane Split View File Explorer
- **Toggleable Side-by-Side Dual View**: Compare Remote Cloud vs. Local Mac or Remote vs. Remote.
- **View Mode Switcher**: Dense Table List View with metadata (Name, Size, Type, Date Modified) and Grid/Card View.
- **Dynamic File Operations**: Real-time search filtering, sortable column headers, clickable breadcrumbs, folder creation (`mkdir`), item deletion, and multi-selection.
- **Drag & Drop Transfers**: Drag files across panes or click **Copy** to initiate transfers with automatic destination resolution.

### 🌐 Remote Cloud Management
- Auto-detects configured Rclone remotes (`rclone listremotes`) including Google Drive, OneDrive, Amazon S3, Dropbox, Box, WebDAV, SFTP, etc.
- Native, high-performance Local Mac file browser integration with system directory navigation.
- Status indicators and built-in simulation fallback mode when Rclone CLI is not yet installed.

### ⚡ Live Transfer Queue & Speed Manager (Bottom Panel)
- Real-time aggregate throughput counter (e.g. `45.2 MB/s`) with live pulse indicator.
- Per-file progress bars, percentage, transferred/total bytes, speed, and dynamic ETA estimation.
- Interactive individual controls: **Pause**, **Resume**, and **Cancel** transfers.
- Batch queue management: **Pause All**, **Resume All**, and **Clear Done**.

### ⚙️ Performance & Bandwidth Controls (Settings)
- Parallel Transfers Slider (`--transfers` from 1 to 16 workers).
- Bandwidth Limiter (`--bwlimit` options: Unlimited, 5MB/s, 10MB/s, 20MB/s, 50MB/s, 100MB/s).
- Checkers tuning (`--checkers` from 1 to 32).
- Fast-List directory scan toggle (`--fast-list`).
- Rclone executable path locator with one-click **Auto Detect**.
- Integrated Terminal Activity Log drawer for raw CLI output and error debugging.

---

## Getting Started

### Development Mode
```bash
npm run dev
```
Starts Vite dev server with Hot Module Replacement (HMR) and opens the frameless macOS Electron window.

### Build Standalone macOS `.app`
```bash
npm run package:app
```
Builds the completely self-contained `.app` executable inside `release/mac-arm64/Reclone Pro.app`. It requires **no background dev server** or node process to run.

To launch the compiled app:
```bash
open "release/mac-arm64/Reclone Pro.app"
```

### Build DMG Installer
```bash
npm run package:mac
```

---

## 🍏 macOS Gatekeeper ("File is Damaged" Warning)

Because Reclone Pro is an open-source project and not signed with an expensive Apple Developer ID certificate, macOS Gatekeeper may show a warning:
> *"Reclone Pro is damaged and can't be opened. You should move it to the Trash."*

You can easily bypass this in one of two ways:

### Option 1: Right-Click (Finder)
1. In `/Applications`, **Right-Click** (or `Control` + Click) on **Reclone Pro.app**.
2. Select **Open** from the context menu.
3. In the dialog that appears, click **Open** to confirm.

### Option 2: Terminal Command
Run the following command in Terminal to clear Apple's quarantine flag:
```bash
sudo xattr -cr /Applications/Reclone\ Pro.app
```

---

## Tech Stack
- **Desktop Runtime**: Electron 33 (Main/Preload/IPC Architecture with macOS `hiddenInset` Title Bar)
- **Frontend Framework**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS with shadcn/ui design tokens (`#0a0a0c` dark mode + Apple San Francisco typography)
- **Icons**: Lucide React
- **Packaging**: electron-builder
- **Rclone Engine**: Node.js `child_process` (`spawn` / `exec`) with real-time stats streaming and local filesystem fallback
