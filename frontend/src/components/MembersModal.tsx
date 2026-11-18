import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { ProjectMember, ProjectRole } from '../types';
import {
  fetchProjectMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
} from '../api/client';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { ListSkeleton } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';
import { useToast } from './ui/ToastProvider';

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
  const { notify } = useToast();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectRole>('EDITOR');
  const [error, setError] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const canManage = userRole === 'OWNER';

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjectMembers(projectId);
      setMembers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load project members');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && projectId) {
      loadMembers();
    }
  }, [isOpen, projectId, loadMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = inviteUsername.trim();
    if (!target) return;

    setInviting(true);
    setError(null);
    try {
      await inviteMember(projectId, target, inviteRole);
      notify(`Invited ${target} as ${inviteRole}`, 'success');
      setInviteUsername('');
      await loadMembers();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to invite member. Verify that the account exists.'
      );
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: ProjectMember, nextRole: ProjectRole) => {
    try {
      await updateMemberRole(projectId, member.userId, nextRole);
      setMembers((prev) =>
        prev.map((m) => (m.userId === member.userId ? { ...m, role: nextRole } : m))
      );
      notify(`Updated ${member.name || member.username} to ${nextRole}`, 'success');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update role');
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setRemoving(true);
    try {
      await removeMember(projectId, memberToRemove.userId);
      notify(`Removed ${memberToRemove.name || memberToRemove.username}`, 'info');
      setMemberToRemove(null);
      await loadMembers();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to remove member');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Project Members"
        description="Manage collaborators and workspace access roles."
        icon={<Users className="w-4 h-4 text-accent-fg" aria-hidden="true" />}
        maxWidthClass="max-w-lg"
      >
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-md bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={loadMembers}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-200 hover:underline shrink-0"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {/* Invite Form */}
        {canManage && (
          <form
            onSubmit={handleInvite}
            className="p-3.5 rounded-lg bg-surface-base border border-line space-y-2.5 mb-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-primary flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-accent-fg" aria-hidden="true" />
                Invite Collaborator
              </span>
              <span className="text-[11px] text-ink-muted">Instant access</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <label htmlFor="invite-username" className="sr-only">
                Collaborator email or username
              </label>
              <input
                id="invite-username"
                type="text"
                required
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="teammate@example.com"
                className="flex-1 px-3 py-1.5 rounded-md bg-surface-inset border border-line text-ink-primary placeholder-ink-muted text-xs focus:border-accent-fg focus:outline-none transition"
              />
              <div className="flex gap-2">
                <label htmlFor="invite-role" className="sr-only">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
                  className="px-2.5 py-1.5 rounded-md bg-surface-inset border border-line text-ink-primary text-xs focus:border-accent-fg focus:outline-none"
                >
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting || !inviteUsername.trim()}
                  className="px-3.5 py-1.5 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium transition shrink-0"
                >
                  {inviting ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Members List */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
            Members ({members.length})
          </div>

          {loading ? (
            <ListSkeleton rows={3} label="Loading project members" />
          ) : members.length === 0 ? (
            <EmptyState
              compact
              icon={<Users className="w-5 h-5" aria-hidden="true" />}
              title="No collaborators yet"
              description="Invite teammates by email or username to collaborate on this workspace."
            />
          ) : (
            <ul role="list" className="space-y-1.5">
              {members.map((member) => (
                <li
                  key={member.userId}
                  className="p-2.5 rounded-lg bg-surface-base border border-line-subtle flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      aria-hidden="true"
                      className="w-8 h-8 rounded-md bg-surface-subtle text-ink-primary font-semibold text-xs flex items-center justify-center border border-line shrink-0"
                    >
                      {(member.name || member.username).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-ink-primary truncate">
                        {member.name || member.username}
                      </div>
                      <div className="text-[11px] text-ink-muted font-mono truncate">
                        {member.username}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {member.role === 'OWNER' || !canManage ? (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                          member.role === 'OWNER'
                            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                            : member.role === 'EDITOR'
                            ? 'bg-accent-subtle text-accent-fg border-accent/30'
                            : 'bg-surface-subtle text-ink-secondary border-line'
                        }`}
                      >
                        {member.role}
                      </span>
                    ) : (
                      <select
                        aria-label={`Role for ${member.name || member.username}`}
                        value={member.role}
                        onChange={(e) => handleRoleChange(member, e.target.value as ProjectRole)}
                        className="px-2 py-1 rounded-md bg-surface-inset border border-line text-[11px] font-mono text-ink-primary focus:border-accent-fg focus:outline-none"
                      >
                        <option value="EDITOR">EDITOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    )}

                    {canManage && member.role !== 'OWNER' && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(member)}
                        aria-label={`Remove ${member.name || member.username} from project`}
                        title="Remove member"
                        className="p-1.5 rounded-md text-ink-muted hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(memberToRemove)}
        title="Remove collaborator"
        message={`Remove ${memberToRemove?.name || memberToRemove?.username || 'this member'} from this project? They will immediately lose access to the workspace.`}
        confirmLabel="Remove Member"
        destructive
        loading={removing}
        onConfirm={handleConfirmRemove}
        onCancel={() => setMemberToRemove(null)}
      />
    </>
  );
};
