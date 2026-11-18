import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Crown, Globe, Zap, ShieldAlert, FolderGit2, ArrowRight } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ProjectListModal } from './components/ProjectListModal';
import { MembersModal } from './components/MembersModal';
import { PlansModal } from './components/PlansModal';
import { CommandPalette } from './components/CommandPalette';
import { StudioWorkspace } from './components/Studio/StudioWorkspace';
import { DsaWorkspace } from './components/Studio/DsaWorkspace';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { Skeleton } from './components/ui/Skeleton';
import { useToast } from './components/ui/ToastProvider';
import { User, ProjectSummary, ProjectType } from './types';
import { fetchProjects, getAuthToken, clearAuthToken, deleteProject } from './api/client';

export function App() {
  const { notify } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectSummary | null>(null);
  const [activeMode, setActiveMode] = useState<ProjectType>('WEB_APP');
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [authOpen, setAuthOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectSummary | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
      if (data.length > 0) {
        setCurrentProject((prev) => {
          if (prev && data.some((p) => p.id === prev.id)) return prev;
          const first = data[0];
          setActiveMode(first.type || 'WEB_APP');
          return first;
        });
      }
    } catch {
      notify('Unable to load projects. Check backend connectivity.', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    const savedUser = localStorage.getItem('lovable_user');
    const token = getAuthToken();
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
        loadProjects();
      } catch {
        setAuthOpen(true);
        setLoading(false);
      }
    } else {
      setAuthOpen(true);
      setLoading(false);
    }
  }, [loadProjects]);

  // Global Ctrl+K / Cmd+K shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (currentProject?.type) {
      setActiveMode(currentProject.type);
    }
  }, [currentProject?.id, currentProject?.type]);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setAuthOpen(false);
    notify(`Signed in as ${loggedInUser.name || loggedInUser.username}`, 'success');
    loadProjects();
  };

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    setProjects([]);
    setCurrentProject(null);
    setAuthOpen(true);
    notify('Signed out', 'info');
  };

  const handleProjectCreated = (newProject: ProjectSummary) => {
    setProjects((prev) => [newProject, ...prev]);
    setCurrentProject(newProject);
    setActiveMode(newProject.type || 'WEB_APP');
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    setDeletingProject(true);
    try {
      await deleteProject(projectToDelete.id);
      setProjects((prev) => {
        const remaining = prev.filter((p) => p.id !== projectToDelete.id);
        if (currentProject?.id === projectToDelete.id) {
          const next = remaining.length > 0 ? remaining[0] : null;
          setCurrentProject(next);
          if (next) setActiveMode(next.type || 'WEB_APP');
        }
        return remaining;
      });
      notify(`Deleted "${projectToDelete.name}"`, 'info');
      setProjectToDelete(null);
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || 'Failed to delete project', 'error');
    } finally {
      setDeletingProject(false);
    }
  };

  const handleSelectProject = (project: ProjectSummary) => {
    setCurrentProject(project);
    setActiveMode(project.type || 'WEB_APP');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-canvas text-ink-primary">
      <Navbar
        user={user}
        currentProject={currentProject}
        activeMode={activeMode}
        onChangeMode={setActiveMode}
        onOpenProjects={() => setProjectsOpen(true)}
        onOpenMembers={() => setMembersOpen(true)}
        onOpenPlans={() => setPlansOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        onRequestDeleteProject={(proj) => setProjectToDelete(proj)}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex overflow-hidden">
        {loading ? (
          <div
            className="flex-1 flex flex-col lg:flex-row overflow-hidden"
            role="status"
            aria-busy="true"
            aria-label="Loading workspace"
          >
            <div className="hidden lg:flex w-[390px] border-r border-line-subtle bg-surface-base p-4 flex-col gap-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-4/5" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="flex-1 p-6 space-y-4">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-64 w-full" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        ) : currentProject ? (
          activeMode === 'DSA' ? (
            <DsaWorkspace key={`dsa-${currentProject.id}`} project={currentProject} />
          ) : (
            <StudioWorkspace key={`studio-${currentProject.id}`} project={currentProject} />
          )
        ) : (
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex items-center justify-center">
            <div className="w-full max-w-3xl space-y-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-base border border-line text-[11px] font-mono text-ink-secondary shadow-card">
                  <FolderGit2 className="w-3.5 h-3.5 text-accent-fg" aria-hidden="true" />
                  <span>Workspace Launcher</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-ink-primary tracking-tight">
                  Codecraft Engineering Studio
                </h1>
                <p className="text-sm text-ink-secondary max-w-xl leading-relaxed">
                  Build production React interfaces with live previews, probe frontend components with adversarial audits, and differential-fuzz competitive algorithms in one clean workspace.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-lg bg-surface-elevated border border-line shadow-card space-y-2.5">
                  <div className="w-8 h-8 rounded-md bg-accent-subtle border border-accent/20 flex items-center justify-center text-accent-fg">
                    <Globe className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h2 className="text-xs font-semibold text-ink-primary">Web App Studio</h2>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    Generate TypeScript + React components with Prism syntax inspection and live sandbox or Kubernetes previews.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-surface-elevated border border-line shadow-card space-y-2.5">
                  <div className="w-8 h-8 rounded-md bg-dsa-subtle border border-dsa/25 flex items-center justify-center text-dsa-fg">
                    <Zap className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h2 className="text-xs font-semibold text-ink-primary">DSA Fuzzer</h2>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    Synthesize brute-force oracles and randomized edge-case generators across C++17, Python 3, and Java 21.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-surface-elevated border border-line shadow-card space-y-2.5">
                  <div className="w-8 h-8 rounded-md bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h2 className="text-xs font-semibold text-ink-primary">Web Adversary</h2>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    Stress-test generated components against boundary inputs, null states, and runtime edge cases before shipping.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => (user ? setProjectsOpen(true) : setAuthOpen(true))}
                  className="px-4 py-2 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-medium inline-flex items-center gap-2 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>{user ? 'Create or Open Project' : 'Sign In to Start'}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => setPlansOpen(true)}
                  className="px-4 py-2 rounded-md bg-surface-elevated hover:bg-surface-subtle border border-line text-ink-primary text-xs font-medium inline-flex items-center gap-2 shadow-card transition"
                >
                  <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />
                  <span>View Plans &amp; Quotas</span>
                </button>

                <span className="text-[11px] font-mono text-ink-muted ml-auto hidden sm:inline">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-surface-base border border-line">Ctrl K</kbd> for quick commands
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      <ProjectListModal
        isOpen={projectsOpen}
        projects={projects}
        currentProjectId={currentProject ? currentProject.id : null}
        onSelectProject={handleSelectProject}
        onProjectCreated={handleProjectCreated}
        onRequestDeleteProject={(proj) => setProjectToDelete(proj)}
        onClose={() => setProjectsOpen(false)}
      />

      <PlansModal isOpen={plansOpen} onClose={() => setPlansOpen(false)} />

      {currentProject && (
        <MembersModal
          isOpen={membersOpen}
          projectId={currentProject.id}
          userRole={currentProject.role}
          onClose={() => setMembersOpen(false)}
        />
      )}

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        isAuthenticated={Boolean(user)}
        projects={projects}
        currentProject={currentProject}
        activeMode={activeMode}
        onSelectProject={handleSelectProject}
        onChangeMode={setActiveMode}
        onOpenProjects={() => setProjectsOpen(true)}
        onOpenMembers={() => setMembersOpen(true)}
        onOpenPlans={() => setPlansOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />

      <ConfirmDialog
        isOpen={Boolean(projectToDelete)}
        title="Delete project"
        message={`Permanently delete "${projectToDelete?.name || ''}" and all associated files, chat history, and archived test cases? This action cannot be undone.`}
        confirmLabel="Delete Project"
        destructive
        loading={deletingProject}
        onConfirm={handleConfirmDeleteProject}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
}

export default App;
