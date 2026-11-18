import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Code2, Eye, EyeOff } from 'lucide-react';
import { login, signup } from '../api/client';
import { User } from '../types';
import { Modal } from './ui/Modal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = isSignup
        ? await signup(name.trim() || 'Developer', username.trim(), password)
        : await login(username.trim(), password);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Authentication failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setIsSignup(false);
    setUsername('testuser@example.com');
    setPassword('password123');
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      title={isSignup ? 'Create your Codecraft account' : 'Sign in to Codecraft'}
      description={
        isSignup
          ? 'Build React applications and stress-test algorithms in one workspace.'
          : 'Enter your credentials to open your projects and workspaces.'
      }
      icon={<Code2 className="w-4 h-4 text-accent-fg" aria-hidden="true" />}
    >
      {error && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-md bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {isSignup && (
          <div>
            <label htmlFor="auth-name" className="block text-xs font-medium text-ink-secondary mb-1.5">
              Full Name
            </label>
            <input
              id="auth-name"
              type="text"
              required
              autoComplete="name"
              data-autofocus={isSignup ? '' : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aarav Sharma"
              className="w-full px-3 py-2 rounded-md bg-surface-inset border border-line text-ink-primary placeholder-ink-muted text-sm focus:border-accent-fg focus:outline-none transition"
            />
          </div>
        )}

        <div>
          <label htmlFor="auth-username" className="block text-xs font-medium text-ink-secondary mb-1.5">
            Email or Username
          </label>
          <input
            id="auth-username"
            type="text"
            required
            autoComplete="username"
            data-autofocus={!isSignup ? '' : undefined}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-3 py-2 rounded-md bg-surface-inset border border-line text-ink-primary placeholder-ink-muted text-sm focus:border-accent-fg focus:outline-none transition"
          />
        </div>

        <div>
          <label htmlFor="auth-password" className="block text-xs font-medium text-ink-secondary mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full pl-3 pr-10 py-2 rounded-md bg-surface-inset border border-line text-ink-primary placeholder-ink-muted text-sm focus:border-accent-fg focus:outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ink-muted hover:text-ink-primary transition"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2 px-4 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 transition"
        >
          {loading ? (
            <span
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
              aria-hidden="true"
            />
          ) : (
            <>
              <span>{isSignup ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <div className="mt-4 pt-3.5 border-t border-line-subtle flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setIsSignup((prev) => !prev);
            setError(null);
          }}
          className="text-ink-secondary hover:text-accent-fg transition"
        >
          {isSignup ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>

        {!isSignup && (
          <button
            type="button"
            onClick={fillDemoAccount}
            className="text-ink-muted hover:text-ink-primary font-mono text-[11px] transition"
          >
            Use demo credentials
          </button>
        )}
      </div>
    </Modal>
  );
};
