import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Code,
  ShieldAlert,
  MessageSquareCode,
  PanelLeft,
} from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { FileExplorer } from './FileExplorer';
import { CodeViewer } from './CodeViewer';
import { LivePreview } from './LivePreview';
import { AdversaryPanel } from './AdversaryPanel';
import { ProjectSummary, ChatMessage, FileNode } from '../../types';
import {
  fetchChatHistory,
  fetchFileTree,
  fetchFileContent,
  streamChat,
  streamWebAdversary,
} from '../../api/client';

interface StudioWorkspaceProps {
  project: ProjectSummary;
}

type WorkspaceTab = 'code' | 'preview' | 'adversary';

const DEFAULT_CHAT_WIDTH = 410;
const MIN_CHAT_WIDTH = 300;
const MAX_CHAT_WIDTH = 640;

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({ project }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('code');
  const [mobilePane, setMobilePane] = useState<'chat' | 'workspace'>('chat');
  const [explorerOpenDesktop, setExplorerOpenDesktop] = useState(true);
  const [explorerOpenMobile, setExplorerOpenMobile] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);

  // Resizable split pane state (desktop)
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [adversaryRunning, setAdversaryRunning] = useState(false);
  const [adversaryReport, setAdversaryReport] = useState<string | null>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, e.clientX - rect.left));
      setChatWidth(next);
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleSelectFile = useCallback(
    async (path: string, shouldSwitchTab = false) => {
      setActiveFile(path);
      setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
      if (shouldSwitchTab) {
        setActiveTab('code');
        setMobilePane('workspace');
      }
      setLoadingFile(true);
      try {
        const res = await fetchFileContent(project.id, path);
        setFileContent(res.content);
      } catch {
        setFileContent('// Unable to load file content from server.');
      } finally {
        setLoadingFile(false);
      }
    },
    [project.id]
  );

  const handleCloseTab = useCallback(
    (pathToClose: string) => {
      setOpenTabs((prev) => {
        const idx = prev.indexOf(pathToClose);
        const next = prev.filter((p) => p !== pathToClose);
        if (activeFile === pathToClose) {
          const fallback = next[Math.min(idx, next.length - 1)] || null;
          if (fallback) {
            handleSelectFile(fallback, false);
          } else {
            setActiveFile(null);
            setFileContent(null);
          }
        }
        return next;
      });
    },
    [activeFile, handleSelectFile]
  );

  const loadChat = useCallback(async () => {
    try {
      const history = await fetchChatHistory(project.id);
      setMessages(history);
    } catch {
      setChatError('Failed to load conversation history.');
    }
  }, [project.id]);

  const loadFiles = useCallback(
    async (preferredFile?: string) => {
      setLoadingFiles(true);
      try {
        const res = await fetchFileTree(project.id);
        const treeFiles = res.files || [];
        setFiles(treeFiles);

        if (treeFiles.length > 0) {
          const target = preferredFile || activeFile;
          if (target && treeFiles.some((f) => f.path === target)) {
            handleSelectFile(target, false);
          } else {
            handleSelectFile(treeFiles[0].path, false);
          }
        }
      } catch {
        // Retain current tree on transient failure
      } finally {
        setLoadingFiles(false);
      }
    },
    [project.id, activeFile, handleSelectFile]
  );

  useEffect(() => {
    loadChat();
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const handleSendMessage = async (text: string) => {
    setChatError(null);
    const userMsg: ChatMessage = {
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingText('');

    let accumulated = '';

    await streamChat(
      project.id,
      text,
      (chunk) => {
        accumulated += chunk;
        setStreamingText((prev) => prev + chunk);
      },
      () => {
        setIsStreaming(false);
        setStreamingText('');

        const fileMatch = accumulated.match(/<file[^>]*path=["']?([^"'>\s]+)["']?[^>]*>/i);
        const generatedFile = fileMatch ? fileMatch[1] : undefined;

        loadChat();
        loadFiles(generatedFile);
        setPreviewVersion((v) => v + 1);

        window.setTimeout(() => {
          loadChat();
          loadFiles(generatedFile);
          setPreviewVersion((v) => v + 1);
        }, 1500);
      },
      (err) => {
        setIsStreaming(false);
        setStreamingText('');
        setChatError(err?.message || 'Failed to stream AI response. Please try again.');
        loadChat();
      }
    );
  };

  const handleRunAdversary = async (targetFilePath: string) => {
    setAdversaryRunning(true);
    setAdversaryReport('');
    try {
      await streamWebAdversary(
        project.id,
        targetFilePath,
        (chunk) => setAdversaryReport((prev) => (prev || '') + chunk),
        () => {
          setAdversaryRunning(false);
          loadFiles();
          setPreviewVersion((v) => v + 1);
        },
        (err) => {
          setAdversaryRunning(false);
          setAdversaryReport(
            (prev) =>
              `${prev ? `${prev}\n` : ''}Scan interrupted: ${err?.message || 'Unexpected error'}`
          );
        }
      );
    } catch (err: any) {
      setAdversaryRunning(false);
      setAdversaryReport(`Failed to start Web Adversary scan: ${err?.message || 'Unknown error'}`);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-surface-canvas"
    >
      {/* Mobile / Tablet Pane Switcher */}
      <div
        role="tablist"
        aria-label="Mobile workspace view"
        className="flex lg:hidden border-b border-line-subtle bg-surface-base px-3 py-1.5 gap-1.5 shrink-0"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === 'chat'}
          onClick={() => setMobilePane('chat')}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 transition ${
            mobilePane === 'chat'
              ? 'bg-accent text-white'
              : 'bg-surface-subtle text-ink-secondary'
          }`}
        >
          <MessageSquareCode className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Architect Chat</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === 'workspace'}
          onClick={() => setMobilePane('workspace')}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 transition ${
            mobilePane === 'workspace'
              ? 'bg-accent text-white'
              : 'bg-surface-subtle text-ink-secondary'
          }`}
        >
          <Code className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Code &amp; Preview</span>
        </button>
      </div>

      {/* Left: Chat Panel (Resizable on Desktop) */}
      <div
        style={{ '--chat-pane-width': `${chatWidth}px` } as React.CSSProperties}
        className={`${
          mobilePane === 'chat' ? 'flex' : 'hidden'
        } lg:flex flex-col w-full lg:w-[var(--chat-pane-width)] shrink-0 flex-1 lg:flex-none lg:h-full overflow-hidden`}
      >
        <ChatPanel
          messages={messages}
          streamingText={streamingText}
          isStreaming={isStreaming}
          error={chatError}
          onDismissError={() => setChatError(null)}
          onSendMessage={handleSendMessage}
          onSelectFile={(filePath) => handleSelectFile(filePath, true)}
        />
      </div>

      {/* Resizable Divider (Desktop only) */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat and workspace panels"
        aria-valuemin={MIN_CHAT_WIDTH}
        aria-valuemax={MAX_CHAT_WIDTH}
        aria-valuenow={chatWidth}
        tabIndex={0}
        onMouseDown={() => setIsResizing(true)}
        onDoubleClick={() => setChatWidth(DEFAULT_CHAT_WIDTH)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setChatWidth((w) => Math.max(MIN_CHAT_WIDTH, w - 24));
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            setChatWidth((w) => Math.min(MAX_CHAT_WIDTH, w + 24));
          }
        }}
        title="Drag to resize · Double-click to reset"
        className={`hidden lg:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center transition group ${
          isResizing ? 'bg-accent/30' : 'hover:bg-accent/20'
        }`}
      >
        <span
          aria-hidden="true"
          className={`w-0.5 h-8 rounded-full transition ${
            isResizing ? 'bg-accent' : 'bg-line group-hover:bg-accent-fg'
          }`}
        />
      </div>

      {/* Right: Code / Preview / Adversary Workspace */}
      <section
        aria-label="Project workspace"
        className={`${
          mobilePane === 'workspace' ? 'flex' : 'hidden'
        } lg:flex flex-1 flex-col h-full bg-surface-canvas overflow-hidden min-w-0`}
      >
        {/* Top Tab Bar */}
        <div className="h-10 px-3 border-b border-line-subtle bg-surface-base flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {activeTab === 'code' && (
              <button
                type="button"
                onClick={() => setExplorerOpenDesktop((prev) => !prev)}
                aria-label={explorerOpenDesktop ? 'Collapse file explorer' : 'Expand file explorer'}
                aria-pressed={explorerOpenDesktop}
                title="Toggle explorer"
                className="hidden lg:inline-flex p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-subtle transition"
              >
                <PanelLeft className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}

            <div role="tablist" aria-label="Workspace panels" className="flex items-center gap-1">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'code'}
                onClick={() => setActiveTab('code')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  activeTab === 'code'
                    ? 'bg-surface-subtle text-ink-primary border border-line'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle/60 border border-transparent'
                }`}
              >
                <Code className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Code</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'preview'}
                onClick={() => setActiveTab('preview')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  activeTab === 'preview'
                    ? 'bg-surface-subtle text-ink-primary border border-line'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle/60 border border-transparent'
                }`}
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Preview</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'adversary'}
                onClick={() => setActiveTab('adversary')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  activeTab === 'adversary'
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                    : 'text-ink-secondary hover:text-rose-700 dark:hover:text-rose-300 hover:bg-surface-subtle/60 border border-transparent'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Adversary</span>
              </button>
            </div>
          </div>

          <span className="text-[11px] text-ink-muted font-mono tabular-nums shrink-0 hidden sm:inline">
            #{project.id} · {project.role}
          </span>
        </div>

        {/* Active Panel */}
        <div role="tabpanel" className="flex-1 flex overflow-hidden relative">
          {activeTab === 'code' && (
            <div className="flex-1 flex h-full overflow-hidden relative">
              {explorerOpenDesktop && (
                <div className="hidden lg:flex h-full">
                  <FileExplorer
                    files={files}
                    activeFile={activeFile}
                    loading={loadingFiles}
                    onSelectFile={(filePath) => handleSelectFile(filePath, true)}
                  />
                </div>
              )}

              {/* Mobile File Explorer Drawer */}
              {explorerOpenMobile && (
                <div
                  className="fixed inset-0 z-40 flex lg:hidden bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs"
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) setExplorerOpenMobile(false);
                  }}
                >
                  <FileExplorer
                    files={files}
                    activeFile={activeFile}
                    loading={loadingFiles}
                    onSelectFile={(filePath) => handleSelectFile(filePath, true)}
                    onCloseMobile={() => setExplorerOpenMobile(false)}
                  />
                </div>
              )}

              <CodeViewer
                filePath={activeFile}
                code={fileContent}
                loading={loadingFile}
                openTabs={openTabs}
                onSelectTab={(filePath) => handleSelectFile(filePath, false)}
                onCloseTab={handleCloseTab}
                onToggleExplorer={() => setExplorerOpenMobile(true)}
              />
            </div>
          )}

          {activeTab === 'preview' && (
            <LivePreview
              projectId={project.id}
              files={files}
              activeFile={activeFile}
              previewVersion={previewVersion}
            />
          )}

          {activeTab === 'adversary' && (
            <AdversaryPanel
              files={files}
              activeFile={activeFile}
              running={adversaryRunning}
              report={adversaryReport}
              onRunScan={handleRunAdversary}
            />
          )}
        </div>
      </section>
    </div>
  );
};
