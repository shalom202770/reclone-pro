import React, { useState } from 'react';
import { 
  X, 
  Sliders, 
  Cpu, 
  Gauge, 
  FolderSearch, 
  CheckCircle, 
  AlertTriangle, 
  Terminal, 
  Zap,
  Info,
  ShieldCheck,
  Download,
  Upload,
  Layers,
  Palette,
  User,
  Mail,
  ExternalLink
} from 'lucide-react';
import type { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (newSettings: Partial<AppSettings>) => void;
  onDetectRclone: (path?: string) => Promise<{ detected: boolean; path: string; version: string; configPath: string }>;
  onInstallHomebrew?: () => Promise<{ success: boolean; message: string }>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
  onDetectRclone,
  onInstallHomebrew,
}) => {
  const [rclonePath, setRclonePath] = useState(settings.rclonePath || 'rclone');
  const [transfers, setTransfers] = useState(settings.transfers || 4);
  const [checkers, setCheckers] = useState(settings.checkers || 8);
  const [retries, setRetries] = useState(settings.retries || 3);
  const [bwlimitDownload, setBwlimitDownload] = useState(settings.bwlimitDownload || 'Unlimited');
  const [bwlimitUpload, setBwlimitUpload] = useState(settings.bwlimitUpload || 'Unlimited');
  const [checksum, setChecksum] = useState(settings.checksum ?? true);
  const [fastList, setFastList] = useState(settings.fastList ?? true);
  const [showHiddenFiles, setShowHiddenFiles] = useState(settings.showHiddenFiles ?? false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installMsg, setInstallMsg] = useState<string | null>(null);

  const [theme, setTheme] = useState(settings.theme || 'warm');
  const [customColors, setCustomColors] = useState(settings.customTheme || {
    accent: '#d97706',
    accentHover: '#b45309',
    background: '#120e0c',
    surface: '#1c1714',
    surfaceMuted: '#171310',
    border: '#2d2420',
    text: '#f3ece7',
  });
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(settings.autoBackupEnabled ?? false);
  const [autoBackupInterval, setAutoBackupInterval] = useState(settings.autoBackupIntervalHours || 24);
  const [autoBackupSource, setAutoBackupSource] = useState(settings.autoBackupSource || '');

  const [detectionResult, setDetectionResult] = useState<{
    detected: boolean;
    version: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleDetect = async () => {
    setIsDetecting(true);
    try {
      const res = await onDetectRclone(rclonePath !== 'rclone' ? rclonePath : undefined);
      setDetectionResult({
        detected: res.detected,
        version: res.version,
      });
      if (res.detected) {
        setRclonePath(res.path);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleBrewInstall = async () => {
    if (!onInstallHomebrew) return;
    setIsInstalling(true);
    setInstallMsg('מתקין את Rclone דרך Homebrew ברקע...');
    try {
      const res = await onInstallHomebrew();
      setInstallMsg(res.message);
      if (res.success) {
        handleDetect();
      }
    } catch (e: any) {
      setInstallMsg(`נכשל: ${e.message}`);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleSave = () => {
    onSave({
      rclonePath,
      transfers,
      checkers,
      retries,
      checksum,
      bwlimitDownload,
      bwlimitUpload,
      fastList,
      showHiddenFiles,
      theme,
      customTheme: customColors,
      autoBackupEnabled,
      autoBackupIntervalHours: autoBackupInterval,
      autoBackupSource,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-subtle animate-in fade-in duration-150 select-none text-right">
      <div className="w-[560px] max-h-[85vh] rounded-2xl bg-surface border border-surface-border shadow-popover overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between bg-surface-muted">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="w-8 h-8 rounded-lg bg-surface border border-surface-border flex items-center justify-center text-mac-accent">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">הגדרות מתקדמות ומנוע Rclone</h2>
              <p className="text-[11px] text-gray-400">ניהול נתיב בינארי, הגבלות מהירות, סנכרון ואבטחה</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-surface-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Section: Rclone Executable */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>מיקום קובץ ההרצה של Rclone (Binary)</span>
              {settings.rcloneDetected ? (
                <span className="text-[10px] font-sans text-mac-success bg-mac-success/20 px-2 py-0.5 rounded-full">
                  מנוע זוהה ופעיל
                </span>
              ) : (
                <span className="text-[10px] font-sans text-mac-danger bg-mac-danger/20 px-2 py-0.5 rounded-full">
                  לא זוהה במערכת
                </span>
              )}
            </label>

            <div className="flex items-center space-x-2 space-x-reverse">
              <input
                type="text"
                value={rclonePath}
                onChange={(e) => setRclonePath(e.target.value)}
                placeholder="/opt/homebrew/bin/rclone או rclone"
                dir="ltr"
                className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg bg-surface-muted border border-surface-border text-foreground focus:border-mac-accent"
              />
              <button
                type="button"
                onClick={handleDetect}
                disabled={isDetecting}
                className="px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-xs font-medium text-gray-200 hover:text-white hover:bg-surface-hover transition-colors"
              >
                {isDetecting ? 'בודק...' : 'זיהוי אוטומטי'}
              </button>
            </div>

            {/* Homebrew install button if missing */}
            {!settings.rcloneDetected && (
              <div className="p-3 rounded-xl bg-surface-muted border border-surface-border space-y-2">
                <div className="flex items-start space-x-2.5 space-x-reverse text-xs text-gray-300">
                  <Info className="w-4 h-4 text-mac-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Rclone אינו מותקן במחשב שלך</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      ניתן להתקין אותו בלחיצה אחת באמצעות מנהל החבילות Homebrew.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse pt-1">
                  <button
                    type="button"
                    onClick={handleBrewInstall}
                    disabled={isInstalling}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-mac-accent hover:bg-mac-accentHover text-white shadow-sm transition-colors"
                  >
                    {isInstalling ? 'מתקין כעת...' : 'התקן עכשיו דרך Homebrew'}
                  </button>
                  {installMsg && (
                    <span className="text-[11px] text-gray-300 font-mono truncate">{installMsg}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-surface-border/60" />

          {/* Section: Bandwidth limits */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-foreground">
              הגבלות רוחב פס ומהירות העברה (--bwlimit)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 flex items-center space-x-1 space-x-reverse">
                  <Download className="w-3.5 h-3.5 text-mac-cyan" />
                  <span>מגבלת הורדה (Download)</span>
                </label>
                <select
                  value={bwlimitDownload}
                  onChange={(e) => setBwlimitDownload(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface-muted border border-surface-border text-foreground"
                >
                  <option value="Unlimited">ללא הגבלה (מהירות מקסימלית)</option>
                  <option value="5M">5 MB/s</option>
                  <option value="10M">10 MB/s</option>
                  <option value="25M">25 MB/s</option>
                  <option value="50M">50 MB/s</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 flex items-center space-x-1 space-x-reverse">
                  <Upload className="w-3.5 h-3.5 text-mac-warning" />
                  <span>מגבלת העלאה (Upload)</span>
                </label>
                <select
                  value={bwlimitUpload}
                  onChange={(e) => setBwlimitUpload(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface-muted border border-surface-border text-foreground"
                >
                  <option value="Unlimited">ללא הגבלה (מהירות מקסימלית)</option>
                  <option value="2M">2 MB/s</option>
                  <option value="5M">5 MB/s</option>
                  <option value="10M">10 MB/s</option>
                  <option value="20M">20 MB/s</option>
                </select>
              </div>
            </div>
          </div>

          <div className="h-px bg-surface-border/60" />

          {/* Section: Engine Performance Tuning */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-foreground">
              כוונון מקביליות ומנגנוני שחזור שגיאות
            </h3>

            {/* Parallel transfers */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">העברות קבצים מקביליות (--transfers)</span>
                <span className="font-mono text-mac-accent font-semibold px-2 py-0.5 rounded bg-mac-accent/15">
                  {transfers} תהליכים
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="16"
                step="1"
                value={transfers}
                onChange={(e) => setTransfers(parseInt(e.target.value, 10))}
                className="w-full accent-mac-accent cursor-pointer h-1.5 bg-surface-muted rounded-lg appearance-none"
              />
            </div>

            {/* Checkers */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">בודקי השוואת קבצים מקביליים (--checkers)</span>
                <span className="font-mono text-gray-300 font-semibold px-2 py-0.5 rounded bg-surface-muted">
                  {checkers} בודקים
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="32"
                step="1"
                value={checkers}
                onChange={(e) => setCheckers(parseInt(e.target.value, 10))}
                className="w-full accent-mac-accent cursor-pointer h-1.5 bg-surface-muted rounded-lg appearance-none"
              />
            </div>

            {/* Retries */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">מספר נסיונות חוזרים בעת כשלון (--retries)</span>
                <span className="font-mono text-gray-300 font-semibold px-2 py-0.5 rounded bg-surface-muted">
                  {retries} נסיונות
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={retries}
                onChange={(e) => setRetries(parseInt(e.target.value, 10))}
                className="w-full accent-mac-accent cursor-pointer h-1.5 bg-surface-muted rounded-lg appearance-none"
              />
            </div>

            {/* Integrity verification (--checksum) */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs font-semibold text-gray-200 block flex items-center space-x-1.5 space-x-reverse">
                  <ShieldCheck className="w-3.5 h-3.5 text-mac-success" />
                  <span>אימות שלמות קבצים באמצעות Checksum (--checksum)</span>
                </span>
                <span className="text-[10px] text-gray-500">
                  בודק גיבוב (Hash) של הקבצים לאחר העברה להבטחת שלמות המידע ללא פגמים.
                </span>
              </div>
              <input
                type="checkbox"
                checked={checksum}
                onChange={(e) => setChecksum(e.target.checked)}
                className="w-4 h-4 rounded text-mac-accent bg-surface-muted border-surface-border accent-mac-accent cursor-pointer"
              />
            </div>
          </div>

          {/* Section: Dual Theme Sets (Amber vs Mac Blue) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground flex items-center space-x-1.5 space-x-reverse">
                <Palette className="w-3.5 h-3.5 text-mac-accent" />
                <span>ערכות עיצוב (Themes)</span>
              </h3>
              <button
                type="button"
                onClick={() => setTheme('custom')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 space-x-reverse border ${
                  theme === 'custom'
                    ? 'border-mac-accent bg-mac-accent/15 text-mac-accent ring-1 ring-mac-accent'
                    : 'border-surface-border bg-surface-muted text-gray-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-blue-500" />
                <span>מותאם אישית (Custom)</span>
              </button>
            </div>

            {/* Group 1: Original Amber/Orange Folder Themes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
                <span className="flex items-center space-x-1.5 space-x-reverse">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  <span>סדרה 1: מקורי ענבר וזהב (Original Amber / Orange Folders)</span>
                </span>
                <span className="text-[10px] text-gray-500">תיקיות והדגשות זהב</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'warm', label: 'חם (Warm)', desc: 'ספיה / ענבר וזהב', color: 'bg-[#d97706]' },
                  { id: 'dark', label: 'כהה (Dark)', desc: 'שחור ומסגרות ענבר', color: 'bg-[#09090b]' },
                  { id: 'light', label: 'בהיר (Light)', desc: 'אפור רך וענבר', color: 'bg-[#f5f5f7]' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id as any)}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between h-20 ${
                      theme === t.id
                        ? 'border-mac-accent bg-mac-accent/10 ring-1 ring-mac-accent/40 text-foreground'
                        : 'border-surface-border bg-surface-muted/60 text-gray-400 hover:text-white hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs">{t.label}</span>
                      <span className={`w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs ${t.color}`} />
                    </div>
                    <span className="text-[10px] text-gray-400">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Group 2: Full macOS Blue Theme */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
                <span className="flex items-center space-x-1.5 space-x-reverse">
                  <span className="w-2 h-2 rounded-full bg-[#007aff] inline-block" />
                  <span>סדרה 2: macOS מלא (Full Mac Theme - Blue Folders & Accents)</span>
                </span>
                <span className="text-[10px] text-gray-500">תיקיות + מסגרות כחולות</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'warm-mac', label: 'חם Mac (Warm)', desc: 'ספיה חמימה, הדגשות ותיקיות כחולות', color: 'bg-[#007aff]' },
                  { id: 'dark-mac', label: 'כהה Mac (Dark)', desc: 'שחור, הדגשות ותיקיות כחולות', color: 'bg-[#007aff]' },
                  { id: 'light-mac', label: 'בהיר Mac (Light)', desc: 'אפור רך, הדגשות ותיקיות כחולות', color: 'bg-[#007aff]' },
                ].map((t) => {
                  const isSelected = theme === t.id || (t.id === 'dark-mac' && theme === 'macos');
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id as any)}
                      className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between h-20 ${
                        isSelected
                          ? 'border-mac-accent bg-mac-accent/10 ring-1 ring-mac-accent/40 text-foreground'
                          : 'border-surface-border bg-surface-muted/60 text-gray-400 hover:text-white hover:bg-surface-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-xs">{t.label}</span>
                        <span className={`w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs ${t.color}`} />
                      </div>
                      <span className="text-[10px] text-gray-400">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group 3: Hybrid macOS Folder Set (Standard UI frames, only folders blue) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
                <span className="flex items-center space-x-1.5 space-x-reverse">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-500 to-blue-500 inline-block" />
                  <span>סדרה 3: משולב (Hybrid - Standard UI + macOS Blue Folders)</span>
                </span>
                <span className="text-[10px] text-gray-500">רק התיקיות כחולות</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'warm-blue-folders', label: 'חם + תיקיות Mac', desc: 'מסגרות ענבר מקוריות עם תיקיות כחולות', color: 'bg-gradient-to-b from-amber-500 to-[#007aff]' },
                  { id: 'dark-blue-folders', label: 'כהה + תיקיות Mac', desc: 'מסגרות כהות מקוריות עם תיקיות כחולות', color: 'bg-gradient-to-b from-zinc-700 to-[#007aff]' },
                  { id: 'light-blue-folders', label: 'בהיר + תיקיות Mac', desc: 'מסגרות בהירות מקוריות עם תיקיות כחולות', color: 'bg-gradient-to-b from-slate-300 to-[#007aff]' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id as any)}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between h-20 ${
                      theme === t.id
                        ? 'border-mac-accent bg-mac-accent/10 ring-1 ring-mac-accent/40 text-foreground'
                        : 'border-surface-border bg-surface-muted/60 text-gray-400 hover:text-white hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs">{t.label}</span>
                      <span className={`w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs ${t.color}`} />
                    </div>
                    <span className="text-[10px] text-gray-400">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Pickers (Visible when custom theme is selected) */}
            {theme === 'custom' && (
              <div className="p-3.5 rounded-xl bg-surface-muted border border-surface-border space-y-3">
                <span className="text-xs font-semibold text-gray-200 block">
                  התאמת צבעים אישית (Custom Palette)
                </span>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-surface-border">
                    <span className="text-gray-300">צבע הדגשה ראשי (Light Orange):</span>
                    <input
                      type="color"
                      value={customColors.accent}
                      onChange={(e) => setCustomColors({ ...customColors, accent: e.target.value })}
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-surface-border">
                    <span className="text-gray-300">צבע הדגשה משני (Dark Orange):</span>
                    <input
                      type="color"
                      value={customColors.accentHover}
                      onChange={(e) => setCustomColors({ ...customColors, accentHover: e.target.value })}
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-surface-border">
                    <span className="text-gray-300">צבע רקע (Background):</span>
                    <input
                      type="color"
                      value={customColors.background}
                      onChange={(e) => setCustomColors({ ...customColors, background: e.target.value })}
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-surface-border">
                    <span className="text-gray-300">צבע מסגרות (Border):</span>
                    <input
                      type="color"
                      value={customColors.border}
                      onChange={(e) => setCustomColors({ ...customColors, border: e.target.value })}
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-surface-border/60" />

          {/* Section: Automatic Backups */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-foreground flex items-center space-x-1.5 space-x-reverse">
                  <Zap className="w-3.5 h-3.5 text-mac-warning" />
                  <span>גיבוי אוטומטי מתוזמן ברקע (Auto-Backup)</span>
                </h3>
                <span className="text-[10px] text-gray-500">
                  סנכרון מחזורי של תיקייה מקומית ליעד ענן מוגדר באמצעות Rclone
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoBackupEnabled}
                onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-mac-accent bg-surface-muted border-surface-border accent-mac-accent cursor-pointer"
              />
            </div>

            {autoBackupEnabled && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-muted border border-surface-border">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-300">תדירות גיבוי:</label>
                  <select
                    value={autoBackupInterval}
                    onChange={(e) => setAutoBackupInterval(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-surface-border text-foreground"
                  >
                    <option value={1}>כל שעה</option>
                    <option value={6}>כל 6 שעות</option>
                    <option value={12}>כל 12 שעות</option>
                    <option value={24}>פעם ביום (24 שעות)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-300">תיקיית מקור לגיבוי:</label>
                  <input
                    type="text"
                    placeholder="נתיב מקומי (/Users/...)"
                    value={autoBackupSource}
                    onChange={(e) => setAutoBackupSource(e.target.value)}
                    dir="ltr"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-surface-border text-foreground"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-surface-border/60" />

          {/* Section: Developer Credits / About */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-surface-muted/90 to-surface/80 border border-surface-border shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="w-8 h-8 rounded-xl bg-mac-accent/15 border border-mac-accent/30 flex items-center justify-center text-mac-accent">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">אודות המפתח (Developer Credits)</h3>
                  <p className="text-[10px] text-gray-400">פיתוח והתאמת ממשק Reclone Pro</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-mac-accent/10 text-mac-accent border border-mac-accent/20">
                v1.0.0 Pro
              </span>
            </div>

            <div className="p-3 rounded-xl bg-surface/80 border border-surface-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-semibold text-foreground flex items-center space-x-1.5 space-x-reverse">
                  <span>שלום קריפור</span>
                  <span className="text-[11px] font-normal text-gray-400">(Shalom Kripor)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 font-medium">
                    תמיד עוזר
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 space-x-reverse text-[11px] text-gray-300">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <a
                    href="mailto:shalom202770@gmail.com"
                    className="hover:text-mac-accent transition-colors font-mono"
                    dir="ltr"
                  >
                    shalom202770@gmail.com
                  </a>
                </div>
              </div>

              <a
                href="https://mitmachim.top/user/%D7%AA%D7%9E%D7%99%D7%93-%D7%A2%D7%95%D7%96%D7%A8"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-1.5 space-x-reverse px-3 py-1.5 rounded-lg text-xs font-semibold bg-mac-accent text-white hover:bg-mac-accentHover transition-colors shadow-xs hover:shadow"
              >
                <span>פרופיל ב-Mitmachim Top</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border bg-surface-muted flex items-center justify-end space-x-2 space-x-reverse">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-surface-hover"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-mac-accent hover:bg-mac-accentHover text-white shadow-sm"
          >
            החל שינויים
          </button>
        </div>
      </div>
    </div>
  );
};
