import React from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  ExternalLink,
  Terminal,
  RefreshCw,
  Box,
} from 'lucide-react';
import { K8sPreviewStatusResponse } from '../../../types';

export type PreviewMode = 'sandbox' | 'k8s';
export type ViewportDevice = 'desktop' | 'tablet' | 'mobile';

interface PreviewToolbarProps {
  previewMode: PreviewMode;
  device: ViewportDevice;
  loading: boolean;
  showConsole: boolean;
  logCount: number;
  k8sStatus: K8sPreviewStatusResponse | null;
  deployingK8s: boolean;
  onChangeMode: (mode: PreviewMode) => void;
  onChangeDevice: (device: ViewportDevice) => void;
  onDeployK8s: () => void;
  onReload: () => void;
  onOpenExternal: () => void;
  onToggleConsole: () => void;
}

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  previewMode,
  device,
  loading,
  showConsole,
  logCount,
  k8sStatus,
  deployingK8s,
  onChangeMode,
  onChangeDevice,
  onDeployK8s,
  onReload,
  onOpenExternal,
  onToggleConsole,
}) => {
  const isK8sRunning = k8sStatus?.status === 'RUNNING';

  return (
    <div className="h-10 px-3 border-b border-line-subtle bg-surface-base flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {/* Sandbox vs K8s toggle */}
        <div
          role="tablist"
          aria-label="Preview runtime"
          className="flex items-center bg-surface-inset border border-line-subtle p-0.5 rounded-md"
        >
          <button
            type="button"
            role="tab"
            aria-selected={previewMode === 'sandbox'}
            onClick={() => onChangeMode('sandbox')}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition ${
              previewMode === 'sandbox'
                ? 'bg-accent text-white'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sandbox</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={previewMode === 'k8s'}
            onClick={() => onChangeMode('k8s')}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition ${
              previewMode === 'k8s'
                ? 'bg-surface-subtle text-ink-primary'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <Box className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">K8s Pod</span>
          </button>
        </div>

        {/* Viewport Switcher */}
        {previewMode === 'sandbox' && (
          <div
            role="group"
            aria-label="Viewport size"
            className="hidden sm:flex items-center gap-0.5 bg-surface-inset border border-line-subtle p-0.5 rounded-md"
          >
            {(
              [
                { id: 'desktop', label: 'Desktop viewport', icon: Monitor },
                { id: 'tablet', label: 'Tablet viewport (768px)', icon: Tablet },
                { id: 'mobile', label: 'Mobile viewport (375px)', icon: Smartphone },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-pressed={device === id}
                title={label}
                onClick={() => onChangeDevice(id)}
                className={`p-1 rounded transition ${
                  device === id
                    ? 'bg-surface-subtle text-ink-primary'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {previewMode === 'k8s' ? (
          <div className="flex items-center gap-2">
            <span
              className={`hidden md:inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                isK8sRunning
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isK8sRunning ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                aria-hidden="true"
              />
              <span>{k8sStatus?.status || 'NOT_DEPLOYED'}</span>
            </span>

            <button
              type="button"
              onClick={onDeployK8s}
              disabled={deployingK8s}
              className="px-2.5 py-1 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium inline-flex items-center gap-1.5 transition"
            >
              {deployingK8s ? (
                <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />
              ) : (
                <Box className="w-3 h-3" aria-hidden="true" />
              )}
              <span>{deployingK8s ? 'Deploying...' : isK8sRunning ? 'Sync Pod' : 'Deploy Pod'}</span>
            </button>
          </div>
        ) : (
          <span className="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Live
          </span>
        )}

        <button
          type="button"
          onClick={onReload}
          aria-label="Reload preview"
          title="Reload preview"
          className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-subtle transition"
        >
          <RotateCcw
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-accent-fg' : ''}`}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={onOpenExternal}
          aria-label="Open preview in new tab"
          title="Open in new tab"
          className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-subtle transition"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onToggleConsole}
          aria-expanded={showConsole}
          className={`px-2 py-1 rounded-md text-[11px] font-mono inline-flex items-center gap-1.5 border transition ${
            showConsole
              ? 'bg-accent-subtle text-accent-fg border-accent/40'
              : 'border-transparent text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle'
          }`}
        >
          <Terminal className="w-3 h-3" aria-hidden="true" />
          <span className="hidden sm:inline">Console</span>
          {logCount > 0 && (
            <span className="text-[10px] px-1 rounded bg-surface-subtle text-ink-primary tabular-nums">
              {logCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
