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

  // Handle named imports: import { A, B as C } from '...'
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
          return `var ${n} = (window.LucideProxy && window.LucideProxy['${n}']) || getComponentOrProxy('${n}');`;
        })
        .join('\n');
    }
  );

  // Handle default imports: import Foo from '...'
  clean = clean.replace(
    /import\s+([A-Za-z0-9_]+)\s+from\s*['"][^'"]+['"];?/g,
    (_match, n: string) => {
      if (REACT_HOOKS.includes(n)) return `var ${n} = React.${n};`;
      return `var ${n} = (window.LucideProxy && window.LucideProxy['${n}']) || getComponentOrProxy('${n}');`;
    }
  );

  // Remove leftover imports (e.g. css or side-effects)
  clean = clean.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
  clean = clean.replace(/import\s+['"][^'"]+['"];?/g, '');

  // Strip exports and preserve declaration
  clean = clean.replace(
    /export\s+default\s+function(?:\s+([A-Za-z0-9_]+))?\s*\(/g,
    (_m, p1) => `function ${p1 || componentName}(`
  );
  clean = clean.replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, (_m, id) => {
    return `if (typeof ${id} !== 'undefined') { Components['${id}'] = ${id}; Components['${componentName}'] = ${id}; Components['${id}Component'] = ${id}; Components['${componentName}Component'] = ${id}; }`;
  });
  clean = clean.replace(/export\s+(function|const|let|var|class)\s+/g, '$1 ');
  clean = clean.replace(/export\s+(interface|type)\s+/g, '$1 ');
  clean = clean.replace(/export\s*\{[^}]*\};?/g, '');

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
          return `var ${n} = (window.LucideProxy && window.LucideProxy['${n}']) || getComponentOrProxy('${n}');`;
        })
        .join('\n');
    }
  );

  clean = clean.replace(
    /import\s+([A-Za-z0-9_]+)\s+from\s*['"][^'"]+['"];?/g,
    (_match, n: string) => {
      if (REACT_HOOKS.includes(n)) return `var ${n} = React.${n};`;
      return `var ${n} = (window.LucideProxy && window.LucideProxy['${n}']) || getComponentOrProxy('${n}');`;
    }
  );

  clean = clean.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
  clean = clean.replace(/import\s+['"][^'"]+['"];?/g, '');

  clean = clean.replace(/export\s+default\s+App;?/g, '');
  clean = clean.replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, '');
  clean = clean.replace(/export\s+(function|const|let|var|class)\s+/g, '$1 ');
  clean = clean.replace(/export\s+(interface|type)\s+/g, '$1 ');
  clean = clean.replace(/export\s*\{[^}]*\};?/g, '');

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

    // Polyfill crypto.randomUUID for browser environments
    if (!window.crypto) window.crypto = {};
    if (!window.crypto.randomUUID) {
      window.crypto.randomUUID = function() {
        return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, function(c) {
          return (+c ^ (window.crypto.getRandomValues ? window.crypto.getRandomValues(new Uint8Array(1))[0] : Math.floor(Math.random() * 256)) & (15 >> (+c / 4))).toString(16);
        });
      };
    }

    // Clear legacy corrupted localStorage that might have saved { status: 'ok', mock: true }
    try {
      ['todos', 'tasks', 'items', 'notes'].forEach(function(key) {
        var raw = localStorage.getItem(key);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            localStorage.removeItem(key);
          }
        }
      });
    } catch(e) {}

    // Smart Local REST Engine in Sandbox
    (function() {
      const _nativeFetch = window.fetch;
      const _dbKey = '__codecraft_sandbox_storage__';

      function getDb() {
        try {
          return JSON.parse(localStorage.getItem(_dbKey) || '{}');
        } catch(e) {
          return {};
        }
      }

      function saveDb(db) {
        try {
          localStorage.setItem(_dbKey, JSON.stringify(db));
        } catch(e) {}
      }

      window.fetch = async function(url, options) {
        options = options || {};
        const urlStr = String(url);
        const method = (options.method || 'GET').toUpperCase();

        // 1. Try real backend
        try {
          const res = await _nativeFetch(url, options);
          if (res.ok) return res;
        } catch(e) {}

        // 2. Calculator evaluator
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

        // 3. Smart REST resource handler (e.g., /api/todos, /api/tasks, /api/notes, /api/items)
        const pathMatch = urlStr.match(/\\/api\\/([a-zA-Z0-9_-]+)(?:\\/([a-zA-Z0-9_-]+))?/);
        if (pathMatch) {
          const resource = pathMatch[1].toLowerCase();
          const subId = pathMatch[2];
          const db = getDb();
          if (!Array.isArray(db[resource])) {
            db[resource] = [];
          }

          if (method === 'GET') {
            if (subId) {
              const item = db[resource].find(function(x) { return String(x.id) === String(subId); });
              return new Response(JSON.stringify(item || null), {
                status: item ? 200 : 404,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            return new Response(JSON.stringify(db[resource]), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          if (method === 'POST') {
            let body = {};
            try {
              body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
            } catch(e) {}

            // Bulk sync
            if (Array.isArray(body)) {
              db[resource] = body;
              saveDb(db);
              return new Response(JSON.stringify(body), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            }

            const newItem = Object.assign({ id: body.id || String(Date.now() + Math.random().toString(36).substring(2, 6)) }, body);
            db[resource].push(newItem);
            saveDb(db);
            return new Response(JSON.stringify(newItem), {
              status: 201,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          if (method === 'PUT' || method === 'PATCH') {
            let body = {};
            try {
              body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
            } catch(e) {}
            if (subId) {
              const idx = db[resource].findIndex(function(x) { return String(x.id) === String(subId); });
              if (idx !== -1) {
                db[resource][idx] = Object.assign({}, db[resource][idx], body);
                saveDb(db);
                return new Response(JSON.stringify(db[resource][idx]), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                });
              }
            }
          }

          if (method === 'DELETE') {
            if (subId) {
              db[resource] = db[resource].filter(function(x) { return String(x.id) !== String(subId); });
              saveDb(db);
              return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            }
          }
        }

        // 4. Default fallback: array response so .map/.filter/.length never crash
        return new Response(JSON.stringify([]), {
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
  <!-- Full official Lucide Icon Library -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
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

    function convertLucideToReact(iconDef) {
      if (!iconDef || !Array.isArray(iconDef)) return null;
      const tag = iconDef[0] || 'svg';
      const defaultAttrs = iconDef[1] || {};
      const children = iconDef[2] || [];

      return function LucideIcon({ size = 20, className = '', color = 'currentColor', strokeWidth = 2, ...props }) {
        return h('svg', {
          ...defaultAttrs,
          width: size,
          height: size,
          stroke: color,
          strokeWidth: strokeWidth,
          className: className,
          ...props
        }, children.map(function(child, idx) {
          return h(child[0], Object.assign({ key: idx }, child[1]));
        }));
      };
    }

    // Built-in fallback icons
    function createSvgIcon(paths) {
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
        }, paths.map(function(d, i) { return h('path', { key: i, d: d }); }));
      };
    }

    window.FallbackLucideIcons = {
      Plus: createSvgIcon(['M5 12h14', 'M12 5v14']),
      Minus: createSvgIcon(['M5 12h14']),
      Check: createSvgIcon(['M20 6 9 17l-5-5']),
      CheckCircle: createSvgIcon(['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'm9 11 3 3L22 4']),
      XCircle: createSvgIcon(['m15 9-6 6', 'm9 9 6 6', 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z']),
      Sparkles: createSvgIcon(['m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z', 'M5 3v4', 'M19 17v4', 'M3 5h4', 'M17 19h4']),
      ArrowRight: createSvgIcon(['M5 12h14', 'm12 5 7 7-7 7']),
      Layers: createSvgIcon(['m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', 'm22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L2.6 12.5', 'm22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L2.6 17.5']),
      Code: createSvgIcon(['m16 18 6-6-6-6', 'm8 6-6 6 6 6']),
      Play: createSvgIcon(['m5 3 14 9-14 9V3z']),
      Zap: createSvgIcon(['M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4z']),
      Trash2: createSvgIcon(['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'])
    };

    window.LucideProxy = new Proxy({}, {
      get: function(target, prop) {
        if (typeof prop !== 'string') return undefined;
        if (target[prop]) return target[prop];

        // 1. Check official window.lucide UMD library
        const l = window.lucide;
        if (l) {
          const direct = l[prop] || l[prop.charAt(0).toUpperCase() + prop.slice(1)];
          if (direct && Array.isArray(direct)) {
            target[prop] = convertLucideToReact(direct);
            return target[prop];
          }
          if (prop.endsWith('Icon')) {
            const stripped = prop.replace(/Icon$/, '');
            const strippedDef = l[stripped] || l[stripped.charAt(0).toUpperCase() + stripped.slice(1)];
            if (strippedDef && Array.isArray(strippedDef)) {
              target[prop] = convertLucideToReact(strippedDef);
              return target[prop];
            }
          }
        }

        // 2. Check fallback SVGs
        if (window.FallbackLucideIcons[prop]) {
          return window.FallbackLucideIcons[prop];
        }

        // 3. Fallback bullet
        return target[prop] = function FallbackIcon(props) {
          return h('span', Object.assign({ className: 'inline-flex items-center justify-center font-mono text-xs opacity-60' }, props), '•');
        };
      }
    });

    window.Components = {};

    // Dynamic component resolver: resolves components at RENDER time
    window.getComponentOrProxy = function(name) {
      return function DynamicComponentProxy(props) {
        const Resolved = (window.Components && (window.Components[name] || window.Components[name + 'Component'])) ||
                         (window.LucideProxy && window.LucideProxy[name]);
        if (Resolved && typeof Resolved === 'function') {
          return h(Resolved, props);
        }
        return null;
      };
    };
  </script>

  <script type="text/babel" data-presets="tsx">
    const { useState, useEffect, useMemo, useCallback, useRef } = React;
    const Lucide = window.LucideProxy;
    const Components = window.Components;
    const getComponentOrProxy = window.getComponentOrProxy;

    // Subcomponents Registration
    ${subcomponents
      .map((sub) => {
        const sanitized = sanitizeComponentCode(sub.code, sub.name);
        return `
        try {
          ${sanitized}
          if (typeof ${sub.name} !== 'undefined') {
            window.Components['${sub.name}'] = ${sub.name};
            window.Components['${sub.name}Component'] = ${sub.name};
          }
        } catch(e) { console.error("Error defining component ${sub.name}:", e); }
        `;
      })
      .join('\n')}

    // App Component Registration
    ${sanitizeAppCode(appCode)}

    if (typeof App !== 'undefined') {
      window.Components['App'] = App;
    }

    // Error Boundary to prevent white screen of death
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      static getDerivedStateFromError(error) {
        return { hasError: true, error: error };
      }
      componentDidCatch(error, errorInfo) {
        console.error("React Component Error:", error, errorInfo);
      }
      render() {
        if (this.state.hasError) {
          return React.createElement('div', {
            style: {
              padding: '2rem',
              maxWidth: '36rem',
              margin: '3rem auto',
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '1.25rem',
              color: '#fda4af',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '13px',
              lineHeight: 1.6
            }
          }, [
            React.createElement('h3', { key: 'title', style: { margin: '0 0 0.5rem 0', color: '#fb7185', fontSize: '15px', fontWeight: 'bold' } }, '⚠️ Preview Runtime Error'),
            React.createElement('p', { key: 'desc', style: { margin: '0 0 1rem 0' } }, this.state.error && this.state.error.message ? this.state.error.message : String(this.state.error)),
            React.createElement('button', {
              key: 'btn',
              onClick: () => {
                localStorage.removeItem('__codecraft_sandbox_storage__');
                window.location.reload();
              },
              style: {
                padding: '0.4rem 0.8rem',
                backgroundColor: 'rgba(244, 63, 94, 0.2)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                borderRadius: '0.5rem',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px'
              }
            }, 'Clear Preview Cache & Reload')
          ]);
        }
        return this.props.children;
      }
    }

    try {
      const rootElement = document.getElementById('root');
      const TargetApp = window.Components['App'] || (typeof App !== 'undefined' ? App : null);
      if (TargetApp) {
        ReactDOM.createRoot(rootElement).render(
          React.createElement(ErrorBoundary, null, React.createElement(TargetApp))
        );
      } else {
        rootElement.innerHTML = '<div style="padding: 2rem; color: #fb7185; text-align: center; font-family: monospace; font-size: 13px;">App component not exported in src/App.tsx</div>';
      }
    } catch (err) {
      console.error("Mount Error:", err);
      document.getElementById('root').innerHTML = '<div style="padding: 2rem; color: #fb7185; text-align: center; font-family: monospace; font-size: 13px;">Error rendering App: ' + (err.message || err) + '</div>';
    }
  </script>
</body>
</html>`;
}
