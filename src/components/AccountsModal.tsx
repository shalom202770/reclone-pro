import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  HardDrive, 
  Plus, 
  Trash2, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Upload, 
  FileText, 
  ExternalLink,
  PieChart,
  Server,
  Layers,
  Sparkles,
  Check
} from 'lucide-react';
import type { RemoteInfo, RemoteStorageInfo } from '../types';
import { formatBytes } from '../lib/utils';

interface AccountsModalProps {
  isOpen: boolean;
  remotes: RemoteInfo[];
  rcloneConfigPath: string;
  onClose: () => void;
  onRefreshRemotes: () => void;
  onSelectRemote: (remoteName: string) => void;
}

const PROVIDERS = [
  { id: 'drive', name: 'Google Drive', icon: 'google', desc: 'אחסון Google Drive אישי או ארגוני' },
  { id: 'onedrive', name: 'Microsoft OneDrive', icon: 'cloud', desc: 'OneDrive ו-SharePoint' },
  { id: 's3', name: 'Amazon S3 / R2 / Wasabi', icon: 'database', desc: 'אחסון אובייקטים תואם S3' },
  { id: 'dropbox', name: 'Dropbox', icon: 'box', desc: 'חשבון Dropbox אישי או עסקי' },
  { id: 'mega', name: 'Mega.nz', icon: 'cloud', desc: 'אחסון ענן מוצפן Mega' },
  { id: 'webdav', name: 'WebDAV / Nextcloud', icon: 'server', desc: 'חיבור שרת WebDAV או Nextcloud' },
  { id: 'sftp', name: 'SFTP / SSH', icon: 'server', desc: 'חיבור שרת מאובטח באמצעות SSH' },
];

export const AccountsModal: React.FC<AccountsModalProps> = ({
  isOpen,
  remotes,
  rcloneConfigPath,
  onClose,
  onRefreshRemotes,
  onSelectRemote,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'union' | 'config'>('list');
  const [storages, setStorages] = useState<Record<string, RemoteStorageInfo>>({});
  const [loadingStorage, setLoadingStorage] = useState<Record<string, boolean>>({});
  const [configContent, setConfigContent] = useState('');
  const [configSaved, setConfigSaved] = useState(false);

  // New remote wizard state
  const [selectedProvider, setSelectedProvider] = useState('drive');
  const [newRemoteName, setNewRemoteName] = useState('');
  const [remoteParams, setRemoteParams] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Union remote wizard state
  const [unionName, setUnionName] = useState('');
  const [selectedUpstreams, setSelectedUpstreams] = useState<string[]>([]);
  const [unionPolicy, setUnionPolicy] = useState<'mfs' | 'lus' | 'ff' | 'all'>('mfs');
  const [isCreatingUnion, setIsCreatingUnion] = useState(false);
  const [unionError, setUnionError] = useState<string | null>(null);
  const [unionSuccess, setUnionSuccess] = useState<string | null>(null);

  // Load storage meters when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAllStorages();
      loadConfigFile();
    }
  }, [isOpen, remotes]);

  const loadAllStorages = async () => {
    if (!window.electronAPI) return;
    for (const r of remotes) {
      setLoadingStorage((prev) => ({ ...prev, [r.name]: true }));
      try {
        const usage = await window.electronAPI.getStorageUsage(r.name);
        setStorages((prev) => ({ ...prev, [r.name]: usage }));
      } catch (e) {
        // Ignored
      } finally {
        setLoadingStorage((prev) => ({ ...prev, [r.name]: false }));
      }
    }
  };

  const loadConfigFile = async () => {
    if (!window.electronAPI) return;
    try {
      const content = await window.electronAPI.readConfigContent();
      setConfigContent(content);
    } catch {}
  };

  const handleSaveConfig = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.writeConfigContent(configContent);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
    onRefreshRemotes();
  };

  const handleCreateRemote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemoteName.trim()) return;
    setIsCreating(true);
    setCreateError(null);

    try {
      if (window.electronAPI) {
        await window.electronAPI.createRemote(newRemoteName.trim(), selectedProvider, remoteParams);
        onRefreshRemotes();
        setActiveTab('list');
        setNewRemoteName('');
        setRemoteParams({});
      }
    } catch (err: any) {
      setCreateError(err?.message || 'שגיאה ביצירת החשבון');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateUnion = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = unionName.trim().replace(/\s+/g, '_');
    if (!cleanName) {
      setUnionError('נא להזין שם עבור הכונן המאוחד');
      return;
    }
    if (selectedUpstreams.length < 2) {
      setUnionError('נא לבחור לפחות 2 חשבונות ענן לאיחוד');
      return;
    }

    setIsCreatingUnion(true);
    setUnionError(null);
    setUnionSuccess(null);

    try {
      if (window.electronAPI) {
        await window.electronAPI.createUnionRemote(cleanName, selectedUpstreams, unionPolicy);
        setUnionSuccess(`הכונן המאוחד "${cleanName}" נוצר בהצלחה!`);
        onRefreshRemotes();
        setTimeout(() => {
          setActiveTab('list');
          onSelectRemote(cleanName);
          setUnionName('');
          setSelectedUpstreams([]);
          setUnionSuccess(null);
        }, 1200);
      }
    } catch (err: any) {
      setUnionError(err?.message || 'שגיאה ביצירת כונן האיחוד');
    } finally {
      setIsCreatingUnion(false);
    }
  };

  const toggleUpstream = (remoteName: string) => {
    setSelectedUpstreams((prev) =>
      prev.includes(remoteName) ? prev.filter((r) => r !== remoteName) : [...prev, remoteName]
    );
  };

  const availableCloudRemotes = remotes.filter((r) => !r.isLocal && !r.isUnion && r.type !== 'union');

  const combinedStats = selectedUpstreams.reduce(
    (acc, name) => {
      const s = storages[name];
      if (s && s.total > 0) {
        acc.total += s.total;
        acc.used += s.used;
        acc.free += s.free;
        acc.known++;
      }
      return acc;
    },
    { total: 0, used: 0, free: 0, known: 0 }
  );

  const handleDeleteRemote = async (name: string) => {
    if (name === 'Local Mac') return;
    if (confirm(`האם אתה בטוח שברצונך למחוק את החשבון "${name}"?`)) {
      if (window.electronAPI) {
        await window.electronAPI.deleteRemote(name);
        onRefreshRemotes();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-subtle animate-in fade-in duration-150 select-none">
      <div className="w-[720px] max-h-[85vh] rounded-2xl bg-surface border border-surface-border shadow-popover overflow-hidden flex flex-col text-right">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between bg-surface-muted">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-8 h-8 rounded-lg bg-surface-active border border-surface-border flex items-center justify-center text-mac-accent">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">ניהול חשבונות ענן (Accounts)</h2>
              <p className="text-[11px] text-gray-400">הגדרת חשבונות, מעקב נפחי אחסון וניהול קובץ rclone.conf</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center space-x-1 space-x-reverse bg-surface p-1 rounded-lg border border-surface-border text-xs">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                activeTab === 'list' ? 'bg-mac-accent text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              רשימת חשבונות
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`px-3 py-1 rounded-md transition-all font-medium flex items-center space-x-1 space-x-reverse ${
                activeTab === 'add' ? 'bg-mac-accent text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>הוספת חשבון</span>
            </button>
            <button
              onClick={() => setActiveTab('union')}
              className={`px-3 py-1 rounded-md transition-all font-medium flex items-center space-x-1.5 space-x-reverse ${
                activeTab === 'union' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-300 hover:text-white hover:bg-purple-500/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>איחוד כוננים (Union)</span>
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                activeTab === 'config' ? 'bg-mac-accent text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              קובץ תצורה (.conf)
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-surface-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 1: Remotes List with Storage Meters */}
        {activeTab === 'list' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-3">
            {/* Quick Union Wizard Banner */}
            <button
              type="button"
              onClick={() => setActiveTab('union')}
              className="w-full p-2.5 rounded-xl bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-blue-500/15 border border-purple-500/30 hover:border-purple-500/50 flex items-center justify-between text-xs text-purple-200 transition-all cursor-pointer shadow-sm"
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <Layers className="w-4 h-4 text-purple-400" />
                <span className="font-semibold">אשף איחוד כוננים (Union Wizard) — שלב מספר חשבונות לנפח אחד ענק</span>
              </div>
              <span className="text-[11px] bg-purple-500/25 px-2 py-0.5 rounded text-purple-100 font-medium">פתח אשף ✨</span>
            </button>

            <div className="flex items-center justify-between text-xs text-gray-400 pb-1">
              <span>{remotes.length} חשבונות מחוברים</span>
              <button
                onClick={loadAllStorages}
                className="flex items-center space-x-1 space-x-reverse text-mac-accent hover:underline text-[11px]"
              >
                <RefreshCw className="w-3 h-3" />
                <span>רענן נפחי אחסון</span>
              </button>
            </div>

            {remotes.map((remote) => {
              const storage = storages[remote.name];
              const isLoading = loadingStorage[remote.name];
              const hasStorage = storage && storage.total > 0;
              const usedPct = hasStorage ? Math.round((storage.used / storage.total) * 100) : 0;
              const isUnion = remote.isUnion || remote.type === 'union';

              return (
                <div
                  key={remote.name}
                  className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-colors ${
                    isUnion
                      ? 'bg-purple-950/20 border-purple-500/30 hover:border-purple-500/50'
                      : 'bg-surface-muted/90 border-surface-border hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        remote.isLocal
                          ? 'bg-cyan-500/15 border border-cyan-500/30 text-mac-cyan'
                          : isUnion
                          ? 'bg-purple-500/20 border border-purple-500/40 text-purple-400'
                          : 'bg-surface border border-surface-border text-mac-accent'
                      }`}>
                        {remote.isLocal ? (
                          <HardDrive className="w-4 h-4" />
                        ) : isUnion ? (
                          <Layers className="w-4 h-4" />
                        ) : (
                          <Cloud className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className="font-semibold text-xs text-foreground">{remote.name}</span>
                          <span className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded border ${
                            isUnion
                              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-bold'
                              : 'bg-surface border border-surface-border text-gray-400'
                          }`}>
                            {remote.isLocal ? 'דיסק מקומי' : isUnion ? 'איחוד וירטואלי (UNION)' : remote.type}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 font-mono">
                          {remote.isLocal ? 'Local FileSystem' : `${remote.name}:`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse">
                      <button
                        onClick={() => {
                          onSelectRemote(remote.name);
                          onClose();
                        }}
                        className="px-2.5 py-1 text-xs rounded-lg bg-surface border border-surface-border text-gray-300 hover:text-white hover:bg-surface-hover transition-colors"
                      >
                        פתח בסייר
                      </button>
                      {!remote.isLocal && (
                        <button
                          onClick={() => handleDeleteRemote(remote.name)}
                          title="מחק חשבון"
                          className="p-1 rounded-lg text-gray-500 hover:text-mac-danger hover:bg-mac-danger/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Air Explorer Style Storage Meter */}
                  <div className="space-y-1 pt-1 border-t border-surface-border/50">
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                      <span>
                        {isLoading
                          ? 'סורק נפח אחסון...'
                          : hasStorage
                          ? `בשימוש: ${formatBytes(storage.used)} מתוך ${formatBytes(storage.total)} (${usedPct}%)`
                          : 'נפח אחסון: זמין ללא מגבלה או לא נתמך'}
                      </span>
                      {hasStorage && (
                        <span className="text-mac-accent">
                          פנוי: {formatBytes(storage.free)}
                        </span>
                      )}
                    </div>

                    <div className="w-full bg-surface-border/60 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          usedPct > 90
                            ? 'bg-mac-danger'
                            : usedPct > 75
                            ? 'bg-mac-warning'
                            : 'bg-gradient-to-l from-mac-accent to-amber-600'
                        }`}
                        style={{ width: `${Math.max(2, Math.min(100, usedPct))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Add Remote Wizard */}
        {activeTab === 'add' && (
          <form onSubmit={handleCreateRemote} className="p-5 flex-1 overflow-y-auto space-y-4">
            {createError && (
              <div className="p-3 rounded-lg bg-mac-danger/15 border border-mac-danger/30 text-mac-danger text-xs flex items-center space-x-2 space-x-reverse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {/* Provider Grid */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                1. בחר שירות ענן (Cloud Provider)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProvider(p.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center space-x-2.5 space-x-reverse transition-all ${
                      selectedProvider === p.id
                        ? 'bg-mac-accent/15 border-mac-accent text-white font-medium'
                        : 'bg-surface-muted border-surface-border text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <Cloud className="w-4 h-4 text-mac-accent shrink-0" />
                    <div className="truncate">
                      <div className="text-xs truncate">{p.name}</div>
                      <div className="text-[10px] text-gray-500 truncate">{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Remote Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                2. שם לחשבון (ללא רווחים)
              </label>
              <input
                type="text"
                required
                placeholder="לדוגמה: my_gdrive או work_backup"
                value={newRemoteName}
                onChange={(e) => setNewRemoteName(e.target.value.replace(/\s+/g, '_'))}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-surface-muted border border-surface-border text-foreground focus:border-mac-accent"
              />
            </div>

            {/* Provider Specific Inputs */}
            {selectedProvider === 'drive' && (
              <div className="p-3 rounded-xl bg-surface-muted border border-surface-border space-y-2 text-xs">
                <span className="font-semibold text-foreground block">חיבור Google Drive</span>
                <p className="text-[11px] text-gray-400">
                  בלחיצה על "צור חשבון", Rclone יפתח דפדפן לאימות OAuth רשמי מול חשבון ה-Google שלך.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Client ID (אופציונלי)"
                    value={remoteParams.client_id || ''}
                    onChange={(e) => setRemoteParams({ ...remoteParams, client_id: e.target.value })}
                    className="px-2.5 py-1.5 text-xs rounded bg-surface border border-surface-border text-foreground font-mono"
                  />
                  <input
                    type="password"
                    placeholder="Client Secret (אופציונלי)"
                    value={remoteParams.client_secret || ''}
                    onChange={(e) => setRemoteParams({ ...remoteParams, client_secret: e.target.value })}
                    className="px-2.5 py-1.5 text-xs rounded bg-surface border border-surface-border text-foreground font-mono"
                  />
                </div>
              </div>
            )}

            {selectedProvider === 's3' && (
              <div className="p-3 rounded-xl bg-surface-muted border border-surface-border space-y-2 text-xs">
                <span className="font-semibold text-foreground block">פרטי Amazon S3 / Cloudflare R2</span>
                <input
                  type="text"
                  placeholder="Access Key ID"
                  value={remoteParams.access_key_id || ''}
                  onChange={(e) => setRemoteParams({ ...remoteParams, access_key_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-surface border border-surface-border text-foreground font-mono"
                />
                <input
                  type="password"
                  placeholder="Secret Access Key"
                  value={remoteParams.secret_access_key || ''}
                  onChange={(e) => setRemoteParams({ ...remoteParams, secret_access_key: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-surface border border-surface-border text-foreground font-mono"
                />
                <input
                  type="text"
                  placeholder="Endpoint (למשל: https://<account>.r2.cloudflarestorage.com)"
                  value={remoteParams.endpoint || ''}
                  onChange={(e) => setRemoteParams({ ...remoteParams, endpoint: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-surface border border-surface-border text-foreground font-mono"
                />
              </div>
            )}

            {(selectedProvider === 'webdav' || selectedProvider === 'sftp') && (
              <div className="p-3 rounded-xl bg-surface-muted border border-surface-border space-y-2 text-xs">
                <span className="font-semibold text-foreground block">פרטי שרת {selectedProvider.toUpperCase()}</span>
                <input
                  type="text"
                  placeholder="כתובת URL או שרת (Host/URL)"
                  value={remoteParams.url || remoteParams.host || ''}
                  onChange={(e) => setRemoteParams({ ...remoteParams, url: e.target.value, host: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-surface border border-surface-border text-foreground font-mono"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="שם משתמש (User)"
                    value={remoteParams.user || ''}
                    onChange={(e) => setRemoteParams({ ...remoteParams, user: e.target.value })}
                    className="px-2.5 py-1.5 text-xs rounded bg-surface border border-surface-border text-foreground font-mono"
                  />
                  <input
                    type="password"
                    placeholder="סיסמה (Pass)"
                    value={remoteParams.pass || ''}
                    onChange={(e) => setRemoteParams({ ...remoteParams, pass: e.target.value })}
                    className="px-2.5 py-1.5 text-xs rounded bg-surface border border-surface-border text-foreground font-mono"
                  />
                </div>
              </div>
            )}

            {isCreating && (
              <div className="p-3 rounded-xl bg-mac-accent/15 border border-mac-accent/30 text-mac-accent text-xs flex items-center space-x-2 space-x-reverse animate-pulse">
                <div className="w-4 h-4 border-2 border-mac-accent border-t-transparent rounded-full animate-spin shrink-0" />
                <span>דפדפן המערכת נפתח כעת לאישור חשבון Google OAuth... אנא אשר את ההרשאה להשלמת החיבור ל-Rclone.</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isCreating || !newRemoteName.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-mac-accent hover:bg-mac-accentHover text-white shadow-sm disabled:opacity-40 transition-colors"
              >
                {isCreating ? 'ממתין לאישור בדפדפן...' : 'שמור וצור חשבון ב-Rclone'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Union Remotes Wizard (Combine Multiple Cloud Accounts) */}
        {activeTab === 'union' && (
          <form onSubmit={handleCreateUnion} className="p-5 flex-1 overflow-y-auto space-y-4">
            {/* Header info */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-500/15 via-indigo-500/10 to-transparent border border-purple-500/30 flex items-start space-x-3 space-x-reverse text-xs">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                <Layers className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-purple-200">איחוד חשבונות ענן לכונן וירטואלי יחיד (Union Virtual Volume)</h3>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  שלב שניים או יותר חשבונות Google Drive (או שירותי ענן שונים) לכונן וירטואלי יחיד בעל נפח מאוחד ענק. Rclone ינהל את חלוקת הקבצים בין החשבונות באופן שקוף לחלוטין!
                </p>
              </div>
            </div>

            {unionError && (
              <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400 flex items-center space-x-2 space-x-reverse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{unionError}</span>
              </div>
            )}

            {unionSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-400 flex items-center space-x-2 space-x-reverse">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{unionSuccess}</span>
              </div>
            )}

            {/* Step 1: Remote Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>1. שם לכונן המאוחד (באנגלית, ללא רווחים)</span>
                <span className="text-[10px] text-gray-500 font-normal">למשל: google_union או cloud_pool</span>
              </label>
              <input
                type="text"
                required
                placeholder="למשל: all_drives או unified_pool"
                value={unionName}
                onChange={(e) => setUnionName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-surface-muted border border-surface-border text-foreground focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Step 2: Select Upstream Remotes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>2. בחר חשבונות ענן לאיחוד (לפחות 2)</span>
                <span className="text-[10px] text-purple-300 font-semibold">
                  נבחרו {selectedUpstreams.length} מתוך {availableCloudRemotes.length}
                </span>
              </label>

              {availableCloudRemotes.length < 2 ? (
                <div className="p-4 rounded-xl bg-surface-muted border border-surface-border text-center space-y-2">
                  <p className="text-xs text-gray-400">
                    נמצאו פחות מ-2 חשבונות ענן מוגדרים. כדי ליצור כונן איחוד, יש לחבר קודם לפחות שני חשבונות (למשל שני חשבונות Google Drive).
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('add')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-mac-accent text-white"
                  >
                    חבר חשבון נוסף עכשיו
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1">
                  {availableCloudRemotes.map((remote) => {
                    const isSelected = selectedUpstreams.includes(remote.name);
                    const storage = storages[remote.name];
                    return (
                      <div
                        key={remote.name}
                        onClick={() => toggleUpstream(remote.name)}
                        className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all select-none ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500 text-white font-medium shadow-xs'
                            : 'bg-surface-muted border-surface-border text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 space-x-reverse truncate">
                          <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isSelected ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-500 bg-surface'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <Cloud className={`w-4 h-4 shrink-0 ${isSelected ? 'text-purple-400' : 'text-gray-400'}`} />
                          <div className="truncate">
                            <span className="text-xs truncate block">{remote.name}</span>
                            <span className="text-[10px] text-gray-500 uppercase font-mono">{remote.type}</span>
                          </div>
                        </div>

                        {storage && storage.total > 0 && (
                          <div className="text-[10px] text-gray-400 font-mono text-left shrink-0">
                            <span>{formatBytes(storage.free)} פנוי</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Combined Storage Preview Badge */}
              {selectedUpstreams.length >= 2 && combinedStats.total > 0 && (
                <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 space-x-reverse text-purple-300">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold">נפח כולל מאוחד מחושב:</span>
                  </div>
                  <div className="font-mono text-xs text-foreground flex items-center space-x-2 space-x-reverse">
                    <span className="text-emerald-400 font-bold">{formatBytes(combinedStats.free)} פנוי</span>
                    <span className="text-gray-500">/</span>
                    <span>{formatBytes(combinedStats.total)} סה״כ</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Allocation Policy */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                3. מדיניות הקצאת ושמירת קבצים חדשים (Create Policy)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div
                  onClick={() => setUnionPolicy('mfs')}
                  className={`p-2.5 rounded-xl border cursor-pointer space-y-1 transition-all ${
                    unionPolicy === 'mfs'
                      ? 'bg-purple-500/20 border-purple-500 text-white font-medium'
                      : 'bg-surface-muted border-surface-border text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-purple-300">שטח פנוי מרבי (MFS)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200">מומלץ</span>
                  </div>
                  <p className="text-[10px] text-gray-400">קבצים חדשים יישמרו אוטומטית בחשבון עם הכי הרבה שטח פנוי</p>
                </div>

                <div
                  onClick={() => setUnionPolicy('lus')}
                  className={`p-2.5 rounded-xl border cursor-pointer space-y-1 transition-all ${
                    unionPolicy === 'lus'
                      ? 'bg-purple-500/20 border-purple-500 text-white font-medium'
                      : 'bg-surface-muted border-surface-border text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <span className="font-semibold text-purple-300">אחוז תפוסה מינימלי (LUS)</span>
                  <p className="text-[10px] text-gray-400">קבצים יישמרו בחשבון בעל אחוז הניצולת הנמוך ביותר</p>
                </div>

                <div
                  onClick={() => setUnionPolicy('ff')}
                  className={`p-2.5 rounded-xl border cursor-pointer space-y-1 transition-all ${
                    unionPolicy === 'ff'
                      ? 'bg-purple-500/20 border-purple-500 text-white font-medium'
                      : 'bg-surface-muted border-surface-border text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <span className="font-semibold text-purple-300">סדר כרונולוגי (First Found)</span>
                  <p className="text-[10px] text-gray-400">קבצים יישמרו בחשבון הראשון עד שיתמלא, ורק אז יעברו לבא</p>
                </div>

                <div
                  onClick={() => setUnionPolicy('all')}
                  className={`p-2.5 rounded-xl border cursor-pointer space-y-1 transition-all ${
                    unionPolicy === 'all'
                      ? 'bg-purple-500/20 border-purple-500 text-white font-medium'
                      : 'bg-surface-muted border-surface-border text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <span className="font-semibold text-purple-300">שכפול כפול (Mirror All)</span>
                  <p className="text-[10px] text-gray-400">כל קובץ חדש יישמר בכל החשבונות במקביל לגיבוי מלא</p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isCreatingUnion || !unionName.trim() || selectedUpstreams.length < 2}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md disabled:opacity-40 transition-all flex items-center space-x-1.5 space-x-reverse"
              >
                <Layers className={`w-3.5 h-3.5 ${isCreatingUnion ? 'animate-spin' : ''}`} />
                <span>{isCreatingUnion ? 'יוצר כונן מאוחד...' : 'צור כונן מאוחד עכשיו ✨'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: Direct rclone.conf Viewer / Editor */}
        {activeTab === 'config' && (
          <div className="p-5 flex-1 flex flex-col space-y-3 overflow-hidden">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-mono text-[11px] truncate max-w-md">נתיב קובץ: {rcloneConfigPath}</span>
              {configSaved && (
                <span className="text-mac-success text-xs flex items-center space-x-1 space-x-reverse font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>נשמר בהצלחה!</span>
                </span>
              )}
            </div>

            <textarea
              value={configContent}
              onChange={(e) => setConfigContent(e.target.value)}
              placeholder="; קובץ rclone.conf ריק"
              dir="ltr"
              className="flex-1 w-full p-3 text-xs font-mono rounded-xl bg-surface-muted border border-surface-border text-foreground focus:border-mac-accent resize-none select-text"
            />

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={loadConfigFile}
                className="px-3 py-1.5 rounded-lg text-xs border border-surface-border text-gray-300 hover:text-white"
              >
                רענן מהדיסק
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-mac-accent hover:bg-mac-accentHover text-white shadow-sm"
              >
                שמור שינויים ב-rclone.conf
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
