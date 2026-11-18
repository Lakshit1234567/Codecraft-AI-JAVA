import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  FolderGit2,
  Globe,
  Zap,
  Crown,
  Users,
  Sun,
  Moon,
  LogIn,
  LogOut,
  CornerDownLeft,
} from 'lucide-react';
import { ProjectSummary, ProjectType } from '../types';
import { useTheme } from './ui/ThemeProvider';

export interface CommandItem {
  id: string;
  label: string;
  section: string;
  keywords?: string;
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  projects: ProjectSummary[];
  currentProject: ProjectSummary | null;
  activeMode: ProjectType;
  onSelectProject: (project: ProjectSummary) => void;
  onChangeMode: (mode: ProjectType) => void;
  onOpenProjects: () => void;
  onOpenMembers: () => void;
  onOpenPlans: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  projects,
  currentProject,
  activeMode,
  onSelectProject,
  onChangeMode,
  onOpenProjects,
  onOpenMembers,
  onOpenPlans,
  onOpenAuth,
  onLogout,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      {
        id: 'toggle-theme',
        label: theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme',
        section: 'Appearance',
        keywords: 'theme light dark mode appearance',
        icon:
          theme === 'light' ? (
            <Moon className="w-4 h-4 text-ink-secondary" aria-hidden="true" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />
          ),
        onSelect: toggleTheme,
      },
      {
        id: 'open-projects',
        label: 'Open or Create Project',
        section: 'Workspace',
        keywords: 'new project switch workspace list',
        icon: <FolderGit2 className="w-4 h-4 text-accent-fg" aria-hidden="true" />,
        onSelect: onOpenProjects,
      },
      {
        id: 'open-plans',
        label: 'View Plans & Token Quotas',
        section: 'Billing',
        keywords: 'billing upgrade stripe quota usage',
        icon: <Crown className="w-4 h-4 text-amber-500" aria-hidden="true" />,
        onSelect: onOpenPlans,
      },
    ];

    if (currentProject) {
      if (activeMode !== 'WEB_APP') {
        list.push({
          id: 'mode-web',
          label: 'Switch to Web Studio Mode',
          section: 'Workspace',
          keywords: 'web react preview code studio',
          icon: <Globe className="w-4 h-4 text-accent-fg" aria-hidden="true" />,
          onSelect: () => onChangeMode('WEB_APP'),
        });
      }
      if (activeMode !== 'DSA') {
        list.push({
          id: 'mode-dsa',
          label: 'Switch to DSA Fuzzer Mode',
          section: 'Workspace',
          keywords: 'dsa algorithm fuzzing stress test',
          icon: <Zap className="w-4 h-4 text-dsa-fg" aria-hidden="true" />,
          onSelect: () => onChangeMode('DSA'),
        });
      }
      list.push({
        id: 'open-members',
        label: 'Manage Project Collaborators',
        section: 'Workspace',
        keywords: 'team members invite role share',
        icon: <Users className="w-4 h-4 text-ink-secondary" aria-hidden="true" />,
        onSelect: onOpenMembers,
      });
    }

    for (const proj of projects) {
      if (proj.id === currentProject?.id) continue;
      list.push({
        id: `project-${proj.id}`,
        label: `Switch to ${proj.name}`,
        section: 'Projects',
        keywords: `${proj.name} ${proj.type || 'WEB_APP'}`,
        icon:
          proj.type === 'DSA' ? (
            <Zap className="w-4 h-4 text-dsa-fg" aria-hidden="true" />
          ) : (
            <FolderGit2 className="w-4 h-4 text-ink-secondary" aria-hidden="true" />
          ),
        onSelect: () => onSelectProject(proj),
      });
    }

    if (isAuthenticated) {
      list.push({
        id: 'sign-out',
        label: 'Sign Out',
        section: 'Account',
        keywords: 'logout exit account',
        icon: <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />,
        onSelect: onLogout,
      });
    } else {
      list.push({
        id: 'sign-in',
        label: 'Sign In / Create Account',
        section: 'Account',
        keywords: 'login auth register',
        icon: <LogIn className="w-4 h-4 text-accent-fg" aria-hidden="true" />,
        onSelect: onOpenAuth,
      });
    }

    return list;
  }, [
    theme,
    toggleTheme,
    currentProject,
    activeMode,
    projects,
    isAuthenticated,
    onSelectProject,
    onChangeMode,
    onOpenProjects,
    onOpenMembers,
    onOpenPlans,
    onOpenAuth,
    onLogout,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.section.toLowerCase().includes(q) ||
        (cmd.keywords && cmd.keywords.toLowerCase().includes(q))
    );
  }, [commands, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const execute = (item: CommandItem) => {
    onClose();
    item.onSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
      );
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      execute(filtered[selectedIndex]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick command palette"
        onKeyDown={handleKeyDown}
        className="w-full max-w-lg bg-surface-elevated border border-line rounded-xl shadow-modal overflow-hidden animate-modal-in"
      >
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-line-subtle">
          <Search className="w-4 h-4 text-ink-muted shrink-0" aria-hidden="true" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search projects..."
            aria-label="Search commands"
            className="flex-1 bg-transparent text-sm text-ink-primary placeholder-ink-muted focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-subtle border border-line text-ink-muted">
            ESC
          </kbd>
        </div>

        <ul role="listbox" aria-label="Available commands" className="max-h-72 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <li className="py-8 text-center text-xs text-ink-muted">
              No matching commands found.
            </li>
          ) : (
            filtered.map((item, idx) => {
              const active = idx === selectedIndex;
              return (
                <li key={item.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => execute(item)}
                    className={`w-full px-3 py-2 rounded-md flex items-center justify-between gap-3 text-left text-xs transition ${
                      active
                        ? 'bg-accent-subtle text-accent-fg font-medium'
                        : 'text-ink-primary hover:bg-surface-subtle'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-ink-muted">{item.section}</span>
                      {active && (
                        <CornerDownLeft className="w-3 h-3 text-accent-fg" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};
