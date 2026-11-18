import React, { useState } from 'react';
import { BookOpen, Terminal, Zap, Play, RefreshCw, Copy, Check, RotateCcw } from 'lucide-react';
import { ProgrammingLanguage } from '../../../types';
import { CodeEditorTextarea } from './CodeEditorTextarea';

interface ProblemEditorTabProps {
  language: ProgrammingLanguage;
  problemDescription: string;
  userSolution: string;
  synthesizing: boolean;
  runningTest: boolean;
  onChangeProblem: (value: string) => void;
  onChangeSolution: (value: string) => void;
  onResetTemplate: () => void;
  onSynthesizeSuite: () => void;
  onRunStressTest: () => void;
}

export const ProblemEditorTab: React.FC<ProblemEditorTabProps> = ({
  language,
  problemDescription,
  userSolution,
  synthesizing,
  runningTest,
  onChangeProblem,
  onChangeSolution,
  onResetTemplate,
  onSynthesizeSuite,
  onRunStressTest,
}) => {
  const [copied, setCopied] = useState(false);
  const lineCount = userSolution ? userSolution.split('\n').length : 0;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(userSolution);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full overflow-y-auto lg:overflow-hidden">
      {/* Left: Problem Statement & Fuzz Actions */}
      <div className="flex flex-col gap-3 min-h-[340px] lg:h-full">
        <div className="p-3.5 rounded-lg bg-surface-elevated border border-line shadow-card flex-1 flex flex-col">
          <label
            htmlFor="dsa-problem-input"
            className="text-xs font-semibold text-ink-primary mb-2 flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-dsa-fg" aria-hidden="true" />
            <span>Problem Statement &amp; Constraints</span>
          </label>
          <textarea
            id="dsa-problem-input"
            value={problemDescription}
            onChange={(e) => onChangeProblem(e.target.value)}
            placeholder="Paste problem specification, input bounds, and expected output format..."
            className="flex-1 p-3 rounded-md bg-surface-inset border border-line-subtle text-xs font-mono text-ink-primary placeholder-ink-muted focus:border-accent-fg focus:outline-none resize-none leading-relaxed"
          />
        </div>

        <div className="p-3.5 rounded-lg bg-surface-elevated border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-ink-primary">
              Differential Stress Engine
            </h3>
            <p className="text-[11px] text-ink-secondary mt-0.5 leading-relaxed">
              Compares an LLM brute-force oracle against your solution across 50 randomized edge inputs.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onSynthesizeSuite}
              disabled={synthesizing}
              className="px-3 py-1.5 rounded-md bg-surface-subtle hover:bg-line disabled:opacity-50 text-ink-primary font-medium text-xs inline-flex items-center gap-1.5 transition border border-line"
            >
              {synthesizing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-dsa-fg" aria-hidden="true" />
              )}
              <span>Synthesize Suite</span>
            </button>

            <button
              type="button"
              onClick={onRunStressTest}
              disabled={runningTest}
              className="px-3.5 py-1.5 rounded-md bg-dsa hover:bg-dsa-hover disabled:opacity-50 text-white font-medium text-xs inline-flex items-center gap-1.5 transition"
            >
              {runningTest ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              )}
              <span>Run 50 Tests</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right: Solution Code Editor */}
      <div className="p-3.5 rounded-lg bg-surface-elevated border border-line shadow-card flex flex-col min-h-[380px] lg:h-full">
        <div className="flex items-center justify-between gap-2 mb-2">
          <label
            htmlFor="dsa-solution-editor"
            className="text-xs font-semibold text-ink-primary flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-accent-fg" aria-hidden="true" />
            <span>Your Solution ({language})</span>
            <span className="text-[11px] font-mono text-ink-muted font-normal tabular-nums">
              · {lineCount} lines
            </span>
          </label>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onResetTemplate}
              title={`Load default ${language} template`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-ink-muted hover:text-ink-primary hover:bg-surface-subtle transition"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span className="hidden sm:inline">Template</span>
            </button>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-ink-muted hover:text-ink-primary hover:bg-surface-subtle transition"
            >
              {copied ? (
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
        </div>

        <CodeEditorTextarea
          id="dsa-solution-editor"
          value={userSolution}
          onChange={onChangeSolution}
          languageLabel={language === 'CPP' ? 'C++17' : language === 'PYTHON' ? 'Python 3' : 'Java 21'}
        />
      </div>
    </div>
  );
};
