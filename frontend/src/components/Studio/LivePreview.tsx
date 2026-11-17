import React, { useState } from 'react';
import { Monitor, Tablet, Smartphone, RotateCcw, ExternalLink, Sparkles } from 'lucide-react';

interface LivePreviewProps {
  filesCount: number;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ filesCount }) => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);

  const getFrameWidth = () => {
    switch (device) {
      case 'mobile':
        return 'w-[375px] h-[667px]';
      case 'tablet':
        return 'w-[768px] h-[800px]';
      default:
        return 'w-full h-full';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070a12] overflow-hidden">
      {/* Viewport Control Bar */}
      <div className="h-10 px-4 border-b border-[#1f293d] bg-[#0c1220] flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
          <button
            onClick={() => setDevice('desktop')}
            className={`p-1.5 rounded transition ${device === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Desktop View"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`p-1.5 rounded transition ${device === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Tablet View"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`p-1.5 rounded transition ${device === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Mobile View"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Refresh Preview"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview Canvas Container */}
      <div className="flex-1 p-4 flex items-center justify-center overflow-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        <div
          key={refreshKey}
          className={`${getFrameWidth()} bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300`}
        >
          {/* Mock Browser Header */}
          <div className="h-7 bg-slate-900 border-b border-slate-800 px-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="flex-1 max-w-[200px] mx-auto h-4 rounded bg-slate-950 border border-slate-800 text-[9px] text-slate-500 flex items-center justify-center font-mono">
              localhost:5173
            </div>
          </div>

          {/* Rendered Sandbox Mock */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-slate-950 to-[#0d1322]">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Live App Preview</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
              Your React components created by the AI Architect are stored and synced in MinIO and PostgreSQL.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>{filesCount} project files compiled & ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
