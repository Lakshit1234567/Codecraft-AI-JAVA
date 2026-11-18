import React, { useMemo, useState } from 'react';
import {
  Plus,
  FolderGit2,
  Check,
  ShieldCheck,
  Globe,
  Zap,
  Trash2,
  Search,
  AlertCircle,
} from 'lucide-react';
import { ProjectSummary, ProjectType } from '../types';
import { createProject } from '../api/client';
import { Modal } from './ui/Modal';
import { EmptyState } from './ui/EmptyState';
import { useToast } from './ui/ToastProvider';

interface ProjectListModalProps {
  isOpen: boolean;
  projects: ProjectSummary[];
  currentProjectId: number | null;
  onSelectProject: (project: ProjectSummary) => void;
  onProjectCreated: (project: ProjectSummary) => void;
  onRequestDeleteProject: (project: ProjectSummary) => void;
  onClose: () => void;
}

export const ProjectListModal: React.FC<ProjectListModalProps> = ({
  isOpen,
  projects,
  currentProjectId,
  onSelectProject,
  onProjectCreated,
  onRequestDeleteProject,
  onClose,
}) => {
  const { notify } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState<ProjectType>('WEB_APP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ProjectType>('ALL');

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((proj) => {
      const normalizedType: ProjectType = proj.type || 'WEB_APP';
      if (typeFilter !== 'ALL' && normalizedType !== typeFilter) return false;
      if (q && !proj.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, searchQuery, typeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      const created = await createProject(trimmed, newProjectType);
      onProjectCreated(created);
      notify(`Created "${created.name}"`, 'success');
      setIsCreating(false);
      setNewProjectName('');
      setNewProjectType('WEB_APP');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Projects"
      description="Switch between active workspaces or initialize a new project."
      icon={<FolderGit2 className="w-4 h-4 text-accent-fg" aria-hidden="true" />}
      maxWidthClass="max-w-xl"
    >
      {/* Create Project Section */}
      {!isCreating ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setNewProjectType('WEB_APP');
              setIsCreating(true);
              setError(null);
            }}
            className="p-3 rounded-lg border border-dashed border-line-strong hover:border-accent-fg bg-surface-base hover:bg-surface-subtle text-left flex items-center gap-3 transition"
          >
            <div className="w-8 h-8 rounded-md bg-accent-subtle text-accent-fg flex items-center justify-center shrink-0">
              <Plus className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-semibold text-ink-primary">New Web App</div>
              <div className="text-[11px] text-ink-secondary">React + Live Preview</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewProjectType('DSA');
              setIsCreating(true);
              setError(null);
            }}
            className="p-3 rounded-lg border border-dashed border-line-strong hover:border-dsa-fg bg-surface-base hover:bg-surface-subtle text-left flex items-center gap-3 transition"
          >
            <div className="w-8 h-8 rounded-md bg-dsa-subtle text-dsa-fg flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-semibold text-ink-primary">New DSA Fuzzer</div>
              <div className="text-[11px] text-ink-secondary">Differential stress testing</div>
            </div>
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleCreate}
          className="p-4 rounded-lg bg-surface-base border border-line space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-ink-primary">
              Create {newProjectType === 'DSA' ? 'DSA Fuzzer' : 'Web App'} Project
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setError(null);
              }}
              className="text-xs text-ink-secondary hover:text-ink-primary transition"
            >
              Cancel
            </button>
          </div>

          <fieldset>
            <legend className="sr-only">Project type</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Project type">
              <button
                type="button"
                role="radio"
                aria-checked={newProjectType === 'WEB_APP'}
                onClick={() => setNewProjectType('WEB_APP')}
                className={`p-2.5 rounded-md border text-left flex items-start gap-2.5 transition ${
                  newProjectType === 'WEB_APP'
                    ? 'bg-accent-subtle border-accent text-ink-primary'
                    : 'bg-surface-inset border-line text-ink-secondary hover:border-line-strong'
                }`}
              >
                <Globe className="w-4 h-4 text-accent-fg mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-xs font-medium">Web App</div>
                  <div className="text-[11px] text-ink-muted">React + Preview</div>
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={newProjectType === 'DSA'}
                onClick={() => setNewProjectType('DSA')}
                className={`p-2.5 rounded-md border text-left flex items-start gap-2.5 transition ${
                  newProjectType === 'DSA'
                    ? 'bg-dsa-subtle border-dsa text-ink-primary'
                    : 'bg-surface-inset border-line text-ink-secondary hover:border-line-strong'
                }`}
              >
                <Zap className="w-4 h-4 text-dsa-fg mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-xs font-medium">DSA Fuzzer</div>
                  <div className="text-[11px] text-ink-muted">Edge-case testing</div>
                </div>
              </button>
            </div>
          </fieldset>

          <div>
            <label htmlFor="new-project-name" className="block text-xs font-medium text-ink-secondary mb-1.5">
              Project Name
            </label>
            <input
              id="new-project-name"
              type="text"
              data-autofocus
              required
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder={
                newProjectType === 'DSA'
                  ? 'e.g. Trapping Rain Water'
                  : 'e.g. Analytics Dashboard'
              }
              className="w-full px-3 py-2 rounded-md bg-surface-inset border border-line text-ink-primary placeholder-ink-muted text-xs focus:border-accent-fg focus:outline-none transition"
            />
          </div>

          {error && (
            <div role="alert" className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !newProjectName.trim()}
            className="w-full py-2 px-3 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium transition"
          >
            {loading ? 'Creating project...' : 'Create & Open Workspace'}
          </button>
        </form>
      )}

      {/* Search & Filter */}
      {projects.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Filter projects"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-surface-inset border border-line text-xs text-ink-primary placeholder-ink-muted focus:border-accent-fg focus:outline-none transition"
            />
          </div>

          <div
            role="tablist"
            aria-label="Filter projects by type"
            className="flex items-center bg-surface-inset border border-line p-0.5 rounded-md shrink-0"
          >
            {(['ALL', 'WEB_APP', 'DSA'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={typeFilter === filter}
                onClick={() => setTypeFilter(filter)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  typeFilter === filter
                    ? 'bg-surface-subtle text-ink-primary'
                    : 'text-ink-muted hover:text-ink-secondary'
                }`}
              >
                {filter === 'ALL' ? 'All' : filter === 'WEB_APP' ? 'Web' : 'DSA'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="mt-3 space-y-1.5">
        {projects.length === 0 ? (
          <EmptyState
            compact
            icon={<FolderGit2 className="w-5 h-5" aria-hidden="true" />}
            title="No projects yet"
            description="Initialize a Web App or DSA Fuzzer project above to start building."
          />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            compact
            icon={<Search className="w-5 h-5" aria-hidden="true" />}
            title="No matching projects"
            description="Try a different search term or reset the type filter."
          />
        ) : (
          <ul role="list" className="space-y-1.5">
            {filteredProjects.map((proj) => {
              const isSelected = proj.id === currentProjectId;
              const isDsa = proj.type === 'DSA';

              return (
                <li
                  key={proj.id}
                  className={`rounded-lg border transition flex items-center justify-between gap-2 pr-2 ${
                    isSelected
                      ? 'bg-accent-subtle/60 border-accent/50'
                      : 'bg-surface-base border-line-subtle hover:border-line'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProject(proj);
                      onClose();
                    }}
                    className="flex-1 min-w-0 p-2.5 text-left flex items-center gap-3 rounded-l-lg"
                  >
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-accent text-white'
                          : isDsa
                          ? 'bg-dsa-subtle text-dsa-fg border border-dsa/30'
                          : 'bg-surface-subtle text-ink-secondary border border-line'
                      }`}
                    >
                      {isDsa ? (
                        <Zap className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <FolderGit2 className="w-4 h-4" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink-primary truncate">
                          {proj.name}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-fg font-medium shrink-0">
                            <Check className="w-2.5 h-2.5" aria-hidden="true" />
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-muted font-mono">
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          {proj.role}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{isDsa ? 'DSA Fuzzer' : 'Web App'}</span>
                      </div>
                    </div>
                  </button>

                  {proj.role === 'OWNER' && (
                    <button
                      type="button"
                      onClick={() => onRequestDeleteProject(proj)}
                      aria-label={`Delete project ${proj.name}`}
                      title="Delete project"
                      className="p-1.5 rounded-md text-ink-muted hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
};
