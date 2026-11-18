import React, { useMemo } from 'react';
import { Check, AlertCircle } from 'lucide-react';

interface OutputDiffViewProps {
  expected: string;
  actual: string;
}

interface DiffLine {
  lineNumber: number;
  expectedLine: string;
  actualLine: string;
  matches: boolean;
}

function highlightCharDiff(primary: string, compare: string, variant: 'expected' | 'actual') {
  const maxLen = Math.max(primary.length, compare.length);
  const highlightClass =
    variant === 'expected'
      ? 'bg-emerald-200/80 dark:bg-emerald-500/30 text-emerald-950 dark:text-emerald-100 rounded-xs px-0.5'
      : 'bg-rose-200/80 dark:bg-rose-500/30 text-rose-950 dark:text-rose-100 rounded-xs px-0.5';

  // Find first differing index from start and end to highlight minimal differing span
  let prefix = 0;
  while (prefix < primary.length && prefix < compare.length && primary[prefix] === compare[prefix]) {
    prefix++;
  }

  let suffix = 0;
  while (
    suffix < primary.length - prefix &&
    suffix < compare.length - prefix &&
    primary[primary.length - 1 - suffix] === compare[compare.length - 1 - suffix]
  ) {
    suffix++;
  }

  if (prefix === primary.length && maxLen === primary.length) {
    return <span>{primary || '∅'}</span>;
  }

  const head = primary.slice(0, prefix);
  const middle = primary.slice(prefix, primary.length - suffix);
  const tail = suffix > 0 ? primary.slice(primary.length - suffix) : '';

  return (
    <>
      {head && <span>{head}</span>}
      {middle ? (
        <mark className={highlightClass}>{middle}</mark>
      ) : (
        <mark className={highlightClass}>∅</mark>
      )}
      {tail && <span>{tail}</span>}
    </>
  );
}

export const OutputDiffView: React.FC<OutputDiffViewProps> = ({ expected, actual }) => {
  const rows = useMemo<DiffLine[]>(() => {
    const expLines = (expected || '').replace(/\r\n/g, '\n').split('\n');
    const actLines = (actual || '').replace(/\r\n/g, '\n').split('\n');
    const maxLines = Math.max(expLines.length, actLines.length);

    return Array.from({ length: maxLines }).map((_, idx) => {
      const expectedLine = expLines[idx] ?? '';
      const actualLine = actLines[idx] ?? '';
      return {
        lineNumber: idx + 1,
        expectedLine,
        actualLine,
        matches: expectedLine.trimEnd() === actualLine.trimEnd(),
      };
    });
  }, [expected, actual]);

  const mismatchCount = rows.filter((r) => !r.matches).length;

  return (
    <div className="rounded-md border border-line overflow-hidden bg-surface-inset">
      <div className="px-3 py-1.5 bg-surface-base border-b border-line-subtle flex items-center justify-between text-[10px] font-mono">
        <span className="font-semibold uppercase tracking-wider text-ink-secondary">
          Output Diff Comparison
        </span>
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${
            mismatchCount > 0
              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
          }`}
        >
          {mismatchCount > 0 ? (
            <>
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              <span>
                {mismatchCount} {mismatchCount === 1 ? 'line differs' : 'lines differ'}
              </span>
            </>
          ) : (
            <>
              <Check className="w-3 h-3" aria-hidden="true" />
              <span>Identical</span>
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line-subtle">
        {/* Expected Column */}
        <div className="min-w-0">
          <div className="px-3 py-1.5 bg-emerald-50/70 dark:bg-emerald-500/5 border-b border-line-subtle text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
            Expected (Oracle)
          </div>
          <div className="p-2 space-y-0.5 font-mono text-xs overflow-x-auto max-h-40 overflow-y-auto">
            {rows.map((row) => (
              <div
                key={`exp-${row.lineNumber}`}
                className={`flex items-start gap-2 px-1.5 py-0.5 rounded ${
                  row.matches ? 'text-ink-secondary' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                <span className="text-[10px] text-ink-muted tabular-nums select-none w-4 shrink-0 pt-0.5">
                  {row.lineNumber}
                </span>
                <span className="whitespace-pre-wrap break-all flex-1">
                  {row.matches
                    ? row.expectedLine || ' '
                    : highlightCharDiff(row.expectedLine, row.actualLine, 'expected')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actual Column */}
        <div className="min-w-0">
          <div className="px-3 py-1.5 bg-rose-50/70 dark:bg-rose-500/5 border-b border-line-subtle text-[10px] uppercase tracking-wider text-rose-700 dark:text-rose-400 font-mono font-semibold">
            Actual (Your Code)
          </div>
          <div className="p-2 space-y-0.5 font-mono text-xs overflow-x-auto max-h-40 overflow-y-auto">
            {rows.map((row) => (
              <div
                key={`act-${row.lineNumber}`}
                className={`flex items-start gap-2 px-1.5 py-0.5 rounded ${
                  row.matches ? 'text-ink-secondary' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200'
                }`}
              >
                <span className="text-[10px] text-ink-muted tabular-nums select-none w-4 shrink-0 pt-0.5">
                  {row.lineNumber}
                </span>
                <span className="whitespace-pre-wrap break-all flex-1">
                  {row.matches
                    ? row.actualLine || ' '
                    : highlightCharDiff(row.actualLine, row.expectedLine, 'actual')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
