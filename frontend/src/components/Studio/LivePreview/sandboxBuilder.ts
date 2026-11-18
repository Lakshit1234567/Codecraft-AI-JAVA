const REACT_HOOKS = [
  'useState',
  'useEffect',
  'useMemo',
  'useCallback',
  'useRef',
  'useContext',
  'createContext',
  'useReducer',
];

function sanitizeComponentCode(code: string, componentName: string): string {
  let clean = code;
  clean = clean.replace(/import\.meta\.env/g, '(window.__ENV__ || window.ENV || {})');
  clean = clean.replace(/import\.meta/g, '({})');
  clean = clean.replace(
    /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"][^'"]+['"];?/g,
    (_match, group: string) => {
      const names = group
        .split(',')
        .map((s) => s.trim().split(/\s+as\s+/)[0])
        .filter(Boolean);
      return names
        .map((n) => {
          if (REACT_HOOKS.includes(n)) return `var ${n} = React.${n};`;
          return `var ${n} = (window.LucideProxy && window.LucideProxy['${n}']) || (Components && (Components['${n}'] || Components['${n}Component'])) || (() => null);`;
        })
        .join('\n');
    }
  );
  clean = clean.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
  clean = clean.replace(
    /export\s+default\s+function(?:\s+([A-Za-z0-9_]+))?\s*\(/g,
    (_m, p1) => `function ${p1 || componentName}(`
  );
  clean = clean.replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, (_m, id) => {
    return `if (typeof ${id} !== 'undefined') { Components['${id}'] = ${id}; Components['${componentName}'] = ${id}; Components['${id}Component'] = ${id}; Components['${componentName}Component'] = ${id}; }`;
  });
  clean = clean.replace(/export\s+(function|const|let|var)\s+/g, '$1 ');
  return clean;
}

function sanitizeAppCode(code: string): string {
  let clean = code;
  clean = clean.replace(/import\.meta\.env/g, '(window.__ENV__ || window.ENV || {})');
  clean = clean.replace(/import\.meta/g, '({})');
  clean = clean.replace(
    /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"][^'"]+['"];?/g,
    (_match, group: string) => {
      const names = group
        .split(',')
        .map((s) => s.trim().split(/\s+as\s+/)[0])
        .filter(Boolean);
      return names
        .map((n) => {
          if (REACT_HOOKS.includes(n)) return `var ${n} = React.${n};`;
          const stripped = n.replace(/Component$/, '');
          return `var ${n} = (Components && (Components['${n}'] || Components['${stripped}'] || Components['${n}Component'])) || (window.LucideProxy && window.LucideProxy['${n}']) || (() => null);`;
        })
        .join('\n');
    }
  );
  clean = clean.replace(/import\s+(\w+)\s+from\s*['"][^'"]+['"];?/g, (_match, p1: string) => {
    const stripped = p1.replace(/Component$/, '');
    return `var ${p1} = (Components && (Components['${p1}'] || Components['${stripped}'] || Components['${p1}Component'])) || (window.LucideProxy && window.LucideProxy['${p1}']) || (() => null);`;
  });
  clean = clean.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
  clean = clean.replace(/export\s+default\s+App;?/g, '');
  clean = clean.replace(/export\s+(function|const|let|var)\s+/g, '$1 ');
  return clean;
}

export function buildSandboxHtml(
  appCode: string,
  allFiles: Record<string, string>,
  cssCode: string
): string {
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
  <title>Codecraft Live Preview</title>
  <script>
    window.__ENV__ = { VITE_API_URL: 'http://localhost:8080' };
    window.ENV = window.__ENV__;

    (function() {
      const _nativeFetch = window.fetch;
      window.fetch = async function(url, options) {
        const urlStr = String(url);
        try {
          const res = await _nativeFetch(url, options);
          if (res.ok) return res;
        } catch(e) {}

        if (urlStr.includes('/calculate')) {
          try {
            const u = new URL(urlStr, window.location.href);
            const expr = u.searchParams.get('expr');
            if (expr) {
              const cleanExpr = expr.replace(/[^0-9+\\-*\\/.()]/g, '');
              const result = Function('"use strict"; return (' + cleanExpr + ')')();
              return new Response(JSON.stringify({ result: result }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            }
          } catch(err) {
            return new Response(JSON.stringify({ error: 'Evaluation error' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
        return new Response(JSON.stringify({ status: 'ok', mock: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };
    })();
  </script>
  <script crossorigin="anonymous" src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#eff6ff',
              100: '#dbeafe',
              500: '#3b82f6',
              600: '#2563eb',
              700: '#1d4ed8',
            }
          }
        }
      }
    }
  </script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script>
    if (window.Babel) {
      window.Babel.registerPreset('tsx', {
        presets: [
          [window.Babel.availablePresets['typescript'], { ignoreExtensions: true }],
          [window.Babel.availablePresets['react'], { runtime: 'classic' }]
        ]
      });
    }
  </script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #09090b;
      color: #f4f4f6;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow-x: hidden;
    }
    ${cssCode}
  </style>
</head>
<body>
  <div id="root"></div>

  <script>
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
    window.onerror = function(msg, url, line, col, error) {
      const errStr = String(msg || '');
      if (errStr.includes('Script error')) {
        if (error && error.message) {
          window.parent.postMessage({ type: 'PREVIEW_ERROR', message: error.message + ' (Line ' + line + ')' }, '*');
        }
        return;
      }
      window.parent.postMessage({ type: 'PREVIEW_ERROR', message: errStr + ' (Line ' + line + ')' }, '*');
    };
  </script>

  <script>
    const { createElement: h } = React;
    function createLucideIcon(paths) {
      return function({ size = 20, className = '', color = 'currentColor', strokeWidth = 2, ...props }) {
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

    window.LucideIcons = {
      Sparkles: createLucideIcon(['m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z', 'M5 3v4', 'M19 17v4', 'M3 5h4', 'M17 19h4']),
      ArrowRight: createLucideIcon(['M5 12h14', 'm12 5 7 7-7 7']),
      Check: createLucideIcon(['M20 6 9 17l-5-5']),
      CheckCircle: createLucideIcon(['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'm9 11 3 3L22 4']),
      CheckCircle2: createLucideIcon(['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'm9 12 2 2 4-4']),
      Layers: createLucideIcon(['m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', 'm22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L2.6 12.5', 'm22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L2.6 17.5']),
      Code: createLucideIcon(['m16 18 6-6-6-6', 'm8 6-6 6 6 6']),
      Play: createLucideIcon(['m5 3 14 9-14 9V3z']),
      Zap: createLucideIcon(['M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4z']),
      Shield: createLucideIcon(['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z']),
      Star: createLucideIcon(['M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z']),
      Trash2: createLucideIcon(['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2']),
      Users: createLucideIcon(['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z']),
      Globe: createLucideIcon(['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M2 12h20']),
      Search: createLucideIcon(['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'm21 21-4.3-4.3']),
      Menu: createLucideIcon(['M4 12h16', 'M4 6h16', 'M4 18h16']),
      X: createLucideIcon(['M18 6 6 18', 'M6 6l12 12']),
      Circle: createLucideIcon(['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z']),
      Square: createLucideIcon(['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z']),
      Calculator: createLucideIcon(['M4 2v20h16V2H4zm4 4h8v4H8V6zm0 6h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-8 4h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z'])
    };

    window.LucideProxy = new Proxy(window.LucideIcons, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        return function FallbackIcon(props) {
          return h('span', { className: 'inline-flex items-center text-sky-400 font-mono text-xs', ...props }, '•');
        };
      }
    });
  </script>

  <script type="text/babel" data-presets="tsx">
    const { useState, useEffect, useMemo, useCallback, useRef } = React;
    const Lucide = window.LucideProxy;
    const {
      Sparkles, ArrowRight, Check, CheckCircle, CheckCircle2,
      Layers, Code, Play, Zap, Shield, Star, Trash2, Users, Globe, Search, Menu, X
    } = window.LucideProxy;

    const Components = {};

    ${subcomponents
      .map((sub) => {
        const sanitized = sanitizeComponentCode(sub.code, sub.name);
        return `
        try {
          ${sanitized}
          if (typeof ${sub.name} !== 'undefined') {
            Components['${sub.name}'] = ${sub.name};
          }
        } catch(e) { console.error("Error defining component ${sub.name}:", e); }
        `;
      })
      .join('\n')}

    ${sanitizeAppCode(appCode)}

    try {
      const rootElement = document.getElementById('root');
      if (typeof App !== 'undefined') {
        ReactDOM.createRoot(rootElement).render(React.createElement(App));
      } else {
        rootElement.innerHTML = '<div style="padding: 2rem; color: #fb7185; text-align: center; font-family: monospace; font-size: 13px;">App component not exported in src/App.tsx</div>';
      }
    } catch (err) {
      console.error("Mount Error:", err);
      document.getElementById('root').innerHTML = '<div style="padding: 2rem; color: #fb7185; text-align: center; font-family: monospace; font-size: 13px;">Error rendering App: ' + err.message + '</div>';
    }
  </script>
</body>
</html>`;
}
