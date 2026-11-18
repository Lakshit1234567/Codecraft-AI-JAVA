import React, { useState } from 'react';
import { ShieldAlert, Play, RefreshCw, Copy, Check, FileCode } from 'lucide-react';
import { FileNode } from '../../types';

interface AdversaryPanelProps {
  files: FileNode[];
  activeFile: string | null;
  running: boolean;
  report: string | null;
  onRunScan: (targetFilePath: string) => void;
}

export const AdversaryPanel: React.FC<AdversaryPanelProps> = ({
  files,
  activeFile,
  running,
  report,
  onRunScan,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>(activeFile || 'src/App.tsx');
  const [copied, setCopied] = useState(false);

  const effectiveTarget =
    selectedTarget && (files.length === 0 || files.some((f) => f.path === selectedTarget))
      ? selectedTarget
      : activeFile || files[0]?.path || 'src/App.tsx';

  const handleCopyReport = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-surface-canvas p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Control Card */}
        <div className="p-5 rounded-lg bg-surface-elevated border border-line shadow-card space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink-primary">
                Web Adversary &amp; Fault Injection
              </h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Probes boundary inputs, unhandled null states, unsafe DOM rendering, and React
                edge cases against your target source file before deployment.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2 border-t border-line-subtle">
            <div className="flex-1">
              <label
                htmlFor="adversary-target-file"
                className="block text-[11px] font-medium text-ink-secondary mb-1.5"
              >
                Target File
              </label>
              {files.length > 0 ? (
                <select
                  id="adversary-target-file"
                  value={effectiveTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-surface-inset border border-line text-xs font-mono text-ink-primary focus:border-accent-fg focus:outline-none"
                >
                  {files.map((f) => (
                    <option key={f.path} value={f.path}>
                      {f.path}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 rounded-md bg-surface-inset border border-line text-xs font-mono text-ink-secondary flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
                  <span>{effectiveTarget}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onRunScan(effectiveTarget)}
              disabled={running}
              className="px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-medium inline-flex items-center justify-center gap-2 transition shrink-0"
            >
              {running ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              )}
              <span>{running ? 'Scanning...' : 'Run Adversary Audit'}</span>
            </button>
          </div>
        </div>

        {/* Report Console */}
        <div className="rounded-lg bg-surface-elevated border border-line shadow-card overflow-hidden">
          <div className="h-9 px-3.5 border-b border-line-subtle bg-surface-base flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-secondary">
              <span>Audit Output</span>
              {running && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-600 dark:text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" aria-hidden="true" />
                  Streaming
                </span>
              )}
            </div>
            {report && (
              <button
                type="button"
                onClick={handleCopyReport}
                className="inline-flex items-center gap-1 text-[11px] text-ink-secondary hover:text-ink-primary transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-700 dark:text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" aria-hidden="true" />
                    <span>Copy Report</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div
            aria-live="polite"
            className="p-4 bg-surface-inset min-h-[220px] max-h-[460px] overflow-y-auto text-xs font-mono text-ink-secondary leading-relaxed whitespace-pre-wrap"
          >
            {report ? (
              report
            ) : (
              <span className="text-ink-muted">
                No scan run yet. Select a target file and click &ldquo;Run Adversary Audit&rdquo; to
                inspect potential runtime failures and security weaknesses.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
