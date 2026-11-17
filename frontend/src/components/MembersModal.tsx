import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Shield, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ProjectMember, ProjectRole } from '../types';
import { fetchProjectMembers, inviteMember, removeMember } from '../api/client';

interface MembersModalProps {
  isOpen: boolean;
  projectId: number;
  userRole?: ProjectRole;
  onClose: () => void;
}

export const MembersModal: React.FC<MembersModalProps> = ({
  isOpen,
  projectId,
  userRole,
  onClose,
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectRole>('EDITOR');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      loadMembers();
    }
  }, [isOpen, projectId]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await fetchProjectMembers(projectId);
      setMembers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load project members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;

    setError(null);
    setSuccess(null);
    try {
      await inviteMember(projectId, inviteUsername.trim(), inviteRole);
      setSuccess(`Successfully invited ${inviteUsername.trim()} as ${inviteRole}!`);
      setInviteUsername('');
      loadMembers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to invite member. Ensure the user exists in the system.');
    }
  };

  const handleRemove = async (userId: number, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this project?`)) return;
    try {
      await removeMember(projectId, userId);
      loadMembers();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to remove member');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-[#101726] border border-slate-800 rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Project Members & Collaborators</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
              Add Collaborator
            </span>
            <span className="text-[10px] text-slate-400">Team permissions</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder="Username or email (e.g. user1@example.com)..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="EDITOR">EDITOR</option>
              <option value="VIEWER">VIEWER</option>
            </select>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-md shadow-indigo-600/20"
            >
              Add
            </button>
          </div>
        </form>

        {/* Members List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1 mb-2">
            Current Members ({members.length})
          </div>

          {loading ? (
            <div className="text-center py-6 text-slate-500 text-xs">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">No members found.</div>
          ) : (
            members.map((m) => (
              <div
                key={m.userId}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-indigo-400 font-semibold text-xs flex items-center justify-center border border-slate-700 shadow-sm">
                    {m.name ? m.name.charAt(0).toUpperCase() : m.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">{m.name || m.username}</h5>
                    <span className="text-[11px] text-slate-400 font-mono">{m.username}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                    m.role === 'OWNER' 
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                      : m.role === 'EDITOR'
                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {m.role}
                  </span>

                  {m.role !== 'OWNER' && (
                    <button
                      onClick={() => handleRemove(m.userId, m.name || m.username)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Remove Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
