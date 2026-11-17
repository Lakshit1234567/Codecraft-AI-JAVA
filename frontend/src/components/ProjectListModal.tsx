import React, { useState } from 'react';
import { X, Plus, FolderGit2, Check, ArrowRight, ShieldCheck, Globe, Zap } from 'lucide-react';
import { ProjectSummary, ProjectType } from '../types';
import { createProject } from '../api/client';

interface ProjectListModalProps {
  isOpen: boolean;
  projects: ProjectSummary[];
  currentProjectId: number | null;
  onSelectProject: (project: ProjectSummary) => void;
  onProjectCreated: (project: ProjectSummary) => void;
  onClose: () => void;
}

export const ProjectListModal: React.FC<ProjectListModalProps> = ({
  isOpen,
  projects,
  currentProjectId,
  onSelectProject,
  onProjectCreated,
  onClose,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState<ProjectType>('WEB_APP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const created = await createProject(newProjectName.trim(), newProjectType);
      onProjectCreated(created);
      setIsCreating(false);
      setNewProjectName('');
      setNewProjectType('WEB_APP');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-[#101726] border border-slate-800 rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Your Projects</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create Project Section */}
        <div className="mt-4">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-indigo-500/40 hover:border-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-300 text-xs font-medium flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Project</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Initialize New Project</span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              {/* Project Type Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewProjectType('WEB_APP')}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition ${
                    newProjectType === 'WEB_APP'
                      ? 'bg-indigo-600/15 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Globe className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-xs font-semibold">Web App</h5>
                    <p className="text-[10px] text-slate-400">React + AI Generation</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewProjectType('DSA')}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition ${
                    newProjectType === 'DSA'
                      ? 'bg-amber-500/15 border-amber-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-xs font-semibold">DSA Fuzzer</h5>
                    <p className="text-[10px] text-slate-400">Stress Test & Diagnosis</p>
                  </div>
                </button>
              </div>

              <input
                type="text"
                autoFocus
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={newProjectType === 'DSA' ? 'e.g. Trapping Rain Water Solution' : 'e.g. Modern SaaS Landing Page'}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
              />

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <button
                type="submit"
                disabled={loading || !newProjectName.trim()}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition shadow-lg shadow-indigo-600/20"
              >
                {loading ? 'Creating Project...' : 'Create & Launch Studio'}
              </button>
            </form>
          )}
        </div>

        {/* Project List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
          {projects.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No projects found. Create your first project above!
            </div>
          ) : (
            projects.map((proj) => {
              const isSelected = proj.id === currentProjectId;
              const isDsa = proj.type === 'DSA';

              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    onSelectProject(proj);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500/50 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected 
                        ? 'bg-indigo-600 text-white' 
                        : isDsa 
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isDsa ? <Zap className="w-4 h-4" /> : <FolderGit2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                        {proj.name}
                        {isSelected && <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-normal">Active</span>}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1 text-[10px]">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          {proj.role}
                        </span>
                        <span>•</span>
                        <span className="text-[10px]">{isDsa ? 'DSA Fuzzer' : 'Web App'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    {isSelected ? (
                      <Check className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <ArrowRight className="w-4 h-4 hover:translate-x-0.5 transition" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
