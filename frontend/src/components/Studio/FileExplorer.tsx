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
  Code2
} from 'lucide-react';
import { FileNode } from '../../types';

interface FileExplorerProps {
  files: FileNode[];
  activeFile: string | null;
  onSelectFile: (filePath: string) => void;
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

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFile,
  onSelectFile,
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-expand any parent folders of the active file
  useEffect(() => {
    if (activeFile) {
      const parts = activeFile.split('/');
      if (parts.length > 1) {
        setCollapsedFolders((prev) => {
          const next = new Set(prev);
          for (let i = 1; i < parts.length; i++) {
            const folderPath = parts.slice(0, i).join('/');
            next.delete(folderPath);
          }
          return next;
        });
      }
    }
  }, [activeFile]);

  const tree = useMemo(() => buildTree(files), [files]);

  const toggleFolder = (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
      return <FileCode className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />;
    }
    if (fileName.endsWith('.ts') || fileName.endsWith('.js')) {
      return <Code2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
    }
    if (fileName.endsWith('.css')) {
      return <FileCode className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />;
    }
    if (fileName.endsWith('.json')) {
      return <FileJson className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
    }
    if (fileName.endsWith('.html')) {
      return <Globe className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
  };

  const renderTreeItem = (item: TreeItem, depth: number = 0): React.ReactNode => {
    if (searchTerm) {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.path.toLowerCase().includes(searchTerm.toLowerCase());
      if (item.isFolder) {
        const hasMatchingChild = item.children.some((child) =>
          child.path.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (!matchesSearch && !hasMatchingChild) return null;
      } else if (!matchesSearch) {
        return null;
      }
    }

    if (item.isFolder) {
      const isCollapsed = collapsedFolders.has(item.path);

      return (
        <div key={item.path} className="flex flex-col">
          <button
            onClick={(e) => toggleFolder(item.path, e)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className="w-full py-1.5 pr-2 rounded-lg text-left text-xs font-mono flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800/60 transition group"
          >
            <span className="text-slate-500 group-hover:text-slate-300">
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
            {isCollapsed ? (
              <Folder className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            )}
            <span className="font-medium truncate">{item.name}</span>
          </button>

          {!isCollapsed && (
            <div className="flex flex-col">
              {item.children.map((child) => renderTreeItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File item
    const isSelected = activeFile === item.path;

    return (
      <button
        key={item.path}
        onClick={() => onSelectFile(item.path)}
        style={{ paddingLeft: `${depth * 12 + 22}px` }}
        className={`w-full py-1.5 pr-2 rounded-lg text-left text-xs font-mono flex items-center gap-2 transition truncate ${
          isSelected
            ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
      >
        {getFileIcon(item.name)}
        <span className="truncate">{item.name}</span>
      </button>
    );
  };

  return (
    <div className="w-60 h-full border-r border-[#1f293d] bg-[#0c1220]/70 flex flex-col select-none">
      {/* File Explorer Header */}
      <div className="p-3 border-b border-[#1f293d] flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Project Files
        </span>
        <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-800">
          {files.length} items
        </span>
      </div>

      {/* Quick Search */}
      {files.length > 5 && (
        <div className="p-2 border-b border-[#1f293d]/60">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter files..."
              className="w-full pl-7 pr-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {files.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No files in project yet.
          </div>
        ) : (
          tree.map((node) => renderTreeItem(node, 0))
        )}
      </div>
    </div>
  );
};
