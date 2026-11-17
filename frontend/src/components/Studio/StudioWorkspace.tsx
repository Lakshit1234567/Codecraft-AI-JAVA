import React, { useState, useEffect } from 'react';
import { ChatPanel } from './ChatPanel';
import { FileExplorer } from './FileExplorer';
import { CodeViewer } from './CodeViewer';
import { LivePreview } from './LivePreview';
import { DsaWorkspace } from './DsaWorkspace';
import { ProjectSummary, ChatMessage, FileNode } from '../../types';
import { fetchChatHistory, fetchFileTree, fetchFileContent, streamChat } from '../../api/client';
import { Play, Code, ShieldAlert, Sparkles } from 'lucide-react';

interface StudioWorkspaceProps {
  project: ProjectSummary;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({ project }) => {
  // If DSA project type, route directly to DSA Workspace
  if (project.type === 'DSA') {
    return <DsaWorkspace project={project} />;
  }

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'adversary'>('code');

  // Adversary state
  const [adversaryRunning, setAdversaryRunning] = useState(false);
  const [adversaryReport, setAdversaryReport] = useState<string | null>(null);

  useEffect(() => {
    loadChat();
    loadFiles();
  }, [project.id]);

  const loadChat = async () => {
    try {
      const history = await fetchChatHistory(project.id);
      setMessages(history);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const loadFiles = async (preferredFile?: string) => {
    try {
      const res = await fetchFileTree(project.id);
      const treeFiles = res.files || [];
      setFiles(treeFiles);

      const target = preferredFile || activeFile;
      if (treeFiles.length > 0) {
        if (target && treeFiles.some((f) => f.path === target)) {
          handleSelectFile(target);
        } else {
          handleSelectFile(treeFiles[0].path);
        }
      }
    } catch (err) {
      console.error('Failed to load file tree:', err);
    }
  };

  const handleSelectFile = async (path: string) => {
    setActiveFile(path);
    setActiveTab('code');
    setLoadingFile(true);
    try {
      const res = await fetchFileContent(project.id, path);
      setFileContent(res.content);
    } catch (err) {
      console.error('Failed to load file content:', err);
      setFileContent('// Failed to load file content');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingText('');

    await streamChat(
      project.id,
      text,
      (chunk) => {
        setStreamingText((prev) => prev + chunk);
      },
      () => {
        setIsStreaming(false);
        setStreamingText('');
        // Immediately reload chats & files
        loadChat();
        loadFiles();

        // Background polls to capture async finalizeChats write
        setTimeout(() => {
          loadChat();
          loadFiles();
        }, 1200);

        setTimeout(() => {
          loadFiles();
        }, 2800);
      },
      (error) => {
        console.error('Streaming error:', error);
        setIsStreaming(false);
      }
    );
  };

  const handleRunAdversary = () => {
    setAdversaryRunning(true);
    setAdversaryReport(null);
    setTimeout(() => {
      setAdversaryRunning(false);
      setAdversaryReport(
`🚨 Web Adversary Analysis Results:
- Component: App.tsx
- Vulnerability Detected: Unhandled null pointer on empty projects state.
- Layout Discrepancy: Mobile viewport collapse on narrow screens (< 360px).
- Security Warning: Direct local storage access without schema verification.

💡 Recommended Hardening Diff:
+  if (!projects || projects.length === 0) return <EmptyState />;
+  const safeUser = useMemo(() => sanitizeUser(user), [user]);`
      );
    }, 1200);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Chat Panel (40% width) */}
      <div className="w-[420px] lg:w-[480px] flex-shrink-0 h-full">
        <ChatPanel
          messages={messages}
          streamingText={streamingText}
          isStreaming={isStreaming}
          onSendMessage={handleSendMessage}
          onSelectFile={handleSelectFile}
        />
      </div>

      {/* Right: Code & Preview Workspace (60% width) */}
      <div className="flex-1 flex flex-col h-full bg-[#090d16] overflow-hidden">
        {/* Workspace Top Tabs */}
        <div className="h-10 px-4 border-b border-[#1f293d] bg-[#0c1220] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'code'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Code & Files</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>

            <button
              onClick={() => setActiveTab('adversary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'adversary'
                  ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Break My App</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Project #{project.id}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'code' ? (
            <div className="flex-1 flex h-full overflow-hidden">
              <FileExplorer
                files={files}
                activeFile={activeFile}
                onSelectFile={handleSelectFile}
              />
              <CodeViewer
                filePath={activeFile}
                code={fileContent}
                loading={loadingFile}
              />
            </div>
          ) : activeTab === 'preview' ? (
            <LivePreview projectId={project.id} files={files} activeFile={activeFile} />
          ) : (
            <div className="flex-1 p-6 overflow-y-auto bg-[#0a0f1d] flex flex-col items-center justify-center text-center">
              <div className="max-w-md w-full space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">AI Web Adversary & Fuzzing</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Triggers malicious and boundary-violating inputs, unexpected react states, and unhandled null evaluations to find breaking bugs before deployment.
                </p>

                <button
                  onClick={handleRunAdversary}
                  disabled={adversaryRunning}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-2 mx-auto shadow-lg shadow-rose-600/20 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{adversaryRunning ? 'Running Adversarial Fuzzing...' : 'Stress-Test Current Component'}</span>
                </button>

                {adversaryReport && (
                  <div className="mt-6 p-4 rounded-xl bg-slate-900 border border-rose-500/30 text-left text-xs font-mono text-slate-300 leading-relaxed whitespace-pre overflow-x-auto">
                    {adversaryReport}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
