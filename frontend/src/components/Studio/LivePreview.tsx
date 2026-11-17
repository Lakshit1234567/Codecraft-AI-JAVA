import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  RotateCcw, 
  ExternalLink, 
  Sparkles, 
  AlertTriangle,
  Terminal,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { FileNode } from '../../types';
import { fetchFileContent } from '../../api/client';

interface LivePreviewProps {
  projectId: number;
  files: FileNode[];
  activeFile?: string | null;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ projectId, files }) => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    compileAndRender();
  }, [projectId, files.length, refreshKey]);

  // Listen to postMessage from iframe for errors & console logs
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PREVIEW_CONSOLE') {
        setLogs((prev) => [...prev.slice(-49), `[${event.data.level}] ${event.data.message}`]);
      } else if (event.data?.type === 'PREVIEW_ERROR') {
        setError(event.data.message);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const compileAndRender = async () => {
    setLoading(true);
    setError(null);
    setLogs([]);

    try {
      // 1. Fetch contents of all tsx, ts, and css files
      const relevantFiles = files.filter(
        (f) => f.path.endsWith('.tsx') || f.path.endsWith('.ts') || f.path.endsWith('.css')
      );

      const contentsMap: Record<string, string> = {};
      await Promise.all(
        relevantFiles.map(async (file) => {
          try {
            const res = await fetchFileContent(projectId, file.path);
            contentsMap[file.path] = res.content;
          } catch (e) {
            console.warn('Could not read file for preview:', file.path);
          }
        })
      );

      // Find main entry point (prefer src/App.tsx)
      const appCode = contentsMap['src/App.tsx'] || contentsMap['App.tsx'] || '';
      const cssCode = contentsMap['src/index.css'] || contentsMap['index.css'] || contentsMap['src/App.css'] || '';

      if (!appCode) {
        setError('No App.tsx found in project. Generate a component or prompt the AI to create one.');
        setLoading(false);
        return;
      }

      // Generate sandbox HTML
      const html = buildSandboxHtml(appCode, contentsMap, cssCode);
      if (iframeRef.current) {
        iframeRef.current.srcdoc = html;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to assemble preview');
    } finally {
      setLoading(false);
    }
  };

  const buildSandboxHtml = (
    appCode: string,
    allFiles: Record<string, string>,
    cssCode: string
  ) => {
    // Collect subcomponents (any tsx file other than App.tsx)
    const subcomponents: { path: string; name: string; code: string }[] = [];
    for (const [path, code] of Object.entries(allFiles)) {
      if (path !== 'src/App.tsx' && path !== 'App.tsx' && path.endsWith('.tsx')) {
        const parts = path.split('/');
        const fileName = parts[parts.length - 1].replace('.tsx', '');
        subcomponents.push({ path, name: fileName, code });
      }
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Live Preview</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#eef2ff',
              100: '#e0e7ff',
              500: '#6366f1',
              600: '#4f46e5',
              700: '#4338ca',
            }
          }
        }
      }
    }
  </script>
  <!-- React 18 & ReactDOM UMD -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <!-- Babel Standalone for live JSX/TSX transpilation -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #030712;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow-x: hidden;
    }
    ${cssCode}
  </style>
</head>
<body>
  <div id="root"></div>

  <script>
    // Intercept console logs & errors to relay to parent window
    const _log = console.log;
    const _error = console.error;
    console.log = function(...args) {
      _log.apply(console, args);
      window.parent.postMessage({ type: 'PREVIEW_CONSOLE', level: 'info', message: args.join(' ') }, '*');
    };
    console.error = function(...args) {
      _error.apply(console, args);
      window.parent.postMessage({ type: 'PREVIEW_CONSOLE', level: 'error', message: args.join(' ') }, '*');
    };
    window.onerror = function(msg, url, line) {
      window.parent.postMessage({ type: 'PREVIEW_ERROR', message: msg + ' (Line ' + line + ')' }, '*');
    };
  </script>

  <!-- Lucide SVG Icons Shim -->
  <script type="text/babel">
    const { createElement: h, useState, useEffect, useMemo, useCallback, useRef } = React;

    // Universal Lucide icon generator
    function createLucideIcon(name, paths) {
      return function IconComponent({ size = 20, className = '', color = 'currentColor', strokeWidth = 2, ...props }) {
        return h('svg', {
          xmlns: 'http://www.w3.org/2000/svg',
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: color,
          strokeWidth: strokeWidth,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className: className,
          ...props
        }, paths.map((d, i) => h('path', { key: i, d })));
      };
    }

    // Lucide Icons dictionary
    window.LucideIcons = {
      Sparkles: createLucideIcon('Sparkles', [
        'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z',
        'M5 3v4', 'M19 17v4', 'M3 5h4', 'M17 19h4'
      ]),
      ArrowRight: createLucideIcon('ArrowRight', ['M5 12h14', 'm12 5 7-7-7-7']),
      Check: createLucideIcon('Check', ['M20 6 9 17l-5-5']),
      CheckCircle: createLucideIcon('CheckCircle', ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'm9 11 3 3L22 4']),
      CheckCircle2: createLucideIcon('CheckCircle2', ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'm9 12 2 2 4-4']),
      Layers: createLucideIcon('Layers', ['m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', 'm22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L2.6 12.5', 'm22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L2.6 17.5']),
      Code: createLucideIcon('Code', ['m16 18 6-6-6-6', 'm8 6-6 6 6 6']),
      Play: createLucideIcon('Play', ['m5 3 14 9-14 9V3z']),
      Zap: createLucideIcon('Zap', ['M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4z']),
      Shield: createLucideIcon('Shield', ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z']),
      Star: createLucideIcon('Star', ['M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z']),
      Trash2: createLucideIcon('Trash2', ['path', 'M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2']),
      Users: createLucideIcon('Users', ['path', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'circle cx="9" cy="7" r="4"']),
      Globe: createLucideIcon('Globe', ['circle cx="12" cy="12" r="10"']),
      Search: createLucideIcon('Search', ['circle cx="11" cy="11" r="8"', 'path d="m21 21-4.3-4.3"']),
      Menu: createLucideIcon('Menu', ['line x1="4" x2="20" y1="12" y2="12"', 'line x1="4" x2="20" y1="6" y2="6"', 'line x1="4" x2="20" y1="18" y2="18"']),
      X: createLucideIcon('X', ['path d="M18 6 6 18"', 'path d="m6 6 12 12"'])
    };

    // Proxy fallback for any icon name
    window.LucideProxy = new Proxy(window.LucideIcons, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        return function FallbackIcon(props) {
          return h('span', { className: 'inline-flex items-center text-indigo-400 font-mono text-xs', ...props }, '✦');
        };
      }
    });
  </script>

  <!-- Subcomponents & Main App Transpilation -->
  <script type="text/babel" data-presets="react,typescript">
    const { useState, useEffect, useMemo, useCallback, useRef } = React;
    const Lucide = window.LucideProxy;
    const { 
      Sparkles, ArrowRight, Check, CheckCircle, CheckCircle2, 
      Layers, Code, Play, Zap, Shield, Star, Trash2, Users, Globe, Search, Menu, X 
    } = window.LucideProxy;

    // Component Registry
    const Components = {};

    ${subcomponents
      .map((sub) => {
        const sanitized = sanitizeComponentCode(sub.code, sub.name);
        return `
        // Subcomponent: ${sub.path}
        try {
          ${sanitized}
          if (typeof ${sub.name} !== 'undefined') {
            Components['${sub.name}'] = ${sub.name};
          }
        } catch(e) {
          console.error("Error defining component ${sub.name}:", e);
        }
        `;
      })
      .join('\n')}

    // Main App Transpilation
    ${sanitizeAppCode(appCode)}

    // Mount to DOM
    try {
      const rootElement = document.getElementById('root');
      if (typeof App !== 'undefined') {
        const root = ReactDOM.createRoot(rootElement);
        root.render(React.createElement(App));
      } else {
        rootElement.innerHTML = '<div style="padding: 2rem; color: #f87171; text-align: center;">App component not exported in src/App.tsx</div>';
      }
    } catch (err) {
      console.error("Mount Error:", err);
      document.getElementById('root').innerHTML = '<div style="padding: 2rem; color: #f87171; text-align: center;">Error rendering App: ' + err.message + '</div>';
    }
  </script>
</body>
</html>`;
  };

  const sanitizeComponentCode = (code: string, componentName: string) => {
    // Strip imports (they will resolve via global/registry scope)
    let clean = code.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
    // Replace export default and export const
    clean = clean.replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, '');
    clean = clean.replace(/export\s+(function|const|let|var)\s+/g, '$1 ');
    // Ensure component name is defined in scope
    return clean;
  };

  const sanitizeAppCode = (code: string) => {
    // Replace imports from local components
    let clean = code.replace(/import\s+(\w+)\s+from\s+['"][^'"]+['"];?/g, (match, p1) => {
      return `const ${p1} = Components['${p1}'] || window.LucideProxy['${p1}'] || (() => null);`;
    });
    // Remove other imports (react, lucide-react)
    clean = clean.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
    // Replace export default App
    clean = clean.replace(/export\s+default\s+App;?/g, '');
    clean = clean.replace(/export\s+(function|const|let|var)\s+/g, '$1 ');
    return clean;
  };

  const openInNewTab = () => {
    if (!iframeRef.current?.srcdoc) return;
    const blob = new Blob([iframeRef.current.srcdoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const getFrameWidth = () => {
    switch (device) {
      case 'mobile':
        return 'w-[375px] h-[680px] rounded-3xl border-4 border-slate-700 shadow-2xl';
      case 'tablet':
        return 'w-[768px] h-[820px] rounded-2xl border-4 border-slate-700 shadow-2xl';
      default:
        return 'w-full h-full rounded-none border-0';
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
            title="Desktop View (Full Width)"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`p-1.5 rounded transition ${device === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Tablet View (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`p-1.5 rounded transition ${device === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Mobile View (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive Sandbox</span>
          </div>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Reload Sandbox"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={openInNewTab}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Open Sandbox in New Window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`px-2 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1 transition ${
              showConsole ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>Console</span>
            {logs.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
          </button>
        </div>
      </div>

      {/* Preview Canvas Container */}
      <div className="flex-1 p-3 flex flex-col items-center justify-center overflow-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] relative">
        {error && (
          <div className="absolute top-4 left-4 right-4 z-20 p-3 rounded-xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between shadow-xl backdrop-blur">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="px-2 py-1 rounded bg-rose-800 hover:bg-rose-700 text-white text-[10px] font-medium transition"
            >
              Retry
            </button>
          </div>
        )}

        <div className={`${getFrameWidth()} bg-slate-950 flex flex-col overflow-hidden transition-all duration-300 shadow-2xl relative`}>
          {/* Mock Browser Header for mobile & tablet */}
          {device !== 'desktop' && (
            <div className="h-6 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between select-none">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-2 h-2 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="text-[9px] text-slate-500 font-mono">
                {device === 'mobile' ? 'iPhone 15' : 'iPad Air'}
              </span>
            </div>
          )}

          {/* Real Interactive Iframe */}
          <iframe
            ref={iframeRef}
            title="App Preview"
            sandbox="allow-scripts allow-same-origin allow-modals allow-forms"
            className="w-full h-full bg-slate-950 border-0 flex-1"
          />
        </div>

        {/* Live Console Drawer */}
        {showConsole && (
          <div className="absolute bottom-2 left-4 right-4 h-36 bg-[#080c16] border border-slate-800 rounded-xl p-3 shadow-2xl flex flex-col z-20 backdrop-blur">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300">
                <Terminal className="w-3 h-3 text-indigo-400" />
                Preview Console Logs
              </span>
              <button onClick={() => setLogs([])} className="hover:text-white">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto mt-2 space-y-1 font-mono text-[11px]">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-4">No console messages logged.</div>
              ) : (
                logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`leading-tight ${log.startsWith('[error]') ? 'text-rose-400' : 'text-slate-300'}`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
