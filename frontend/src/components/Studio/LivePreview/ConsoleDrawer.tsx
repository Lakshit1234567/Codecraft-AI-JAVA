import React from 'react';
import { Terminal, Trash2, X } from 'lucide-react';

export interface ConsoleEntry {
  level: 'info' | 'error';
  message: string;
}

interface ConsoleDrawerProps {
  logs: ConsoleEntry[];
  onClear: () => void;
  onClose: () => void;
}

export const ConsoleDrawer: React.FC<ConsoleDrawerProps> = ({ logs, onClear, onClose }) => {
  return (
    <div
      role="region"
      aria-label="Preview console output"
      className="h-40 border-t border-line bg-surface-inset flex flex-col shrink-0"
    >
      <div className="h-8 px-3 border-b border-line-subtle bg-surface-base flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2 text-ink-secondary font-medium">
          <Terminal className="w-3.5 h-3.5 text-accent-fg" aria-hidden="true" />
          <span>Console</span>
          <span className="text-ink-muted tabular-nums">({logs.length})</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClear}
            disabled={logs.length === 0}
            aria-label="Clear console logs"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-subtle disabled:opacity-40 transition"
          >
            <Trash2 className="w-3 h-3" aria-hidden="true" />
            <span>Clear</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close console drawer"
            className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-subtle transition"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 font-mono text-[11px]">
        {logs.length === 0 ? (
          <div className="text-ink-muted py-6 text-center">No console messages recorded.</div>
        ) : (
          logs.map((entry, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 leading-relaxed ${
                entry.level === 'error'
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-ink-secondary'
              }`}
            >
              <span
                className={`text-[10px] uppercase px-1 rounded shrink-0 mt-0.5 ${
                  entry.level === 'error'
                    ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                    : 'bg-surface-subtle text-ink-muted'
                }`}
              >
                {entry.level}
              </span>
              <span className="break-words">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
