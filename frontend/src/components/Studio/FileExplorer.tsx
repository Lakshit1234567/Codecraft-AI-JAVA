import React, { useState, useMemo, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
  FileJson,
  Globe,
  Code2,
  X,
} from 'lucide-react';
import { FileNode } from '../../types';
import { Skeleton } from '../ui/Skeleton';

interface FileExplorerProps {
  files: FileNode[];
  activeFile: string | null;
  loading?: boolean;
  onSelectFile: (filePath: string) => void;
  onCloseMobile?: () => void;
}

interface TreeItem {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeItem[];
}

function buildTree(files: FileNode[]): TreeItem[] {
  const root: TreeItem = { name: '', path: '', isFolder: true, children: [] };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      let existing = current.children.find((c) => c.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          isFolder: !isFile,
          children: [],
        };
        current.children.push(existing);
      }
      current = existing;
    }
  }

  function sortTree(item: TreeItem) {
    item.children.sort((a, b) => {
      if (a.isFolder === b.isFolder) {
        return a.name.localeCompare(b.name);
      }
      return a.isFolder ? -1 : 1;
    });
    item.children.forEach(sortTree);
  }

  sortTree(root);
  return root.children;
}

function treeHasMatch(item: TreeItem, query: string): boolean {
  if (
    item.name.toLowerCase().includes(query) ||
    item.path.toLowerCase().includes(query)
  ) {
    return true;
  }
  return item.children.some((child) => treeHasMatch(child, query));
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFile,
  loading = false,
  onSelectFile,
  onCloseMobile,
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!activeFile) return;
    const parts = activeFile.split('/');
    if (parts.length > 1) {
      setCollapsedFolders((prev) => {
        const next = new Set(prev);
        for (let i = 1; i < parts.length; i++) {
          next.delete(parts.slice(0, i).join('/'));
        }
        return next;
      });
    }
  }, [activeFile]);

  const tree = useMemo(() => buildTree(files), [files]);
  const normalizedQuery = searchTerm.trim().toLowerCase();

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
      return <FileCode className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />;
    }
    if (fileName.endsWith('.ts') || fileName.endsWith('.js')) {
      return <Code2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />;
    }
    if (fileName.endsWith('.css')) {
      return <FileCode className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />;
    }
    if (fileName.endsWith('.json')) {
      return <FileJson className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />;
    }
    if (fileName.endsWith('.html')) {
      return <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />;
    }
    return <FileText className="w-3.5 h-3.5 text-ink-muted shrink-0" aria-hidden="true" />;
  };

  const renderTreeItem = (item: TreeItem, depth: number = 0): React.ReactNode => {
    if (normalizedQuery && !treeHasMatch(item, normalizedQuery)) {
      return null;
    }

    if (item.isFolder) {
      const isCollapsed = !normalizedQuery && collapsedFolders.has(item.path);

      return (
        <div key={item.path} role="treeitem" aria-expanded={!isCollapsed}>
          <button
            type="button"
            onClick={() => toggleFolder(item.path)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className="w-full py-1.5 pr-2 rounded-md text-left text-xs font-mono flex items-center gap-1.5 text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle transition"
          >
            <span className="text-ink-muted shrink-0">
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </span>
            {isCollapsed ? (
              <Folder className="w-3.5 h-3.5 text-amber-600/80 dark:text-amber-400/80 shrink-0" aria-hidden="true" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            )}
            <span className="font-medium truncate">{item.name}</span>
          </button>

          {!isCollapsed && (
            <div role="group">
              {item.children.map((child) => renderTreeItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isSelected = activeFile === item.path;

    return (
      <button
        key={item.path}
        type="button"
        role="treeitem"
        aria-selected={isSelected}
        onClick={() => {
          onSelectFile(item.path);
          onCloseMobile?.();
        }}
        style={{ paddingLeft: `${depth * 12 + 22}px` }}
        className={`w-full py-1.5 pr-2 rounded-md text-left text-xs font-mono flex items-center gap-2 transition ${
          isSelected
            ? 'bg-accent-subtle text-accent-fg font-medium'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle'
        }`}
      >
        {getFileIcon(item.name)}
        <span className="truncate">{item.name}</span>
      </button>
    );
  };

  return (
    <aside
      aria-label="Project file explorer"
      className="w-60 h-full border-r border-line-subtle bg-surface-base flex flex-col select-none shrink-0"
    >
      <div className="h-10 px-3 border-b border-line-subtle flex items-center justify-between gap-2 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Explorer
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-ink-muted font-mono tabular-nums px-1.5 py-0.5 rounded bg-surface-subtle">
            {files.length}
          </span>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close file explorer"
              className="p-1 rounded text-ink-muted hover:text-ink-primary lg:hidden"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {files.length > 3 && (
        <div className="p-2 border-b border-line-subtle shrink-0">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-ink-muted absolute left-2 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Filter project files"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter files..."
              className="w-full pl-7 pr-2 py-1 rounded-md bg-surface-inset border border-line text-[11px] text-ink-primary placeholder-ink-muted focus:border-accent-fg focus:outline-none"
            />
          </div>
        </div>
      )}

      <div role="tree" aria-label="Project files" className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {loading ? (
          <div className="p-2 space-y-2" role="status" aria-busy="true" aria-label="Loading file tree">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/4 ml-3" />
            <Skeleton className="h-5 w-2/3 ml-3" />
            <Skeleton className="h-5 w-3/5" />
          </div>
        ) : files.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-ink-muted">
            No files generated yet.
          </div>
        ) : (
          tree.map((node) => renderTreeItem(node, 0))
        )}
      </div>
    </aside>
  );
};
