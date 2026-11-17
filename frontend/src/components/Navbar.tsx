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
  Layers
} from 'lucide-react';
import { ProjectSummary, User, Subscription, UsageToday } from '../types';
import { fetchMySubscription, fetchTodayUsage } from '../api/client';

interface NavbarProps {
  user: User | null;
  currentProject: ProjectSummary | null;
  onOpenProjects: () => void;
  onOpenMembers: () => void;
  onOpenAuth: () => void;
  onOpenPlans: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentProject,
  onOpenProjects,
  onOpenMembers,
  onOpenAuth,
  onOpenPlans,
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
      {/* Left: Brand & Project Selector */}
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
          <span className="max-w-[120px] sm:max-w-[160px] truncate">
            {currentProject ? currentProject.name : 'Select Project'}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {currentProject && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
              {currentProject.role}
            </span>
            {currentProject.type && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border hidden md:inline ${
                currentProject.type === 'DSA'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
              }`}>
                {currentProject.type === 'DSA' ? '⚡ DSA Engine' : '🌐 Web App'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Plans, Usage & User Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
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

        {/* Plan Upgrade Badge / Button */}
        <button
          onClick={onOpenPlans}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
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

        {currentProject && (
          <button
            onClick={onOpenMembers}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 text-xs font-medium text-slate-300 hover:text-white transition border border-transparent hover:border-slate-700"
            title="Project Members"
          >
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Members</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-800" />

        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
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
