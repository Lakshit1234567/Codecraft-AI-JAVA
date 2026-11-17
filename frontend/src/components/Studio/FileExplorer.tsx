import React from 'react';
import { Folder, FolderOpen, FileCode, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { FileNode } from '../../types';

interface FileExplorerProps {
  files: FileNode[];
  activeFile: string | null;
  onSelectFile: (filePath: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFile,
  onSelectFile,
}) => {
  return (
    <div className="w-56 h-full border-r border-[#1f293d] bg-[#0c1220]/50 flex flex-col select-none">
      <div className="p-3 border-b border-[#1f293d] flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Files</span>
        <span className="text-[10px] text-slate-500 font-mono">{files.length} items</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No files in project yet.
          </div>
        ) : (
          files.map((file) => {
            const isSelected = activeFile === file.path;
            const isTsx = file.path.endsWith('.tsx') || file.path.endsWith('.ts');

            return (
              <button
                key={file.path}
                onClick={() => onSelectFile(file.path)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-mono flex items-center gap-2 transition truncate ${
                  isSelected
                    ? 'bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {isTsx ? (
                  <FileCode className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                )}
                <span className="truncate">{file.path}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
