import React, { useState, useRef, useEffect } from 'react';
import { Terminal, X, Trash2, Copy, Check } from 'lucide-react';
import type { LogEntry } from '../types';

interface LogsDrawerProps {
  isOpen: boolean;
  logs: LogEntry[];
  onClose: () => void;
  onClear: () => void;
}

export const LogsDrawer: React.FC<LogsDrawerProps> = ({
  isOpen,
  logs,
  onClose,
  onClear,
}) => {
  const [filter, setFilter] = useState<'all' | 'command' | 'error' | 'info'>('all');
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const handleCopy = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-64 z-40 bg-surface/95 backdrop-blur-glass border-t border-surface-border shadow-popover flex flex-col font-mono text-xs text-right select-none">
      {/* Header */}
      <div className="h-9 px-4 bg-surface-muted border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Terminal className="w-4 h-4 text-mac-accent" />
          <span className="font-semibold text-foreground font-sans">יומן פקודות ואירועי Rclone (Terminal Logs)</span>
          <span className="text-[10px] text-gray-500 font-sans">({filteredLogs.length} אירועים)</span>
        </div>

        {/* Filter & Actions */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <div className="flex items-center bg-surface p-0.5 rounded border border-surface-border text-[10px] font-sans">
            {[
              { id: 'all', label: 'הכל' },
              { id: 'command', label: 'פקודות' },
              { id: 'error', label: 'שגיאות' },
              { id: 'info', label: 'מידע' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilter(id as any)}
                className={`px-2 py-0.5 rounded font-semibold ${
                  filter === id
                    ? 'bg-mac-accent text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            title="העתק יומן ללוח"
            className="flex items-center space-x-1 space-x-reverse px-2 py-1 rounded bg-surface border border-surface-border text-gray-300 hover:text-white font-sans text-[11px]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-mac-success" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'הועתק' : 'העתק'}</span>
          </button>

          <button
            onClick={onClear}
            title="נקה יומן"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-surface"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 select-text bg-[#0e0b0a]" dir="ltr">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-600 text-center py-8 font-sans">אין אירועים ביומן כעת.</div>
        ) : (
          filteredLogs.map((log) => {
            const levelColor =
              log.level === 'command'
                ? 'text-mac-cyan'
                : log.level === 'error'
                ? 'text-mac-danger'
                : log.level === 'warn'
                ? 'text-mac-warning'
                : 'text-gray-300';

            return (
              <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                <span className="text-gray-600 shrink-0 text-[10px] select-none">
                  {log.timestamp}
                </span>
                <span
                  className={`px-1 rounded text-[9px] uppercase font-bold shrink-0 select-none ${
                    log.level === 'command'
                      ? 'bg-mac-cyan/15 text-mac-cyan'
                      : log.level === 'error'
                      ? 'bg-mac-danger/15 text-mac-danger'
                      : log.level === 'warn'
                      ? 'bg-mac-warning/15 text-mac-warning'
                      : 'bg-surface-border text-gray-400'
                  }`}
                >
                  {log.level}
                </span>
                <span className={`${levelColor} break-all flex-1`}>{log.message}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
