import React from 'react';
import { FileCode, Code2, FileJson, Globe, FileText, X } from 'lucide-react';

interface EditorTabsBarProps {
  openTabs: string[];
  activeFile: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

function getTabIcon(filePath: string) {
  const name = filePath.split('/').pop() || filePath;
  if (name.endsWith('.tsx') || name.endsWith('.jsx')) {
    return <FileCode className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />;
  }
  if (name.endsWith('.ts') || name.endsWith('.js')) {
    return <Code2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />;
  }
  if (name.endsWith('.css')) {
    return <FileCode className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />;
  }
  if (name.endsWith('.json')) {
    return <FileJson className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />;
  }
  if (name.endsWith('.html')) {
    return <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />;
  }
  return <FileText className="w-3.5 h-3.5 text-ink-muted shrink-0" aria-hidden="true" />;
}

export const EditorTabsBar: React.FC<EditorTabsBarProps> = ({
  openTabs,
  activeFile,
  onSelectTab,
  onCloseTab,
}) => {
  if (openTabs.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Open files"
      className="h-9 bg-surface-canvas border-b border-line-subtle flex items-stretch overflow-x-auto select-none shrink-0"
    >
      {openTabs.map((filePath) => {
        const isActive = filePath === activeFile;
        const fileName = filePath.split('/').pop() || filePath;

        return (
          <div
            key={filePath}
            className={`group flex items-center border-r border-line-subtle shrink-0 transition ${
              isActive
                ? 'bg-surface-base text-ink-primary border-t-2 border-t-accent'
                : 'bg-surface-canvas text-ink-secondary hover:bg-surface-subtle/70 hover:text-ink-primary border-t-2 border-t-transparent'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              title={filePath}
              onClick={() => onSelectTab(filePath)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  onCloseTab(filePath);
                }
              }}
              className="h-full pl-3 pr-1.5 flex items-center gap-1.5 text-xs font-mono focus-visible:outline-offset-[-2px]"
            >
              {getTabIcon(filePath)}
              <span className="max-w-[140px] truncate">{fileName}</span>
            </button>

            <button
              type="button"
              onClick={() => onCloseTab(filePath)}
              aria-label={`Close ${fileName}`}
              title={`Close ${fileName}`}
              className={`mr-1.5 p-0.5 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-subtle transition ${
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
              }`}
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
