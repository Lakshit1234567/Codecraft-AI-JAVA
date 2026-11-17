import React, { useState } from 'react';
import { Copy, Check, FileCode, Terminal } from 'lucide-react';

interface CodeViewerProps {
  filePath: string | null;
  code: string | null;
  loading: boolean;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ filePath, code, loading }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!filePath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs p-6">
        <FileCode className="w-8 h-8 mb-2 text-slate-600" />
        <span>Select a file from the explorer to view code</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-xs p-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span>Loading {filePath}...</span>
        </div>
      </div>
    );
  }

  const lines = code ? code.split('\n') : [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090d16] overflow-hidden">
      {/* File Header */}
      <div className="h-10 px-4 border-b border-[#1f293d] bg-[#0c1220] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-mono font-medium text-slate-200">{filePath}</span>
          <span className="text-[10px] text-slate-500 font-mono">({lines.length} lines)</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-[11px] font-medium text-slate-300 hover:text-white transition border border-slate-700/60"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="flex-1 overflow-auto p-4 text-xs font-mono flex select-text">
        {/* Line Numbers */}
        <div className="select-none text-slate-600 text-right pr-4 border-r border-slate-800/80 space-y-1">
          {lines.map((_, i) => (
            <div key={i} className="leading-5 h-5">{i + 1}</div>
          ))}
        </div>

        {/* Code Content */}
        <pre className="pl-4 text-slate-200 space-y-1 flex-1 overflow-x-auto leading-5">
          {lines.map((line, i) => (
            <div key={i} className="h-5 whitespace-pre">
              {line || ' '}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
};
