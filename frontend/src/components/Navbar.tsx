import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  FolderGit2, 
  Users, 
  LogOut, 
  LogIn, 
  ChevronDown,
  Crown,
  Zap,
  Activity,
  Globe,
  Trash2,
  UserPlus
} from 'lucide-react';
import { ProjectSummary, User, Subscription, UsageToday, ProjectType } from '../types';
import { fetchMySubscription, fetchTodayUsage } from '../api/client';

interface NavbarProps {
  user: User | null;
  currentProject: ProjectSummary | null;
  activeMode: ProjectType;
  onChangeMode: (mode: ProjectType) => void;
  onOpenProjects: () => void;
  onOpenMembers: () => void;
  onOpenAuth: () => void;
  onOpenPlans: () => void;
  onDeleteProject?: (projectId: number) => void;
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
  onDeleteProject,
  onLogout,
}) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageToday | null>(null);

  useEffect(() => {
    if (user) {
      loadStatus();
    } else {
      setSubscription(null);
      setUsage(null);
    }
  }, [user]);

  const loadStatus = async () => {
    try {
      const [sub, usg] = await Promise.allSettled([
        fetchMySubscription(),
        fetchTodayUsage(),
      ]);
      if (sub.status === 'fulfilled') setSubscription(sub.value);
      if (usg.status === 'fulfilled') setUsage(usg.value);
    } catch (e) {
      // Ignored
    }
  };

  const planName = subscription?.plan?.name || 'Free Starter';
  const isPro = planName.toLowerCase().includes('pro');
  const isEnterprise = planName.toLowerCase().includes('enterprise');

  return (
    <header className="h-14 border-b border-[#1f293d] bg-[#0c1220]/90 backdrop-blur px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Brand, Project Selector & Mode Switcher */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent tracking-tight hidden sm:inline">
            Codecraft<span className="text-indigo-400 font-semibold ml-1 text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">AI</span>
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* Project Selector Button */}
        <button
          onClick={onOpenProjects}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs sm:text-sm font-medium transition text-slate-200 hover:text-white"
        >
          <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="max-w-[120px] sm:max-w-[150px] truncate">
            {currentProject ? currentProject.name : 'Select Project'}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {/* Mode Toggle: Web Studio vs DSA Engine */}
        {currentProject && (
          <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => onChangeMode('WEB_APP')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                activeMode === 'WEB_APP'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web Studio</span>
            </button>
            <button
              onClick={() => onChangeMode('DSA')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                activeMode === 'DSA'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>DSA Fuzzer</span>
            </button>
          </div>
        )}
      </div>

      {/* Right: Plans, Add Member, Delete Project & User Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Token Usage Meter */}
        {usage && (
          <div 
            onClick={onOpenPlans}
            className="cursor-pointer hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
            title="Daily Token Usage (Click to view plans)"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <div className="text-[11px] font-mono text-slate-300">
              <span className="text-white font-semibold">{usage.tokensUsed?.toLocaleString()}</span>
              <span className="text-slate-500"> / {usage.tokensLimit?.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Plan Upgrade Badge */}
        <button
          onClick={onOpenPlans}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
            isEnterprise
              ? 'bg-purple-950/60 border border-purple-500/40 text-purple-200 hover:bg-purple-900/60'
              : isPro
              ? 'bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-900/60'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/20'
          }`}
        >
          {isEnterprise || isPro ? (
            <Crown className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-amber-300" />
          )}
          <span className="hidden sm:inline">{planName}</span>
          <span className="sm:hidden">Plans</span>
        </button>

        {/* Add Member Button */}
        {currentProject && (
          <button
            onClick={onOpenMembers}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 hover:text-white transition border border-slate-700 shadow-sm"
            title="Invite Team Members"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Add Member</span>
          </button>
        )}

        {/* Delete Project Button */}
        {currentProject && onDeleteProject && (
          <button
            onClick={() => onDeleteProject(currentProject.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition border border-transparent hover:border-rose-500/20"
            title="Delete Current Project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <div className="h-4 w-px bg-slate-800" />

        {user ? (
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-semibold text-xs flex items-center justify-center border border-indigo-400/30">
                {user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-slate-300 font-medium max-w-[100px] truncate hidden xl:inline">
                {user.name || user.username}
              </span>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
