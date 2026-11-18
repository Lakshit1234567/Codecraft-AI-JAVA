import React, { useState } from 'react';
import {
  Zap,
  Terminal,
  AlertTriangle,
  Play,
  RefreshCw,
  Check,
  BookmarkPlus,
  ShieldCheck,
  Copy,
  Stethoscope,
} from 'lucide-react';
import { DsaSuiteResponse } from '../../../types';
import { EmptyState } from '../../ui/EmptyState';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { OutputDiffView } from './OutputDiffView';

export interface MismatchInfo {
  input: string;
  expected: string;
  actual: string;
  explanation?: string;
}

interface FuzzingSuiteTabProps {
  suite: DsaSuiteResponse | null;
  mismatch: MismatchInfo | null;
  runningTest: boolean;
  diagnosing: boolean;
  diagnosisText: string;
  isSaved: boolean;
  onRunStressTest: () => void;
  onDiagnose: () => void;
  onSaveToDeck: () => void;
}

export const FuzzingSuiteTab: React.FC<FuzzingSuiteTabProps> = ({
  suite,
  mismatch,
  runningTest,
  diagnosing,
  diagnosisText,
  isSaved,
  onRunStressTest,
  onDiagnose,
  onSaveToDeck,
}) => {
  const [copiedKey, setCopiedKey] = useState<'brute' | 'gen' | 'input' | null>(null);

  const copySnippet = async (text: string | undefined, key: 'brute' | 'gen' | 'input') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full overflow-y-auto pr-0.5">
      {/* Left: Synthesized Artifacts */}
      <div className="space-y-4">
        <div className="rounded-lg bg-surface-elevated border border-line overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-line-subtle bg-surface-base flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-ink-primary inline-flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-dsa-fg" aria-hidden="true" />
              <span>Brute-Force Reference Oracle</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-muted font-mono">
                {suite?.bruteForcePath || 'brute_force'}
              </span>
              {suite?.bruteForceCode && (
                <button
                  type="button"
                  onClick={() => copySnippet(suite.bruteForceCode, 'brute')}
                  aria-label="Copy brute-force solver code"
                  className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-subtle transition"
                >
                  {copiedKey === 'brute' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          </div>
          <pre className="p-3 bg-surface-inset text-[11px] font-mono text-ink-secondary max-h-56 overflow-auto leading-relaxed m-0">
            {suite?.bruteForceCode || '// Run differential fuzzing or click Synthesize Suite to generate.'}
          </pre>
        </div>

        <div className="rounded-lg bg-surface-elevated border border-line overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-line-subtle bg-surface-base flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-ink-primary inline-flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-accent-fg" aria-hidden="true" />
              <span>Random Edge-Case Generator</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-muted font-mono">
                {suite?.generatorPath || 'generator'}
              </span>
              {suite?.generatorCode && (
                <button
                  type="button"
                  onClick={() => copySnippet(suite.generatorCode, 'gen')}
                  aria-label="Copy generator code"
                  className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-subtle transition"
                >
                  {copiedKey === 'gen' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          </div>
          <pre className="p-3 bg-surface-inset text-[11px] font-mono text-ink-secondary max-h-56 overflow-auto leading-relaxed m-0">
            {suite?.generatorCode || '// Generates randomized datasets within problem bounds.'}
          </pre>
        </div>

        <button
          type="button"
          onClick={onRunStressTest}
          disabled={runningTest}
          className="w-full py-2 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium inline-flex items-center justify-center gap-2 transition"
        >
          {runningTest ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
          )}
          <span>{runningTest ? 'Running Fuzz Loop...' : 'Re-Run Differential Fuzzing'}</span>
        </button>
      </div>

      {/* Right: Counterexample Diff & Diagnosis */}
      <div className="p-4 rounded-lg bg-surface-elevated border border-line shadow-card flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-ink-primary inline-flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <span>Counterexample &amp; Root-Cause Diagnosis</span>
            </h3>
            {mismatch && (
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                Mismatch Detected
              </span>
            )}
          </div>

          {mismatch ? (
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-surface-inset border border-line-subtle">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-ink-muted font-mono">
                    Failing Input (stdin)
                  </span>
                  <button
                    type="button"
                    onClick={() => copySnippet(mismatch.input, 'input')}
                    className="inline-flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink-primary"
                  >
                    {copiedKey === 'input' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <span className="text-emerald-700 dark:text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" aria-hidden="true" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs font-mono text-amber-800 dark:text-amber-300 whitespace-pre-wrap break-all m-0 max-h-32 overflow-y-auto">
                  {mismatch.input}
                </pre>
              </div>

              <OutputDiffView expected={mismatch.expected} actual={mismatch.actual} />

              <div className="pt-1 space-y-2.5">
                <button
                  type="button"
                  onClick={onDiagnose}
                  disabled={diagnosing}
                  className="w-full py-2 px-3 rounded-md bg-surface-subtle hover:bg-line disabled:opacity-50 text-ink-primary border border-line text-xs font-medium inline-flex items-center justify-center gap-1.5 transition"
                >
                  {diagnosing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-fg" aria-hidden="true" />
                  ) : (
                    <Stethoscope className="w-3.5 h-3.5 text-accent-fg" aria-hidden="true" />
                  )}
                  <span>{diagnosing ? 'Streaming Diagnosis...' : 'Diagnose Root Cause with AI'}</span>
                </button>

                {diagnosisText && (
                  <div
                    aria-live="polite"
                    className="p-3.5 rounded-md bg-surface-inset border border-line max-h-60 overflow-y-auto"
                  >
                    <MarkdownRenderer content={diagnosisText} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Zap className="w-5 h-5" aria-hidden="true" />}
              title="No counterexample captured"
              description="Run differential fuzzing to test your solution against randomized boundary inputs."
            />
          )}
        </div>

        {mismatch && (
          <div className="mt-4 pt-3 border-t border-line-subtle flex flex-wrap justify-between items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Persisted to database</span>
            </span>
            <button
              type="button"
              onClick={onSaveToDeck}
              disabled={isSaved}
              className="px-3 py-1.5 rounded-md bg-surface-subtle hover:bg-line disabled:opacity-60 border border-line text-xs font-medium text-ink-primary inline-flex items-center gap-1.5 transition"
            >
              {isSaved ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{isSaved ? 'Saved to Revision Deck' : 'Save to Revision Deck'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
