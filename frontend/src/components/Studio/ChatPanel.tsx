import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User as UserIcon,
  FileCode,
  Terminal,
  ArrowUpRight,
  ExternalLink,
  AlertCircle,
  MessageSquareCode,
} from 'lucide-react';
import { ChatMessage } from '../../types';
import { ThoughtAccordion } from './ThoughtAccordion';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatPanelProps {
  messages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
  error?: string | null;
  onDismissError?: () => void;
  onSendMessage: (text: string) => void;
  onSelectFile: (filePath: string) => void;
}

const QUICK_PROMPTS = [
  'Create a responsive scientific calculator in src/components/Calculator.tsx and wire it into App.tsx',
  'Build a task board with priority filters and localStorage persistence in App.tsx',
  'Create a pricing table with monthly/annual toggle in src/components/Pricing.tsx',
  'Add a searchable data table with sorting in src/components/DataTable.tsx',
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  streamingText,
  isStreaming,
  error,
  onDismissError,
  onSendMessage,
  onSelectFile,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <section
      aria-label="AI Architect chat"
      className="flex flex-col h-full bg-surface-base border-r border-line-subtle"
    >
      {/* Header */}
      <div className="h-10 px-3.5 border-b border-line-subtle flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquareCode className="w-4 h-4 text-accent-fg" aria-hidden="true" />
          <h2 className="text-xs font-semibold text-ink-primary tracking-tight">
            Codecraft Architect
          </h2>
        </div>

        <div aria-live="polite" className="flex items-center">
          {isStreaming ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-accent-fg font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-fg animate-pulse" aria-hidden="true" />
              Generating...
            </span>
          ) : (
            <span className="text-[11px] font-mono text-ink-muted">
              {messages.length > 0 ? `${messages.length} msgs` : 'Ready'}
            </span>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {messages.length === 0 && !streamingText && (
          <div className="flex flex-col items-center justify-center text-center min-h-full py-6 px-2">
            <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-line flex items-center justify-center text-accent-fg mb-3">
              <MessageSquareCode className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-ink-primary">
              Describe what you want to build
            </h3>
            <p className="text-xs text-ink-secondary max-w-xs mt-1 mb-5 leading-relaxed">
              Generate React components, refactor layouts, or iterate on your app in real time.
            </p>

            <div className="w-full space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted text-left px-0.5 mb-1">
                Starter Prompts
              </div>
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSendMessage(prompt)}
                  className="w-full text-left px-3 py-2 rounded-md bg-surface-elevated hover:bg-surface-subtle border border-line-subtle hover:border-line-strong text-xs text-ink-secondary hover:text-ink-primary transition flex items-center justify-between gap-2 group"
                >
                  <span className="line-clamp-2 leading-snug">{prompt}</span>
                  <ArrowUpRight
                    className="w-3.5 h-3.5 text-ink-muted group-hover:text-accent-fg shrink-0 transition"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={msg.id ?? idx}
            className={`flex flex-col ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-0.5">
              {msg.role === 'USER' ? (
                <>
                  <span className="text-[10px] font-medium text-ink-muted">You</span>
                  <UserIcon className="w-3 h-3 text-ink-muted" aria-hidden="true" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-accent-fg" aria-hidden="true" />
                  <span className="text-[10px] font-medium text-ink-secondary">Codecraft AI</span>
                </>
              )}
            </div>

            <div
              className={`rounded-lg px-3 py-2.5 text-xs leading-relaxed ${
                msg.role === 'USER'
                  ? 'max-w-[88%] bg-accent text-white'
                  : 'w-full bg-surface-elevated text-ink-primary border border-line-subtle'
              }`}
            >
              {msg.role === 'USER' && (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              )}

              {msg.role === 'ASSISTANT' && (
                <div className="space-y-2">
                  {msg.events && msg.events.length > 0 ? (
                    msg.events.map((ev, evIdx) => {
                      if (ev.type === 'THOUGHT') {
                        return (
                          <ThoughtAccordion
                            key={ev.id ?? evIdx}
                            content={ev.content || 'Reasoning step'}
                          />
                        );
                      }

                      if (ev.type === 'FILE_EDIT' && ev.filePath) {
                        return (
                          <button
                            key={ev.id ?? evIdx}
                            type="button"
                            onClick={() => onSelectFile(ev.filePath!)}
                            className="w-full px-2.5 py-2 rounded-md bg-surface-inset hover:bg-surface-subtle border border-line hover:border-accent/50 flex items-center justify-between gap-2 transition text-left group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileCode
                                className="w-3.5 h-3.5 text-accent-fg shrink-0"
                                aria-hidden="true"
                              />
                              <span className="font-mono text-[11px] text-ink-primary truncate">
                                {ev.filePath}
                              </span>
                            </div>
                            <span className="text-[10px] text-accent-fg font-medium inline-flex items-center gap-1 shrink-0">
                              <span>Open</span>
                              <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </span>
                          </button>
                        );
                      }

                      if (ev.type === 'TOOL_LOG' && ev.content) {
                        return (
                          <div
                            key={ev.id ?? evIdx}
                            className="px-2.5 py-1.5 rounded-md bg-surface-inset border border-line-subtle font-mono text-[11px] text-ink-muted flex items-start gap-2"
                          >
                            <Terminal className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                            <span className="break-words">{ev.content}</span>
                          </div>
                        );
                      }

                      if (ev.type === 'MESSAGE') {
                        return (
                          <div key={ev.id ?? evIdx} className="space-y-1">
                            {ev.metadata && (
                              <span className="inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-subtle text-ink-muted font-mono">
                                {ev.metadata}
                              </span>
                            )}
                            <MarkdownRenderer content={ev.content || ''} />
                          </div>
                        );
                      }

                      return null;
                    })
                  ) : (
                    <MarkdownRenderer content={msg.content || 'Changes applied.'} />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Stream Output */}
        {streamingText && (
          <div className="flex flex-col items-start w-full animate-fade-in">
            <div className="flex items-center gap-1.5 mb-1 px-0.5">
              <Bot className="w-3 h-3 text-accent-fg" aria-hidden="true" />
              <span className="text-[10px] font-medium text-accent-fg">
                Codecraft AI · Streaming
              </span>
            </div>
            <div className="w-full rounded-lg p-3 bg-surface-inset border border-accent/40 text-xs text-ink-primary font-mono whitespace-pre-wrap break-words leading-relaxed">
              {streamingText}
              <span
                className="inline-block w-1.5 h-3.5 ml-0.5 bg-accent-fg animate-pulse align-middle"
                aria-hidden="true"
              />
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start justify-between gap-2"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
            {onDismissError && (
              <button
                type="button"
                onClick={onDismissError}
                className="text-[11px] text-rose-700 dark:text-rose-200 hover:underline shrink-0"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Prompt Composer */}
      <div className="p-3 border-t border-line-subtle bg-surface-base shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <label htmlFor="chat-prompt-input" className="sr-only">
            Prompt Codecraft AI
          </label>
          <textarea
            id="chat-prompt-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder={
              isStreaming
                ? 'Generating changes...'
                : 'Describe a feature, component, or bug fix...'
            }
            rows={2}
            className="w-full resize-none rounded-md bg-surface-inset border border-line px-3 py-2.5 pr-11 text-xs text-ink-primary placeholder-ink-muted focus:border-accent-fg focus:outline-none transition disabled:opacity-50 leading-relaxed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            aria-label="Send prompt"
            className="absolute right-2 bottom-2.5 p-1.5 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-40 text-white transition"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-1.5 px-0.5 text-[10px] text-ink-muted font-mono">
          <span>Enter to send · Shift+Enter newline</span>
          <span>React 18 · TS · Tailwind</span>
        </div>
      </div>
    </section>
  );
};
