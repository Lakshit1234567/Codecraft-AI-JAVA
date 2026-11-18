import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User as UserIcon, 
  FileCode, 
  Clock, 
  CheckCircle2, 
  Wand2,
  Terminal,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';
import { ChatMessage, ChatEvent } from '../../types';
import { ThoughtAccordion } from './ThoughtAccordion';

interface ChatPanelProps {
  messages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
  onSendMessage: (text: string) => void;
  onSelectFile: (filePath: string) => void;
}

const QUICK_PROMPTS = [
  'Create a modern responsive calculator in src/components/Calculator.tsx and connect it in App.tsx',
  'Add a modern Hero section with CTA in src/components/Hero.tsx',
  'Build a Todo list app with filter and local storage in App.tsx',
  'Add a Feature Grid component with icons in src/components/Features.tsx',
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  streamingText,
  isStreaming,
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
    <div className="flex flex-col h-full bg-[#0c1220] border-r border-[#1f293d]">
      {/* Header */}
      <div className="p-3.5 border-b border-[#1f293d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Architect</h3>
        </div>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Generating Code...
          </span>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingText && (
          <div className="flex flex-col items-center justify-center text-center h-full text-slate-400 py-10 px-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
              <Wand2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">What would you like to build?</h4>
            <p className="text-xs text-slate-400 max-w-xs mb-6">
              Ask Lovable AI to create React components, update styles, or architect your application.
            </p>

            <div className="w-full space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block text-left mb-1">
                Suggested Prompts
              </span>
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(prompt)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition flex items-center justify-between group"
                >
                  <span className="truncate">{prompt}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1">
              {msg.role === 'USER' ? (
                <>
                  <span className="text-[10px] font-semibold text-slate-400">You</span>
                  <UserIcon className="w-3 h-3 text-slate-500" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-indigo-400" />
                  <span className="text-[10px] font-semibold text-indigo-300">Lovable AI</span>
                </>
              )}
            </div>

            <div
              className={`max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                msg.role === 'USER'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10 rounded-tr-sm'
                  : 'bg-slate-900/90 text-slate-200 border border-slate-800 shadow-md rounded-tl-sm w-full'
              }`}
            >
              {/* User Plain Content */}
              {msg.role === 'USER' && <div className="whitespace-pre-wrap">{msg.content}</div>}

              {/* Assistant Events */}
              {msg.role === 'ASSISTANT' && (
                <div className="space-y-2">
                  {msg.events && msg.events.length > 0 ? (
                    msg.events.map((ev, evIdx) => {
                      if (ev.type === 'THOUGHT') {
                        return <ThoughtAccordion key={evIdx} content={ev.content || 'Thought process'} />;
                      }

                      if (ev.type === 'FILE_EDIT' && ev.filePath) {
                        return (
                          <div
                            key={evIdx}
                            onClick={() => onSelectFile(ev.filePath!)}
                            className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between hover:bg-indigo-950/60 cursor-pointer transition group shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <FileCode className="w-4 h-4 text-indigo-400" />
                              <span className="font-mono text-[11px] text-indigo-200 font-medium">
                                {ev.filePath}
                              </span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-500/30 font-medium transition flex items-center gap-1">
                              <span>Open in Editor</span>
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          </div>
                        );
                      }

                      if (ev.type === 'MESSAGE') {
                        return (
                          <div key={evIdx} className="text-slate-200 leading-normal">
                            {ev.metadata && (
                              <span className="inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold mr-1.5">
                                {ev.metadata}
                              </span>
                            )}
                            {ev.content}
                          </div>
                        );
                      }

                      return null;
                    })
                  ) : (
                    <div className="text-slate-200 leading-normal whitespace-pre-wrap">
                      {msg.content || 'Response generated.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Streaming Bubble */}
        {streamingText && (
          <div className="flex flex-col items-start w-full animate-in fade-in">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <Bot className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-semibold text-indigo-300">Lovable AI (Generating...)</span>
            </div>
            <div className="w-full rounded-2xl rounded-tl-sm p-3.5 bg-slate-900 border border-indigo-500/30 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed shadow-lg">
              {streamingText}
              <span className="inline-block w-1.5 h-3 ml-1 bg-indigo-400 animate-pulse align-middle" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-[#1f293d] bg-[#0c1220]">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder={isStreaming ? "AI is generating code..." : "Ask Lovable AI to build, modify or style components (Enter to send)..."}
            rows={2}
            className="w-full resize-none rounded-xl bg-slate-950 border border-slate-800 p-3 pr-12 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="absolute right-2.5 bottom-3.5 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition shadow-md shadow-indigo-600/20"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-500">
          <span>Tip: Shift + Enter for new line</span>
          <span>Stack: React 18 + TS + Tailwind</span>
        </div>
      </div>
    </div>
  );
};
