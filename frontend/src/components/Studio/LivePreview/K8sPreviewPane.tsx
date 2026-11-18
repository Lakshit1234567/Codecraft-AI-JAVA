import React from 'react';
import { Box, RefreshCw, Server, Square } from 'lucide-react';
import { K8sPreviewStatusResponse } from '../../../types';

interface K8sPreviewPaneProps {
  projectId: number;
  status: K8sPreviewStatusResponse | null;
  deploying: boolean;
  terminating: boolean;
  refreshKey: number;
  onDeploy: () => void;
  onTerminate: () => void;
}

export const K8sPreviewPane: React.FC<K8sPreviewPaneProps> = ({
  projectId,
  status,
  deploying,
  terminating,
  refreshKey,
  onDeploy,
  onTerminate,
}) => {
  const isRunning = status?.status === 'RUNNING';

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* Cluster metadata bar */}
      <div className="px-3.5 py-2.5 rounded-lg bg-surface-elevated border border-line flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-secondary">
          <span className="inline-flex items-center gap-1.5 text-ink-primary font-medium">
            <Box className="w-3.5 h-3.5 text-accent-fg" aria-hidden="true" />
            {status?.cluster || 'codecraft-cluster'}
          </span>
          <span>
            Pod: <code className="text-ink-primary">{status?.podName || `preview-pod-${projectId}`}</code>
          </span>
          <span className="hidden md:inline">
            Node: <code className="text-ink-muted">{status?.nodeName || 'control-plane'}</code>
          </span>
          <span>
            Port:{' '}
            <code className="text-amber-700 dark:text-amber-400">
              {status?.port ? `localhost:${status.port}` : 'Pending'}
            </code>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <button
              type="button"
              onClick={onTerminate}
              disabled={terminating}
              className="px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-sans font-medium inline-flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Square className="w-3 h-3 fill-current" aria-hidden="true" />
              <span>{terminating ? 'Stopping...' : 'Stop Pod'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Container frame */}
      <div className="flex-1 rounded-lg bg-surface-inset border border-line overflow-hidden relative">
        {isRunning ? (
          <iframe
            key={refreshKey}
            src={status?.previewUrl ? `${status.previewUrl}?v=${refreshKey}` : undefined}
            title="Kubernetes Pod Preview"
            className="w-full h-full bg-surface-inset border-0"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-11 h-11 rounded-lg bg-surface-elevated border border-line text-accent-fg flex items-center justify-center mb-3">
              <Server className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-ink-primary">
              Isolated Kubernetes Preview
            </h3>
            <p className="text-xs text-ink-secondary max-w-md mt-1 mb-5 leading-relaxed">
              Deploy this project to a dedicated Kubernetes pod inside{' '}
              <code className="text-ink-primary">
                {status?.cluster || 'codecraft-cluster'}
              </code>{' '}
              for full runtime parity.
            </p>
            <button
              type="button"
              onClick={onDeploy}
              disabled={deploying}
              className="px-4 py-2 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium inline-flex items-center gap-2 transition"
            >
              {deploying ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Box className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{deploying ? 'Provisioning Pod...' : 'Deploy Kubernetes Pod'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
