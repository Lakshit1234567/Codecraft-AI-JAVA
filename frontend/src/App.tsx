import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ProjectListModal } from './components/ProjectListModal';
import { MembersModal } from './components/MembersModal';
import { PlansModal } from './components/PlansModal';
import { StudioWorkspace } from './components/Studio/StudioWorkspace';
import { DsaWorkspace } from './components/Studio/DsaWorkspace';
import { User, ProjectSummary, ProjectType } from './types';
import { fetchProjects, getAuthToken, clearAuthToken, deleteProject } from './api/client';
import { FolderGit2, Plus, Sparkles, Zap, Shield, Crown } from 'lucide-react';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectSummary | null>(null);
  const [activeMode, setActiveMode] = useState<ProjectType>('WEB_APP');
  const [loading, setLoading] = useState(true);

  // Modals
  const [authOpen, setAuthOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('lovable_user');
    const token = getAuthToken();
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
        loadProjects();
      } catch (e) {
        setAuthOpen(true);
      }
    } else {
      setAuthOpen(true);
      setLoading(false);
    }
  }, []);

  // Update activeMode whenever currentProject changes
  useEffect(() => {
    if (currentProject?.type) {
      setActiveMode(currentProject.type);
    }
  }, [currentProject?.id]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
      if (data.length > 0 && !currentProject) {
        setCurrentProject(data[0]);
        setActiveMode(data[0].type || 'WEB_APP');
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setAuthOpen(false);
    loadProjects();
  };

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    setProjects([]);
    setCurrentProject(null);
    setAuthOpen(true);
  };

  const handleProjectCreated = (newProject: ProjectSummary) => {
    setProjects((prev) => [newProject, ...prev]);
    setCurrentProject(newProject);
    setActiveMode(newProject.type || 'WEB_APP');
  };

  const handleDeleteProject = async (projectId: number) => {
    try {
      await deleteProject(projectId);
      setProjects((prev) => {
        const remaining = prev.filter((p) => p.id !== projectId);
        if (currentProject?.id === projectId) {
          const next = remaining.length > 0 ? remaining[0] : null;
          setCurrentProject(next);
          if (next) setActiveMode(next.type || 'WEB_APP');
        }
        return remaining;
      });
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      alert(err.response?.data?.message || err.message || 'Failed to delete project');
    }
  };

  const handleSelectProject = (project: ProjectSummary) => {
    setCurrentProject(project);
    setActiveMode(project.type || 'WEB_APP');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100">
      <Navbar
        user={user}
        currentProject={currentProject}
        activeMode={activeMode}
        onChangeMode={(mode) => setActiveMode(mode)}
        onOpenProjects={() => setProjectsOpen(true)}
        onOpenMembers={() => setMembersOpen(true)}
        onOpenPlans={() => setPlansOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onDeleteProject={currentProject ? () => handleDeleteProject(currentProject.id) : undefined}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex overflow-hidden">
        {currentProject ? (
          activeMode === 'DSA' ? (
            <DsaWorkspace key={`dsa-${currentProject.id}`} project={currentProject} />
          ) : (
            <StudioWorkspace key={`studio-${currentProject.id}`} project={currentProject} />
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-xl relative z-10">
              <Sparkles className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight relative z-10">
              Codecraft AI Architect & Adversary
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mb-8 leading-relaxed relative z-10">
              Synthesize full-stack React applications conversationally or stress-test your DSA competitive algorithms against randomized edge cases.
            </p>

            <div className="flex items-center gap-3 relative z-10">
              <button
                onClick={() => setProjectsOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create or Open Project</span>
              </button>

              <button
                onClick={() => setPlansOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition"
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Explore Plans</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
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
        onProjectDeleted={handleDeleteProject}
        onClose={() => setProjectsOpen(false)}
      />

      <PlansModal
        isOpen={plansOpen}
        onClose={() => setPlansOpen(false)}
      />

      {currentProject && (
        <MembersModal
          isOpen={membersOpen}
          projectId={currentProject.id}
          userRole={currentProject.role}
          onClose={() => setMembersOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
