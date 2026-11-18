import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { FileNode, K8sPreviewStatusResponse } from '../../types';
import {
  fetchFileContent,
  deployK8sPreview,
  getK8sPreviewStatus,
  terminateK8sPreview,
} from '../../api/client';
import { buildSandboxHtml } from './LivePreview/sandboxBuilder';
import { PreviewToolbar, PreviewMode, ViewportDevice } from './LivePreview/PreviewToolbar';
import { K8sPreviewPane } from './LivePreview/K8sPreviewPane';
import { ConsoleDrawer, ConsoleEntry } from './LivePreview/ConsoleDrawer';
import { useToast } from '../ui/ToastProvider';

interface LivePreviewProps {
  projectId: number;
  files: FileNode[];
  activeFile?: string | null;
  previewVersion?: number;
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  projectId,
  files,
  previewVersion = 0,
}) => {
  const { notify } = useToast();
  const [previewMode, setPreviewMode] = useState<PreviewMode>('sandbox');
  const [device, setDevice] = useState<ViewportDevice>('desktop');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<ConsoleEntry[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [k8sStatus, setK8sStatus] = useState<K8sPreviewStatusResponse | null>(null);
  const [deployingK8s, setDeployingK8s] = useState(false);
  const [terminatingK8s, setTerminatingK8s] = useState(false);
  const [k8sRefreshKey, setK8sRefreshKey] = useState(0);

  const checkK8sStatus = useCallback(async () => {
    try {
      const res = await getK8sPreviewStatus(projectId);
      setK8sStatus(res);
    } catch {
      // Cluster preview may not be provisioned yet
    }
  }, [projectId]);

  const compileAndRender = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLogs([]);

    try {
      const relevantFiles = files.filter(
        (f) => f.path.endsWith('.tsx') || f.path.endsWith('.ts') || f.path.endsWith('.css')
      );

      const contentsMap: Record<string, string> = {};
      await Promise.all(
        relevantFiles.map(async (file) => {
          try {
            const res = await fetchFileContent(projectId, file.path);
            contentsMap[file.path] = res.content;
          } catch {
            // Skip unreadable auxiliary files
          }
        })
      );

      const appCode = contentsMap['src/App.tsx'] || contentsMap['App.tsx'] || '';
      const cssCode =
        contentsMap['src/index.css'] ||
        contentsMap['index.css'] ||
        contentsMap['src/App.css'] ||
        '';

      if (!appCode) {
        setError('No App.tsx found yet. Prompt Codecraft Architect to generate your first component.');
        return;
      }

      const html = buildSandboxHtml(appCode, contentsMap, cssCode);
      if (iframeRef.current) {
        iframeRef.current.srcdoc = html;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to assemble sandbox preview');
    } finally {
      setLoading(false);
    }
  }, [projectId, files]);

  useEffect(() => {
    if (previewMode === 'sandbox') {
      compileAndRender();
    } else {
      checkK8sStatus();
    }
  }, [previewMode, previewVersion, refreshKey, k8sRefreshKey, compileAndRender, checkK8sStatus]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PREVIEW_CONSOLE') {
        const level: 'info' | 'error' = event.data.level === 'error' ? 'error' : 'info';
        setLogs((prev) => [...prev.slice(-49), { level, message: String(event.data.message || '') }]);
      } else if (event.data?.type === 'PREVIEW_ERROR') {
        setError(String(event.data.message || 'Runtime error in preview'));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleDeployK8s = async () => {
    setDeployingK8s(true);
    setError(null);
    try {
      const res = await deployK8sPreview(projectId);
      setK8sStatus(res);
      setK8sRefreshKey((k) => k + 1);
      notify('Kubernetes preview pod deployed', 'success');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to deploy Kubernetes pod');
    } finally {
      setDeployingK8s(false);
    }
  };

  const handleTerminateK8s = async () => {
    setTerminatingK8s(true);
    try {
      await terminateK8sPreview(projectId);
      setK8sStatus(null);
      notify('Kubernetes preview pod stopped', 'info');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to terminate pod');
    } finally {
      setTerminatingK8s(false);
    }
  };

  const openInNewTab = () => {
    if (previewMode === 'k8s' && k8sStatus?.previewUrl) {
      window.open(k8sStatus.previewUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!iframeRef.current?.srcdoc) return;
    const blob = new Blob([iframeRef.current.srcdoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const frameClass =
    device === 'mobile'
      ? 'w-[375px] max-w-full h-[680px] rounded-xl border-2 border-line-strong'
      : device === 'tablet'
      ? 'w-[768px] max-w-full h-[820px] rounded-lg border-2 border-line-strong'
      : 'w-full h-full rounded-none border-0';

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-canvas overflow-hidden">
      <PreviewToolbar
        previewMode={previewMode}
        device={device}
        loading={loading}
        showConsole={showConsole}
        logCount={logs.length}
        k8sStatus={k8sStatus}
        deployingK8s={deployingK8s}
        onChangeMode={setPreviewMode}
        onChangeDevice={setDevice}
        onDeployK8s={handleDeployK8s}
        onReload={() =>
          previewMode === 'k8s' ? setK8sRefreshKey((k) => k + 1) : setRefreshKey((k) => k + 1)
        }
        onOpenExternal={openInNewTab}
        onToggleConsole={() => setShowConsole((prev) => !prev)}
      />

      <div className="flex-1 p-3 flex flex-col items-center justify-center overflow-auto preview-grid-bg relative">
        {error && (
          <div
            role="alert"
            className="absolute top-3 left-3 right-3 z-20 px-3.5 py-2.5 rounded-lg bg-rose-50 dark:bg-surface-elevated border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3 shadow-popover"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{error}</span>
            </div>
            <button
              type="button"
              onClick={() =>
                previewMode === 'k8s' ? handleDeployK8s() : setRefreshKey((k) => k + 1)
              }
              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-medium shrink-0 transition"
            >
              Retry
            </button>
          </div>
        )}

        {previewMode === 'k8s' ? (
          <K8sPreviewPane
            projectId={projectId}
            status={k8sStatus}
            deploying={deployingK8s}
            terminating={terminatingK8s}
            refreshKey={k8sRefreshKey}
            onDeploy={handleDeployK8s}
            onTerminate={handleTerminateK8s}
          />
        ) : (
          <div
            className={`${frameClass} bg-surface-inset flex flex-col overflow-hidden transition-all duration-200 relative`}
          >
            {device !== 'desktop' && (
              <div className="h-6 bg-surface-elevated border-b border-line px-3 flex items-center justify-between select-none shrink-0">
                <span className="text-[10px] text-ink-muted font-mono">
                  {device === 'mobile' ? '375 × 680 · Mobile' : '768 × 820 · Tablet'}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">Sandbox</span>
              </div>
            )}

            <iframe
              ref={iframeRef}
              title="Application live preview"
              sandbox="allow-scripts allow-same-origin allow-modals allow-forms"
              className="w-full h-full bg-surface-inset border-0 flex-1"
            />
          </div>
        )}
      </div>

      {showConsole && (
        <ConsoleDrawer
          logs={logs}
          onClear={() => setLogs([])}
          onClose={() => setShowConsole(false)}
        />
      )}
    </div>
  );
};
