import React from 'react';
import { Terminal, Zap, BookOpen, Play, RefreshCw } from 'lucide-react';
import { ProgrammingLanguage } from '../../../types';

export type DsaTab = 'editor' | 'suite' | 'deck';

interface DsaToolbarProps {
  activeTab: DsaTab;
  hasMismatch: boolean;
  language: ProgrammingLanguage;
  runningTest: boolean;
  onChangeTab: (tab: DsaTab) => void;
  onChangeLanguage: (lang: ProgrammingLanguage) => void;
  onRunStressTest: () => void;
}

export const DsaToolbar: React.FC<DsaToolbarProps> = ({
  activeTab,
  hasMismatch,
  language,
  runningTest,
  onChangeTab,
  onChangeLanguage,
  onRunStressTest,
}) => {
  return (
    <div className="min-h-[44px] px-3 sm:px-4 py-1.5 border-b border-line-subtle bg-surface-base flex flex-wrap items-center justify-between gap-2 shrink-0">
      <div
        role="tablist"
        aria-label="DSA workspace sections"
        className="flex items-center gap-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'editor'}
          onClick={() => onChangeTab('editor')}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition ${
            activeTab === 'editor'
              ? 'bg-dsa-subtle text-dsa-fg border border-dsa/40'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle border border-transparent'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Editor</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'suite'}
          onClick={() => onChangeTab('suite')}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition ${
            activeTab === 'suite'
              ? 'bg-accent-subtle text-accent-fg border border-accent/40'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle border border-transparent'
          }`}
        >
          <Zap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Counterexample</span>
          {hasMismatch && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-rose-400"
              aria-label="Counterexample found"
            />
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'deck'}
          onClick={() => onChangeTab('deck')}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition ${
            activeTab === 'deck'
              ? 'bg-surface-subtle text-ink-primary border border-line'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle border border-transparent'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Revision Deck</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor="dsa-language-select" className="text-[11px] text-ink-muted font-mono hidden sm:inline">
            Runtime:
          </label>
          <select
            id="dsa-language-select"
            value={language}
            onChange={(e) => onChangeLanguage(e.target.value as ProgrammingLanguage)}
            className="px-2 py-1 rounded-md bg-surface-inset border border-line text-xs text-dsa-fg font-mono focus:border-dsa-fg focus:outline-none"
          >
            <option value="CPP">C++17 (g++)</option>
            <option value="PYTHON">Python 3</option>
            <option value="JAVA">Java 21</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onRunStressTest}
          disabled={runningTest}
          className="px-3 py-1.5 rounded-md bg-dsa hover:bg-dsa-hover disabled:opacity-50 text-white font-medium text-xs inline-flex items-center gap-1.5 transition"
        >
          {runningTest ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
          )}
          <span>{runningTest ? 'Fuzzing (50 runs)...' : 'Run Differential Fuzzing'}</span>
        </button>
      </div>
    </div>
  );
};
