import React from 'react';
import { BookOpen, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';
import { TestCase, TestCaseStatus } from '../../../types';
import { ListSkeleton } from '../../ui/Skeleton';
import { EmptyState } from '../../ui/EmptyState';

interface RevisionDeckTabProps {
  testCases: TestCase[];
  loading: boolean;
  filter: TestCaseStatus | undefined;
  onChangeFilter: (filter: TestCaseStatus | undefined) => void;
  onToggleStatus: (tc: TestCase) => void;
}

export const RevisionDeckTab: React.FC<RevisionDeckTabProps> = ({
  testCases,
  loading,
  filter,
  onChangeFilter,
  onToggleStatus,
}) => {
  return (
    <div className="p-4 rounded-lg bg-surface-elevated border border-line h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-line-subtle mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink-primary inline-flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent-fg" aria-hidden="true" />
            <span>Saved Counterexamples</span>
          </h3>
          <p className="text-[11px] text-ink-secondary mt-0.5">
            Archived failing inputs for regression checks and spaced repetition.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filter saved test cases by status"
          className="flex items-center bg-surface-inset border border-line p-0.5 rounded-md self-start sm:self-auto"
        >
          {(
            [
              { value: undefined, label: 'All' },
              { value: 'FAILING' as const, label: 'Failing' },
              { value: 'RESOLVED' as const, label: 'Resolved' },
            ]
          ).map((item) => {
            const active = filter === item.value;
            return (
              <button
                key={item.label}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChangeFilter(item.value)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  active
                    ? 'bg-surface-subtle text-ink-primary'
                    : 'text-ink-muted hover:text-ink-secondary'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
        {loading ? (
          <ListSkeleton rows={4} label="Loading archived test cases" />
        ) : testCases.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-5 h-5" aria-hidden="true" />}
            title="No archived counterexamples"
            description={
              filter
                ? `No test cases match the "${filter.toLowerCase()}" filter.`
                : 'Counterexamples caught during differential fuzzing are saved here automatically.'
            }
          />
        ) : (
          <ul role="list" className="space-y-2.5">
            {testCases.map((tc) => {
              const isFailing = tc.status === 'FAILING';
              return (
                <li
                  key={tc.id}
                  className="p-3.5 rounded-lg bg-surface-base border border-line-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                          isFailing
                            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                            : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                        }`}
                      >
                        {isFailing ? (
                          <AlertCircle className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                        )}
                        {tc.status}
                      </span>
                      <span className="text-xs font-mono text-ink-muted truncate">
                        Input: <code className="text-amber-800 dark:text-amber-300">{tc.input}</code>
                      </span>
                    </div>

                    <div className="text-xs text-ink-secondary font-mono flex flex-wrap gap-x-3 gap-y-1">
                      <span>
                        Expected:{' '}
                        <strong className="text-emerald-700 dark:text-emerald-400">
                          {tc.expectedOutput}
                        </strong>
                      </span>
                      <span>
                        Actual:{' '}
                        <strong className="text-rose-700 dark:text-rose-400">
                          {tc.actualOutput}
                        </strong>
                      </span>
                    </div>

                    {tc.explanation && (
                      <p className="text-[11px] text-ink-muted leading-relaxed">{tc.explanation}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleStatus(tc)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition inline-flex items-center gap-1.5 shrink-0 border ${
                      isFailing
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                        : 'bg-surface-subtle text-ink-secondary border-line hover:text-ink-primary'
                    }`}
                  >
                    {isFailing ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Mark Resolved</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Re-open</span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
