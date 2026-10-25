import React, { useState, useRef } from 'react';
import { 
  Activity, 
  Pause, 
  Play, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  Trash2,
  Zap,
  ArrowLeft,
  ArrowRight,
  Folder,
  FileText
} from 'lucide-react';
import type { TransferTask } from '../types';
import { formatBytes, formatRemainingTime } from '../lib/utils';
import { useTranslation } from '../i18n/context';

interface TransferManagerProps {
  tasks: TransferTask[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPauseTask: (id: string) => void;
  onResumeTask: (id: string) => void;
  onCancelTask: (id: string) => void;
  onDismissTask?: (id: string) => void;
  onClearCompleted: () => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
}

export const TransferManager: React.FC<TransferManagerProps> = ({
  tasks,
  isExpanded,
  onToggleExpand,
  onPauseTask,
  onResumeTask,
  onCancelTask,
  onDismissTask,
  onClearCompleted,
  onPauseAll,
  onResumeAll,
}) => {
  const { t, isRtl, dir } = useTranslation();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [panelHeight, setPanelHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('transfer_panel_height');
      return saved ? parseInt(saved, 10) : 260;
    } catch {
      return 260;
    }
  });

  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = panelHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      // Dragging upward increases height, downward decreases height
      const deltaY = startYRef.current - moveEvent.clientY;
      const maxHeight = Math.max(200, window.innerHeight * 0.75);
      const newHeight = Math.max(120, Math.min(maxHeight, startHeightRef.current + deltaY));
      setPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      try {
        localStorage.setItem('transfer_panel_height', String(panelHeight));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeTasks = tasks.filter((t) => t.status === 'running');
  const queuedTasks = tasks.filter((t) => t.status === 'queued');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const failedTasks = tasks.filter((t) => t.status === 'failed');
  const cancelledTasks = tasks.filter((t) => t.status === 'cancelled');
  const clearableCount = completedTasks.length + cancelledTasks.length + failedTasks.length;

  const totalSpeedBytes = activeTasks.reduce((sum, t) => sum + (t.speedBytes || 0), 0);
  const totalSpeedFormatted = `${(totalSpeedBytes / (1024 * 1024)).toFixed(2)} MB/s`;

  return (
    <div className={`border-t border-surface-border bg-surface select-none z-20 shrink-0 ${isRtl ? 'text-right' : 'text-left'} relative`} dir={dir}>
      {/* Resizable Drag Handle */}
      {isExpanded && (
        <div
          onMouseDown={handleResizeStart}
          className="h-2 w-full cursor-row-resize bg-surface-muted hover:bg-mac-accent/30 active:bg-mac-accent/50 transition-colors flex items-center justify-center group relative border-b border-surface-border/40 select-none"
          title="Resize transfer panel"
        >
          <div className="w-14 h-1 rounded-full bg-surface-border group-hover:bg-mac-accent transition-colors" />
        </div>
      )}

      {/* Header Bar */}
      <div className="h-10 px-4 bg-surface-muted flex items-center justify-between border-b border-surface-border/50">
        {/* Left: Overall Throughput & Status */}
        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={onToggleExpand}
            className="flex items-center space-x-2 space-x-reverse text-xs font-semibold text-foreground hover:text-mac-accent transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-surface border border-surface-border">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
            <span>{t('transfer.title', 'מנהל העברות והורדות (Queue)')}</span>
          </button>

          {/* Real-time throughput */}
          {activeTasks.length > 0 && (
            <div className="flex items-center space-x-1.5 space-x-reverse px-2.5 py-0.5 rounded-full bg-mac-success/15 border border-mac-success/30 text-mac-success text-xs font-mono font-medium">
              <Zap className="w-3 h-3 fill-mac-success" />
              <span>{totalSpeedFormatted}</span>
            </div>
          )}

          {/* Counters */}
          <div className="flex items-center space-x-2 space-x-reverse text-[11px] text-gray-400">
            {activeTasks.length > 0 && (
              <span className="text-mac-accent font-medium">
                {activeTasks.length} {t('transfer.running', 'פעילים')}
              </span>
            )}
            {queuedTasks.length > 0 && (
              <span>
                • {queuedTasks.length} {t('transfer.queued', 'בתור')}
              </span>
            )}
            {completedTasks.length > 0 && (
              <span className="text-mac-success">
                • {completedTasks.length} {t('transfer.completed', 'הושלמו')}
              </span>
            )}
            {cancelledTasks.length > 0 && (
              <span className="text-gray-400">
                • {cancelledTasks.length} {t('transfer.cancelled', 'בוטלו')}
              </span>
            )}
            {failedTasks.length > 0 && (
              <span className="text-mac-danger">
                • {failedTasks.length} {t('transfer.failed', 'נכשלו')}
              </span>
            )}
            {tasks.length === 0 && <span>{t('transfer.noActiveTransfers', 'תור ההעברות ריק')}</span>}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center space-x-2 space-x-reverse text-xs">
          {activeTasks.length > 0 && (
            <button
              onClick={onPauseAll}
              title={t('transfer.pauseAll', 'השהה הכל')}
              className="flex items-center space-x-1 space-x-reverse px-2 py-1 rounded bg-surface border border-surface-border text-gray-300 hover:text-white hover:bg-surface-hover text-[11px] cursor-pointer"
            >
              <Pause className="w-3 h-3" />
              <span>{t('transfer.pauseAll', 'השהה הכל')}</span>
            </button>
          )}

          {tasks.some((t) => t.status === 'paused') && (
            <button
              onClick={onResumeAll}
              title={t('transfer.resumeAll', 'המשך הכל')}
              className="flex items-center space-x-1 space-x-reverse px-2 py-1 rounded bg-surface border border-surface-border text-mac-accent hover:bg-mac-accent/10 text-[11px] cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>{t('transfer.resumeAll', 'המשך הכל')}</span>
            </button>
          )}

          {clearableCount > 0 && (
            <button
              onClick={onClearCompleted}
              title={t('transfer.clearCompleted', 'נקה שהסתיימו / בוטלו')}
              className="flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded bg-surface border border-surface-border text-gray-300 hover:text-white hover:bg-surface-hover text-[11px] cursor-pointer"
            >
              <Trash2 className="w-3 h-3 text-gray-400" />
              <span>{t('transfer.clearCompleted', 'נקה שהסתיימו / בוטלו')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Task Queue List (Air Explorer Style Tree/Accordion View) */}
      {isExpanded && (
        <div
          style={{ height: `${panelHeight}px` }}
          className="overflow-y-auto p-2 space-y-2 bg-surface/90"
        >
          {tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs">
              <Activity className="w-8 h-8 stroke-[1.2] mb-1 text-gray-600" />
              <span>אין העברות פעילות כעת</span>
            </div>
          ) : (
            tasks.map((task) => {
              const isFolder = task.isDir;
              const isRowExpanded = expandedFolders.has(task.id);
              const hasSubFiles = task.subFiles && task.subFiles.length > 0;

              return (
                <div
                  key={task.id}
                  className="rounded-lg bg-surface-muted/80 border border-surface-border flex flex-col hover:border-gray-600 transition-colors overflow-hidden"
                >
                  {/* Main Parent Row */}
                  <div className="p-2.5 flex flex-col gap-1.5">
                    {/* Top line: Name, Source -> Destination, Controls */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 space-x-reverse truncate">
                        {/* Collapsible Accordion Arrow for folder tasks */}
                        {isFolder ? (
                          <button
                            onClick={() => toggleFolder(task.id)}
                            className="p-1 rounded hover:bg-surface-border/60 text-gray-400 hover:text-white transition-colors flex items-center justify-center shrink-0"
                            title={isRowExpanded ? 'סגור פירוט קבצים' : 'הצג קבצים בתיקייה (Air Explorer)'}
                          >
                            {isRowExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-mac-accent" />
                            ) : (
                              <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        ) : (
                          <div className="w-5 flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5 text-mac-accent/80" />
                          </div>
                        )}

                        {isFolder && (
                          <Folder className="w-4 h-4 text-mac-warning fill-mac-warning/20 shrink-0" />
                        )}

                        <span className="font-semibold text-foreground truncate max-w-xs font-mono" title={task.name}>
                          {task.name}
                        </span>

                        <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-mono bg-surface border border-surface-border text-gray-400">
                          {isFolder
                            ? task.operation === 'move' || task.operation === 'moveto'
                              ? 'העברת תיקייה'
                              : 'העתקת תיקייה'
                            : task.operation === 'copy' || task.operation === 'copyto'
                            ? 'העתקה'
                            : task.operation === 'move' || task.operation === 'moveto'
                            ? 'העברה'
                            : 'סנכרון'}
                        </span>

                        {/* Folder overall files count badge (e.g. 12/87 files) */}
                        {isFolder && task.totalTransfersCount != null && task.totalTransfersCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-mac-accent/15 border border-mac-accent/30 text-mac-accent font-medium">
                            {task.transfersCount || 0}/{task.totalTransfersCount} קבצים
                          </span>
                        )}

                        <div className="flex items-center space-x-1 space-x-reverse text-[11px] text-gray-400 truncate font-mono">
                          <span>{task.srcRemote}</span>
                          {isRtl ? <ArrowLeft className="w-3 h-3 text-gray-600 shrink-0" /> : <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />}
                          <span>{task.dstRemote}</span>
                        </div>
                      </div>

                      {/* Individual Controls */}
                      <div className="flex items-center space-x-2 space-x-reverse shrink-0">
                        {task.status === 'running' && (
                          <button
                            onClick={() => onPauseTask(task.id)}
                            title="השהה"
                            className="p-1 rounded text-gray-400 hover:text-white hover:bg-surface-border"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {task.status === 'paused' && (
                          <button
                            onClick={() => onResumeTask(task.id)}
                            title="המשך"
                            className="p-1 rounded text-mac-accent hover:bg-mac-accent/15"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(task.status === 'running' || task.status === 'queued' || task.status === 'paused') && (
                          <button
                            onClick={() => onCancelTask(task.id)}
                            title="בטל העברה"
                            className="p-1 rounded text-gray-400 hover:text-mac-danger hover:bg-mac-danger/15"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {task.status === 'completed' && (
                          <div className="flex items-center space-x-1.5 space-x-reverse">
                            <CheckCircle2 className="w-4 h-4 text-mac-success" />
                            {onDismissTask && (
                              <button
                                onClick={() => onDismissTask(task.id)}
                                title="הסר מהרשימה"
                                className="p-1 rounded text-gray-500 hover:text-white hover:bg-surface-border transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                        {task.status === 'cancelled' && (
                          <div className="flex items-center space-x-1.5 space-x-reverse">
                            <span className="text-[10px] text-gray-500 font-mono">בוטל</span>
                            {onDismissTask && (
                              <button
                                onClick={() => onDismissTask(task.id)}
                                title="הסר מהרשימה"
                                className="p-1 rounded text-gray-500 hover:text-white hover:bg-surface-border transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                        {task.status === 'failed' && (
                          <div className="flex items-center space-x-1.5 space-x-reverse">
                            <span title={task.error}>
                              <AlertCircle className="w-4 h-4 text-mac-danger" />
                            </span>
                            {onDismissTask && (
                              <button
                                onClick={() => onDismissTask(task.id)}
                                title="הסר מהרשימה"
                                className="p-1 rounded text-gray-500 hover:text-white hover:bg-surface-border transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Overall Progress Bar */}
                    <div className="w-full bg-surface-border/60 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          task.status === 'completed'
                            ? 'bg-mac-success'
                            : task.status === 'failed'
                            ? 'bg-mac-danger'
                            : task.status === 'paused'
                            ? 'bg-mac-warning'
                            : 'bg-gradient-to-l from-mac-accent to-amber-600'
                        }`}
                        style={{ width: `${task.percentage}%` }}
                      />
                    </div>

                    {/* Overall Stats Bottom Line */}
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <span className="text-foreground font-semibold">
                          {task.percentage}%
                        </span>
                        <span>
                          {formatBytes(task.transferred)} מתוך {formatBytes(task.size)}
                        </span>
                        {isFolder && task.totalTransfersCount != null && task.totalTransfersCount > 0 && (
                          <span className="text-gray-400">
                            ({task.transfersCount || 0}/{task.totalTransfersCount} קבצים)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 space-x-reverse">
                        {task.status === 'running' && (
                          <>
                            <span className="text-mac-accent font-semibold">
                              {task.speed}
                            </span>
                            <span>משוער: {formatRemainingTime(task.eta)}</span>
                          </>
                        )}
                        {task.status === 'completed' && (
                          <span className="text-mac-success">ההעברה הושלמה</span>
                        )}
                        {task.status === 'failed' && (
                          <span className="text-mac-danger truncate max-w-xs">
                            נכשל: {task.error || 'שגיאה כללית'}
                          </span>
                        )}
                        {task.status === 'paused' && (
                          <span className="text-mac-warning">מושהה</span>
                        )}
                        {task.status === 'queued' && (
                          <span className="text-gray-400">ממתין בתור</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Air Explorer Style Accordion Sub-Rows for Folder Transfers */}
                  {isFolder && isRowExpanded && (
                    <div className="border-t border-surface-border/50 bg-black/20 p-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 pb-1 border-b border-surface-border/30">
                        <span>קבצים פעילים בתהליך העברה:</span>
                        <span>{task.subFiles?.length || 0} קבצים פעילים במקביל</span>
                      </div>

                      {hasSubFiles ? (
                        task.subFiles!.map((sub, idx) => (
                          <div
                            key={`${sub.name}-${idx}`}
                            className="flex items-center justify-between py-1 px-2.5 rounded bg-surface/70 border border-surface-border/30 text-xs"
                          >
                            <div className="flex items-center space-x-2 space-x-reverse truncate max-w-[50%]">
                              <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="font-mono text-slate-300 truncate" title={sub.name}>
                                {sub.name}
                              </span>
                            </div>

                            <div className="flex items-center space-x-3 space-x-reverse shrink-0 font-mono text-[11px]">
                              <span className="text-gray-400 text-[10px]">
                                {formatBytes(sub.transferred)} / {formatBytes(sub.size)}
                              </span>
                              <div className="w-20 bg-surface-border/60 h-1 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-mac-accent rounded-full transition-all duration-200"
                                  style={{ width: `${sub.percentage}%` }}
                                />
                              </div>
                              <span className="w-10 text-left text-mac-accent text-[10px] font-semibold">
                                {sub.percentage}%
                              </span>
                              {sub.speed && (
                                <span className="text-[10px] text-gray-400">
                                  {sub.speed}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-2 text-center text-[11px] text-gray-500 italic">
                          {task.status === 'completed'
                            ? 'כל הקבצים בתיקייה הועברו בהצלחה'
                            : task.status === 'running'
                            ? 'סורק ומכין קבצים להעברה...'
                            : 'אין קבצים פעילים כעת'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
