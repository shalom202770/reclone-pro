import React, { useState } from 'react';
import { 
  X, 
  Sliders, 
  Terminal, 
  Zap,
  Info,
  ShieldCheck,
  Download,
  Upload,
  Palette,
  User,
  Mail,
  ExternalLink,
  Languages,
  Type,
  Globe,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  ArrowDownCircle
} from 'lucide-react';
import type { AppSettings } from '../types';
import { useTranslation, AVAILABLE_FONTS } from '../i18n/context';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (newSettings: Partial<AppSettings>) => void;
  onDetectRclone: (path?: string) => Promise<{ detected: boolean; path: string; version: string; configPath: string }>;
  onInstallHomebrew?: () => Promise<{ success: boolean; message: string }>;
  onInstallWindows?: () => Promise<{ success: boolean; message: string; path?: string }>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
  onDetectRclone,
  onInstallHomebrew,
  onInstallWindows,
}) => {
  const { t, language, setLanguage, font, setFont, dir, isRtl } = useTranslation();

  const [rclonePath, setRclonePath] = useState(settings.rclonePath || 'rclone');
  const [transfers, setTransfers] = useState(settings.transfers || 4);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<{
    checked: boolean;
    isNewer: boolean;
    latestVersion?: string;
    downloadUrl?: string;
    releaseNotes?: string;
    error?: string;
  } | null>(null);

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) return;
    setCheckingUpdate(true);
    setUpdateResult(null);
    try {
      const res = await window.electronAPI.checkForUpdates();
      setUpdateResult({
        checked: true,
        isNewer: res.isNewer,
        latestVersion: res.latestVersion,
        downloadUrl: res.downloadUrl,
        releaseNotes: res.releaseNotes,
        error: res.error,
      });
    } catch (err: any) {
      setUpdateResult({
        checked: true,
        isNewer: false,
        error: err?.message || 'שגיאה בבדיקת עדכונים',
      });
    } finally {
      setCheckingUpdate(false);
    }
  };
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

  const handleOpenExternal = (url: string) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

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
    setInstallMsg(t('settings.brewInstalling', 'מתקין את Rclone דרך Homebrew ברקע...'));
    try {
      const res = await onInstallHomebrew();
      setInstallMsg(res.message);
      if (res.success) {
        handleDetect();
      }
    } catch (e: any) {
      setInstallMsg(`Error: ${e.message}`);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleWindowsInstall = async () => {
    if (!onInstallWindows) return;
    setIsInstalling(true);
    setInstallMsg(t('settings.winInstalling', 'מוריד ומגדיר את Rclone ברקע...'));
    try {
      const res = await onInstallWindows();
      setInstallMsg(res.message);
      if (res.success) {
        if (res.path) setRclonePath(res.path);
        handleDetect(res.path);
      }
    } catch (e: any) {
      setInstallMsg(`Error: ${e.message}`);
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
      language,
      fontFamily: font,
      theme,
      customTheme: customColors,
      autoBackupEnabled,
      autoBackupIntervalHours: autoBackupInterval,
      autoBackupSource,
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-subtle animate-in fade-in duration-150 select-none"
      dir={dir}
    >
      <div className={`w-[580px] max-h-[85vh] rounded-2xl bg-surface border border-surface-border shadow-popover overflow-hidden flex flex-col ${isRtl ? 'text-right' : 'text-left'}`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between bg-surface-muted">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="w-8 h-8 rounded-lg bg-surface border border-surface-border flex items-center justify-center text-mac-accent">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t('settings.title', 'הגדרות מתקדמות ומנוע Rclone')}</h2>
              <p className="text-[11px] text-gray-400">{t('settings.subtitle', 'ניהול נתיב בינארי, הגבלות מהירות, שפה, גופן ועיצוב')}</p>
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
          {/* Section: Language & Typography */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-foreground flex items-center space-x-1.5 space-x-reverse">
              <Languages className="w-3.5 h-3.5 text-mac-cyan" />
              <span>{t('settings.appearanceTitle', 'התאמה אישית, שפה וגופן ממשק')}</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-muted border border-surface-border">
              {/* Language Switcher Toggle */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-300 flex items-center space-x-1 space-x-reverse">
                  <Globe className="w-3.5 h-3.5 text-mac-accent" />
                  <span>{t('settings.languageLabel', 'שפת ממשק (Language)')}</span>
                </label>
                <div className="flex items-center space-x-1 space-x-reverse bg-surface p-1 rounded-lg border border-surface-border">
                  <button
                    type="button"
                    onClick={() => setLanguage('he')}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                      language === 'he'
                        ? 'bg-mac-accent text-white shadow-xs font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-surface-hover'
                    }`}
                  >
                    עברית (RTL)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                      language === 'en'
                        ? 'bg-mac-accent text-white shadow-xs font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-surface-hover'
                    }`}
                  >
                    English (LTR)
                  </button>
                </div>
              </div>

              {/* Font Selection Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-300 flex items-center space-x-1 space-x-reverse">
                  <Type className="w-3.5 h-3.5 text-mac-warning" />
                  <span>{t('settings.fontLabel', 'גופן התוכנה (Font Family)')}</span>
                </label>
                <select
                  value={font}
                  onChange={(e) => setFont(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-surface-border text-foreground focus:border-mac-accent outline-none"
                >
                  {AVAILABLE_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="h-px bg-surface-border/60" />

          {/* Section: Rclone Executable */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>{t('settings.rcloneBinary', 'מיקום קובץ ההרצה של Rclone (Binary)')}</span>
              {settings.rcloneDetected ? (
                <span className="text-[10px] font-sans text-mac-success bg-mac-success/20 px-2 py-0.5 rounded-full">
                  {t('settings.engineActive', 'מנוע זוהה ופעיל')}
                </span>
              ) : (
                <span className="text-[10px] font-sans text-mac-danger bg-mac-danger/20 px-2 py-0.5 rounded-full">
                  {t('settings.engineNotFound', 'לא זוהה במערכת')}
                </span>
              )}
            </label>

            <div className="flex items-center space-x-2 space-x-reverse">
              <input
                type="text"
                value={rclonePath}
                onChange={(e) => setRclonePath(e.target.value)}
                placeholder={window.electronAPI?.isWindows ? 'C:\\...\\rclone.exe / rclone' : '/opt/homebrew/bin/rclone / rclone'}
                dir="ltr"
                className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg bg-surface-muted border border-surface-border text-foreground focus:border-mac-accent"
              />
              <button
                type="button"
                onClick={handleDetect}
                disabled={isDetecting}
                className="px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-xs font-medium text-gray-200 hover:text-white hover:bg-surface-hover transition-colors"
              >
                {isDetecting ? t('settings.detecting', 'בודק...') : t('settings.autoDetect', 'זיהוי אוטומטי')}
              </button>
            </div>

            {/* Install / Download button if missing */}
            {!settings.rcloneDetected && (
              <div className="p-3 rounded-xl bg-surface-muted border border-surface-border space-y-2">
                {window.electronAPI?.isWindows ? (
                  <>
                    <div className="flex items-start space-x-2.5 space-x-reverse text-xs text-gray-300">
                      <Info className="w-4 h-4 text-mac-accent shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground">{t('settings.winNotice', 'Rclone אינו מוגדר במחשב שלך')}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {t('settings.winDesc', 'ניתן להוריד ולהגדיר את Rclone הנייד הרשמי עבור Windows בלחיצה אחת.')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse pt-1">
                      <button
                        type="button"
                        onClick={handleWindowsInstall}
                        disabled={isInstalling}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-mac-accent hover:bg-mac-accentHover text-white shadow-sm transition-colors"
                      >
                        {isInstalling ? t('settings.winInstalling', 'מוריד ומגדיר את Rclone ברקע...') : t('settings.winInstall', 'הורד והגדר את Rclone (Windows)')}
                      </button>
                      {installMsg && (
                        <span className="text-[11px] text-gray-300 font-mono truncate">{installMsg}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start space-x-2.5 space-x-reverse text-xs text-gray-300">
                      <Info className="w-4 h-4 text-mac-accent shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground">{t('settings.brewNotice', 'Rclone אינו מותקן במחשב שלך')}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {t('settings.brewDesc', 'ניתן להתקין אותו בלחיצה אחת באמצעות מנהל החבילות Homebrew.')}
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
                        {isInstalling ? t('settings.brewInstalling', 'מתקין כעת...') : t('settings.brewInstall', 'התקן עכשיו דרך Homebrew')}
                      </button>
                      {installMsg && (
                        <span className="text-[11px] text-gray-300 font-mono truncate">{installMsg}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="h-px bg-surface-border/60" />

          {/* Section: Bandwidth limits */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-foreground">
              {t('settings.bwlimitTitle', 'הגבלות רוחב פס ומהירות העברה (--bwlimit)')}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 flex items-center space-x-1 space-x-reverse">
                  <Download className="w-3.5 h-3.5 text-mac-cyan" />
                  <span>{t('settings.bwlimitDownload', 'מגבלת הורדה (Download)')}</span>
                </label>
                <select
                  value={bwlimitDownload}
                  onChange={(e) => setBwlimitDownload(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface-muted border border-surface-border text-foreground"
                >
                  <option value="Unlimited">{t('common.unlimited', 'ללא הגבלה (מהירות מקסימלית)')}</option>
                  <option value="5M">5 MB/s</option>
                  <option value="10M">10 MB/s</option>
                  <option value="25M">25 MB/s</option>
                  <option value="50M">50 MB/s</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 flex items-center space-x-1 space-x-reverse">
                  <Upload className="w-3.5 h-3.5 text-mac-warning" />
                  <span>{t('settings.bwlimitUpload', 'מגבלת העלאה (Upload)')}</span>
                </label>
                <select
                  value={bwlimitUpload}
                  onChange={(e) => setBwlimitUpload(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface-muted border border-surface-border text-foreground"
                >
                  <option value="Unlimited">{t('common.unlimited', 'ללא הגבלה (מהירות מקסימלית)')}</option>
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
              {t('settings.concurrencyTitle', 'ביצועים, מנוע ומקביליות')}
            </h3>

            {/* Parallel transfers */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">{t('settings.maxTransfers', 'העברות מקביליות (--transfers)')}</span>
                <span className="font-mono text-mac-accent font-semibold px-2 py-0.5 rounded bg-mac-accent/15">
                  {transfers}
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
                <span className="text-gray-300">{t('settings.checkers', 'בודקי השוואת קבצים מקביליים (--checkers)')}</span>
                <span className="font-mono text-gray-300 font-semibold px-2 py-0.5 rounded bg-surface-muted">
                  {checkers}
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
                <span className="text-gray-300">{t('settings.retries', 'מספר נסיונות חוזרים בעת כשלון (--retries)')}</span>
                <span className="font-mono text-gray-300 font-semibold px-2 py-0.5 rounded bg-surface-muted">
                  {retries}
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
                <span className="text-xs font-semibold text-gray-200 flex items-center space-x-1.5 space-x-reverse">
                  <ShieldCheck className="w-3.5 h-3.5 text-mac-success" />
                  <span>{t('settings.checksumVerification', 'אימות שלמות קבצים באמצעות Checksum (--checksum)')}</span>
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

          {/* Section: Themes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground flex items-center space-x-1.5 space-x-reverse">
                <Palette className="w-3.5 h-3.5 text-mac-accent" />
                <span>{t('settings.themeLabel', 'ערכות עיצוב (Themes)')}</span>
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
                <span>{t('settings.themeCustom', 'מותאם אישית (Custom)')}</span>
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
                ].map((tItem) => (
                  <button
                    key={tItem.id}
                    type="button"
                    onClick={() => setTheme(tItem.id as any)}
                    className={`p-2.5 rounded-xl border ${isRtl ? 'text-right' : 'text-left'} transition-all flex flex-col justify-between h-20 ${
                      theme === tItem.id
                        ? 'border-mac-accent bg-mac-accent/10 ring-1 ring-mac-accent/40 text-foreground'
                        : 'border-surface-border bg-surface-muted/60 text-gray-400 hover:text-white hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs">{tItem.label}</span>
                      <span className={`w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs ${tItem.color}`} />
                    </div>
                    <span className="text-[10px] text-gray-400">{tItem.desc}</span>
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
                ].map((tItem) => {
                  const isSelected = theme === tItem.id || (tItem.id === 'dark-mac' && theme === 'macos');
                  return (
                    <button
                      key={tItem.id}
                      type="button"
                      onClick={() => setTheme(tItem.id as any)}
                      className={`p-2.5 rounded-xl border ${isRtl ? 'text-right' : 'text-left'} transition-all flex flex-col justify-between h-20 ${
                        isSelected
                          ? 'border-mac-accent bg-mac-accent/10 ring-1 ring-mac-accent/40 text-foreground'
                          : 'border-surface-border bg-surface-muted/60 text-gray-400 hover:text-white hover:bg-surface-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-xs">{tItem.label}</span>
                        <span className={`w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs ${tItem.color}`} />
                      </div>
                      <span className="text-[10px] text-gray-400">{tItem.desc}</span>
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
                ].map((tItem) => (
                  <button
                    key={tItem.id}
                    type="button"
                    onClick={() => setTheme(tItem.id as any)}
                    className={`p-2.5 rounded-xl border ${isRtl ? 'text-right' : 'text-left'} transition-all flex flex-col justify-between h-20 ${
                      theme === tItem.id
                        ? 'border-mac-accent bg-mac-accent/10 ring-1 ring-mac-accent/40 text-foreground'
                        : 'border-surface-border bg-surface-muted/60 text-gray-400 hover:text-white hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs">{tItem.label}</span>
                      <span className={`w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs ${tItem.color}`} />
                    </div>
                    <span className="text-[10px] text-gray-400">{tItem.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Pickers */}
            {theme === 'custom' && (
              <div className="p-3.5 rounded-xl bg-surface-muted border border-surface-border space-y-3">
                <span className="text-xs font-semibold text-gray-200 block">
                  {t('settings.themeCustom', 'התאמת צבעים אישית (Custom Palette)')}
                </span>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-surface-border">
                    <span className="text-gray-300">Accent:</span>
                    <input
                      type="color"
                      value={customColors.accent}
                      onChange={(e) => setCustomColors({ ...customColors, accent: e.target.value })}
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-surface-border">
                    <span className="text-gray-300">Background:</span>
                    <input
                      type="color"
                      value={customColors.background}
                      onChange={(e) => setCustomColors({ ...customColors, background: e.target.value })}
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
                  <span>{t('settings.autoBackupTitle', 'גיבוי אוטומטי מתוזמן ברקע (Auto-Backup)')}</span>
                </h3>
                <span className="text-[10px] text-gray-500">
                  {t('settings.autoBackupDesc', 'סנכרון מחזורי של תיקייה מקומית ליעד ענן מוגדר')}
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
                  <label className="text-[11px] text-gray-300">{t('settings.backupFrequency', 'תדירות גיבוי:')}</label>
                  <select
                    value={autoBackupInterval}
                    onChange={(e) => setAutoBackupInterval(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-surface-border text-foreground"
                  >
                    <option value={1}>{t('settings.backupHourly', 'כל שעה')}</option>
                    <option value={6}>{t('settings.backupEvery6h', 'כל 6 שעות')}</option>
                    <option value={12}>{t('settings.backupEvery12h', 'כל 12 שעות')}</option>
                    <option value={24}>{t('settings.backupDaily', 'פעם ביום (24 שעות)')}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-300">{t('settings.backupSource', 'תיקיית מקור לגיבוי:')}</label>
                  <input
                    type="text"
                    placeholder="/Users/..."
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

          {/* Section: Developer Credits / About with prominent GitHub link */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-surface-muted/90 to-surface/80 border border-surface-border shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="w-8 h-8 rounded-xl bg-mac-accent/15 border border-mac-accent/30 flex items-center justify-center text-mac-accent">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">{t('settings.devCreditsTitle', 'אודות המפתח (Developer Credits)')}</h3>
                  <p className="text-[10px] text-gray-400">{t('settings.devCreditsDesc', 'פיתוח והתאמת ממשק Reclone Pro')}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-mac-accent/10 text-mac-accent border border-mac-accent/20">
                v1.0.3 Pro
              </span>
            </div>

            {/* Check for Updates Panel */}
            <div className="p-3 rounded-xl bg-surface/80 border border-surface-border/70 flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{t('settings.updatesTitle', 'עדכוני גרסה (Software Updates)')}</h4>
                    <p className="text-[10px] text-gray-400">{t('settings.updatesDesc', 'בדוק אם קיימת גרסה חדשה ב-GitHub')}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckForUpdates}
                  disabled={checkingUpdate}
                  className="inline-flex items-center justify-center space-x-1.5 space-x-reverse px-3 py-1.5 rounded-lg text-xs font-semibold bg-mac-accent text-white hover:bg-mac-accentHover transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                  <span>{checkingUpdate ? t('settings.checking', 'בודק...') : t('settings.checkNow', 'בדוק עדכונים')}</span>
                </button>
              </div>

              {updateResult && updateResult.checked && (
                <div className="mt-1">
                  {updateResult.isNewer ? (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 to-blue-500/15 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5 space-x-reverse text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{t('settings.newVersionAvailable', 'גרסה חדשה זמינה!')} v{updateResult.latestVersion}</span>
                        </div>
                        <p className="text-[11px] text-gray-300">
                          {t('settings.currentVersionIs', 'הגרסה הנוכחית שלך:')} v1.0.3 Pro
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenExternal(updateResult.downloadUrl || 'https://github.com/shalom202770/Reclone-Pro/releases/latest')}
                        className="inline-flex items-center justify-center space-x-1.5 space-x-reverse px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-colors cursor-pointer"
                      >
                        <ArrowDownCircle className="w-3.5 h-3.5" />
                        <span>{t('settings.downloadUpdate', 'הורד עדכון עכשיו')}</span>
                      </button>
                    </div>
                  ) : updateResult.error ? (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{t('settings.updateCheckError', 'שגיאה בבדיקת עדכונים:')} {updateResult.error}</span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 space-x-reverse">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('settings.upToDate', 'אתה משתמש בגרסה העדכנית ביותר! (v1.0.3 Pro)')}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">v1.0.3 Pro</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-surface/80 border border-surface-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-semibold text-foreground flex items-center space-x-1.5 space-x-reverse">
                  <span>{t('settings.developerName', 'שלום קריפור')}</span>
                  <span className="text-[11px] font-normal text-gray-400">(Shalom Kripor)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 font-medium">
                    {t('settings.developerRole', 'תמיד עוזר')}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 space-x-reverse text-[11px] text-gray-300">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => handleOpenExternal('mailto:shalom202770@gmail.com')}
                    className="hover:text-mac-accent transition-colors font-mono"
                    dir="ltr"
                  >
                    shalom202770@gmail.com
                  </button>
                </div>
              </div>

              {/* External Profile Links including GitHub */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenExternal('https://github.com/shalom202770')}
                  title="Visit GitHub profile: https://github.com/shalom202770"
                  className="inline-flex items-center justify-center space-x-1.5 space-x-reverse px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#24292e] text-white hover:bg-[#323940] transition-colors shadow-xs border border-white/10 hover:border-mac-accent cursor-pointer"
                >
                  <GithubIcon className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenExternal('https://mitmachim.top/user/%D7%AA%D7%9E%D7%99%D7%93-%D7%A2%D7%95%D7%96%D7%A8')}
                  className="inline-flex items-center justify-center space-x-1.5 space-x-reverse px-3 py-1.5 rounded-lg text-xs font-semibold bg-mac-accent text-white hover:bg-mac-accentHover transition-colors shadow-xs hover:shadow cursor-pointer"
                >
                  <span>Mitmachim Top</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-border bg-surface-muted flex items-center justify-end space-x-2 space-x-reverse">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-surface-hover"
          >
            {t('common.cancel', 'ביטול')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-mac-accent hover:bg-mac-accentHover text-white shadow-sm"
          >
            {t('common.apply', 'החל שינויים')}
          </button>
        </div>
      </div>
    </div>
  );
};
