import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  LogOut,
  LogIn,
  ChevronDown,
  Crown,
  Zap,
  Activity,
  Globe,
  Trash2,
  UserPlus,
  Code2,
  Sun,
  Moon,
  Search,
} from 'lucide-react';
import { ProjectSummary, User, Subscription, UsageToday, ProjectType } from '../types';
import { fetchMySubscription, fetchTodayUsage } from '../api/client';
import { useTheme } from './ui/ThemeProvider';

interface NavbarProps {
  user: User | null;
  currentProject: ProjectSummary | null;
  activeMode: ProjectType;
  onChangeMode: (mode: ProjectType) => void;
  onOpenProjects: () => void;
  onOpenMembers: () => void;
  onOpenAuth: () => void;
  onOpenPlans: () => void;
  onOpenCommandPalette: () => void;
  onRequestDeleteProject?: (project: ProjectSummary) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentProject,
  activeMode,
  onChangeMode,
  onOpenProjects,
  onOpenMembers,
  onOpenAuth,
  onOpenPlans,
  onOpenCommandPalette,
  onRequestDeleteProject,
  onLogout,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageToday | null>(null);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setUsage(null);
      return;
    }

    let cancelled = false;
    const loadStatus = async () => {
      const [sub, usg] = await Promise.allSettled([
        fetchMySubscription(),
        fetchTodayUsage(),
      ]);
      if (cancelled) return;
      if (sub.status === 'fulfilled') setSubscription(sub.value);
      if (usg.status === 'fulfilled') setUsage(usg.value);
    };

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const planName = subscription?.plan?.name || 'Starter';
  const isPaid =
    planName.toLowerCase().includes('pro') ||
    planName.toLowerCase().includes('enterprise');

  const usagePercent =
    usage && usage.tokensLimit > 0
      ? Math.min(100, Math.round((usage.tokensUsed / usage.tokensLimit) * 100))
      : 0;

  return (
    <header className="h-12 shrink-0 border-b border-line-subtle bg-surface-base px-3 sm:px-4 flex items-center justify-between gap-2 z-30 select-none">
      {/* Left: Brand, Project Switcher & Workspace Mode */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-white shadow-sm">
            <Code2 className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="font-semibold text-sm text-ink-primary tracking-tight hidden sm:inline">
            Codecraft
          </span>
        </div>

        <span className="h-4 w-px bg-line hidden sm:inline-block" aria-hidden="true" />

        {/* Project Selector */}
        <button
          type="button"
          onClick={onOpenProjects}
          aria-haspopup="dialog"
          aria-label={
            currentProject
              ? `Current project: ${currentProject.name}. Open project switcher`
              : 'Select or create a project'
          }
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-elevated hover:bg-surface-subtle border border-line text-xs font-medium text-ink-primary shadow-card transition min-w-0"
        >
          <FolderGit2 className="w-3.5 h-3.5 text-accent-fg shrink-0" aria-hidden="true" />
          <span className="max-w-[96px] sm:max-w-[160px] truncate">
            {currentProject ? currentProject.name : 'Select Project'}
          </span>
          <ChevronDown className="w-3 h-3 text-ink-muted shrink-0" aria-hidden="true" />
        </button>

        {/* Mode Switcher */}
        {currentProject && (
          <div
            role="tablist"
            aria-label="Workspace mode"
            className="flex items-center bg-surface-subtle border border-line-subtle p-0.5 rounded-md shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'WEB_APP'}
              onClick={() => onChangeMode('WEB_APP')}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded text-xs font-medium transition ${
                activeMode === 'WEB_APP'
                  ? 'bg-surface-base text-accent-fg shadow-card'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Web Studio</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === 'DSA'}
              onClick={() => onChangeMode('DSA')}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded text-xs font-medium transition ${
                activeMode === 'DSA'
                  ? 'bg-surface-base text-dsa-fg shadow-card'
                  : 'text-ink-secondary hover:text-dsa-fg'
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">DSA Fuzzer</span>
            </button>
          </div>
        )}
      </div>

      {/* Right: Command Palette, Theme, Usage, Plan, Project Actions & Account */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Open command palette (Ctrl+K)"
          title="Quick commands (Ctrl+K)"
          className="hidden md:inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-surface-inset hover:bg-surface-subtle border border-line text-xs text-ink-muted hover:text-ink-primary transition"
        >
          <Search className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden xl:inline text-[11px]">Quick Jump</span>
          <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-surface-base border border-line-subtle text-ink-muted">
            Ctrl K
          </kbd>
        </button>

        {usage && (
          <button
            type="button"
            onClick={onOpenPlans}
            aria-label={`Daily token usage: ${usage.tokensUsed?.toLocaleString()} of ${usage.tokensLimit?.toLocaleString()} tokens used. Open billing and plans`}
            className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-surface-elevated hover:bg-surface-subtle border border-line-subtle shadow-card transition"
          >
            <Activity className="w-3.5 h-3.5 text-accent-fg shrink-0" aria-hidden="true" />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tabular-nums text-ink-secondary">
                <strong className="text-ink-primary font-medium">
                  {usage.tokensUsed?.toLocaleString()}
                </strong>
                <span> / {usage.tokensLimit?.toLocaleString()}</span>
              </span>
              <span
                className="w-10 h-1.5 rounded-full bg-surface-subtle overflow-hidden"
                aria-hidden="true"
              >
                <span
                  className={`block h-full rounded-full ${
                    usagePercent >= 90 ? 'bg-rose-500' : 'bg-accent'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </span>
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenPlans}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${
            isPaid
              ? 'bg-surface-elevated hover:bg-surface-subtle border-line text-ink-primary shadow-card'
              : 'bg-accent-subtle hover:bg-accent/15 border-accent/25 text-accent-fg'
          }`}
        >
          <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">{planName}</span>
          <span className="sm:hidden">Plans</span>
        </button>

        {currentProject && (
          <button
            type="button"
            onClick={onOpenMembers}
            aria-label="Manage project members"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md bg-surface-elevated hover:bg-surface-subtle text-xs font-medium text-ink-secondary hover:text-ink-primary border border-line shadow-card transition"
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Members</span>
          </button>
        )}

        {currentProject && onRequestDeleteProject && currentProject.role === 'OWNER' && (
          <button
            type="button"
            onClick={() => onRequestDeleteProject(currentProject)}
            aria-label={`Delete project ${currentProject.name}`}
            title="Delete project"
            className="p-1.5 rounded-md text-ink-muted hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20 transition"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}

        {/* Theme Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          className="p-1.5 rounded-md text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle border border-line-subtle transition"
        >
          {theme === 'light' ? (
            <Moon className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
          )}
        </button>

        <span className="h-4 w-px bg-line mx-0.5" aria-hidden="true" />

        {user ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="w-7 h-7 rounded-md bg-accent-subtle text-accent-fg font-semibold text-xs flex items-center justify-center border border-accent/20"
              >
                {(user.name || user.username).charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-ink-secondary font-medium max-w-[110px] truncate hidden xl:inline">
                {user.name || user.username}
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out"
              className="p-1.5 rounded-md text-ink-muted hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-sm transition"
          >
            <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
