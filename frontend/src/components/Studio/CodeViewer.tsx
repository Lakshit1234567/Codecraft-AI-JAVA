import React, { useEffect, useMemo, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import {
  Copy,
  Check,
  FileCode,
  WrapText,
  PanelLeft,
  Search,
  Download,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react';
import { CodeSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { EditorTabsBar } from './CodeViewer/EditorTabsBar';

interface CodeViewerProps {
  filePath: string | null;
  code: string | null;
  loading: boolean;
  openTabs?: string[];
  onSelectTab?: (path: string) => void;
  onCloseTab?: (path: string) => void;
  onToggleExplorer?: () => void;
}

function detectLanguage(path: string): { grammar: Prism.Grammar; label: string } {
  const lower = path.toLowerCase();
  if (lower.endsWith('.tsx')) return { grammar: Prism.languages.tsx || Prism.languages.javascript, label: 'TSX' };
  if (lower.endsWith('.ts')) return { grammar: Prism.languages.typescript || Prism.languages.javascript, label: 'TS' };
  if (lower.endsWith('.jsx')) return { grammar: Prism.languages.jsx || Prism.languages.javascript, label: 'JSX' };
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) return { grammar: Prism.languages.javascript, label: 'JS' };
  if (lower.endsWith('.css')) return { grammar: Prism.languages.css, label: 'CSS' };
  if (lower.endsWith('.json')) return { grammar: Prism.languages.json, label: 'JSON' };
  if (lower.endsWith('.html') || lower.endsWith('.xml') || lower.endsWith('.svg')) {
    return { grammar: Prism.languages.markup, label: 'HTML' };
  }
  if (lower.endsWith('.java')) return { grammar: Prism.languages.java, label: 'Java' };
  if (lower.endsWith('.py')) return { grammar: Prism.languages.python, label: 'Python' };
  if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.h')) {
    return { grammar: Prism.languages.cpp || Prism.languages.clike, label: 'C++' };
  }
  return { grammar: Prism.languages.clike, label: 'Text' };
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  filePath,
  code,
  loading,
  openTabs = [],
  onSelectTab,
  onCloseTab,
  onToggleExplorer,
}) => {
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);

  // In-file search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const lines = useMemo(() => (code ? code.split('\n') : []), [code]);
  const pathSegments = useMemo(() => (filePath ? filePath.split('/') : []), [filePath]);

  const { highlightedLines, langLabel } = useMemo(() => {
    if (!filePath || !code) return { highlightedLines: [] as string[], langLabel: '' };
    const { grammar, label } = detectLanguage(filePath);
    try {
      const html = Prism.highlight(code, grammar, label.toLowerCase());
      return { highlightedLines: html.split('\n'), langLabel: label };
    } catch {
      return { highlightedLines: [], langLabel: label };
    }
  }, [filePath, code]);

  const matchedLineNumbers = useMemo(() => {
    const q = searchQuery.trim();
    if (!q || !code) return [];
    const needle = caseSensitive ? q : q.toLowerCase();
    const matches: number[] = [];
    lines.forEach((line, idx) => {
      const hay = caseSensitive ? line : line.toLowerCase();
      if (hay.includes(needle)) matches.push(idx + 1);
    });
    return matches;
  }, [searchQuery, caseSensitive, code, lines]);

  const matchedLineSet = useMemo(() => new Set(matchedLineNumbers), [matchedLineNumbers]);
  const activeMatchedLine = matchedLineNumbers[activeMatchIdx] ?? null;

  useEffect(() => {
    setActiveMatchIdx(0);
  }, [searchQuery, caseSensitive, filePath]);

  useEffect(() => {
    if (activeMatchedLine && lineRefs.current[activeMatchedLine]) {
      lineRefs.current[activeMatchedLine]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeMatchedLine]);

  const openSearch = () => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && searchOpen) {
      e.preventDefault();
      setSearchOpen(false);
    }
  };

  const stepMatch = (delta: number) => {
    if (matchedLineNumbers.length === 0) return;
    setActiveMatchIdx(
      (prev) => (prev + delta + matchedLineNumbers.length) % matchedLineNumbers.length
    );
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleDownload = () => {
    if (!code || !filePath) return;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filePath.split('/').pop() || 'file.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!filePath) {
    return (
      <div className="flex-1 flex flex-col bg-surface-canvas overflow-hidden min-w-0">
        {openTabs.length > 0 && onSelectTab && onCloseTab && (
          <EditorTabsBar
            openTabs={openTabs}
            activeFile={filePath}
            onSelectTab={onSelectTab}
            onCloseTab={onCloseTab}
          />
        )}
        {onToggleExplorer && (
          <div className="h-10 px-3 border-b border-line-subtle bg-surface-base flex items-center lg:hidden">
            <button
              type="button"
              onClick={onToggleExplorer}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-elevated border border-line text-xs text-ink-primary"
            >
              <PanelLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Files</span>
            </button>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<FileCode className="w-5 h-5" aria-hidden="true" />}
            title="No file open"
            description="Choose a file from the explorer to inspect its syntax-highlighted source code."
          />
        </div>
      </div>
    );
  }

  return (
    <div
      tabIndex={-1}
      onKeyDown={handleContainerKeyDown}
      className="flex-1 flex flex-col h-full bg-surface-inset overflow-hidden min-w-0 outline-none"
    >
      {/* Multi-file Editor Tabs */}
      {openTabs.length > 0 && onSelectTab && onCloseTab && (
        <EditorTabsBar
          openTabs={openTabs}
          activeFile={filePath}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
        />
      )}

      {/* Breadcrumbs & Action Toolbar */}
      <div className="h-9 px-3 border-b border-line-subtle bg-surface-base flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {onToggleExplorer && (
            <button
              type="button"
              onClick={onToggleExplorer}
              aria-label="Toggle file explorer"
              className="p-1 rounded-md text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle lg:hidden shrink-0"
            >
              <PanelLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}

          <nav aria-label="File path breadcrumb" className="flex items-center gap-1 min-w-0 text-xs font-mono">
            {pathSegments.map((segment, idx) => {
              const isLast = idx === pathSegments.length - 1;
              return (
                <React.Fragment key={`${segment}-${idx}`}>
                  {idx > 0 && (
                    <ChevronRight className="w-3 h-3 text-ink-muted shrink-0" aria-hidden="true" />
                  )}
                  <span
                    className={
                      isLast
                        ? 'font-medium text-ink-primary truncate'
                        : 'text-ink-muted truncate hidden sm:inline'
                    }
                  >
                    {segment}
                  </span>
                </React.Fragment>
              );
            })}
          </nav>

          {langLabel && (
            <span className="hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-subtle text-ink-secondary border border-line-subtle shrink-0 ml-1">
              {langLabel}
            </span>
          )}
          <span className="hidden xl:inline text-[11px] text-ink-muted font-mono tabular-nums shrink-0">
            {lines.length} lines
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => (searchOpen ? setSearchOpen(false) : openSearch())}
            aria-expanded={searchOpen}
            aria-label="Find in file (Ctrl+F)"
            title="Find in file (Ctrl+F)"
            className={`p-1.5 rounded-md border text-xs transition ${
              searchOpen
                ? 'bg-accent-subtle border-accent/40 text-accent-fg'
                : 'bg-surface-elevated border-line-subtle text-ink-muted hover:text-ink-primary'
            }`}
          >
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setWordWrap((prev) => !prev)}
            aria-pressed={wordWrap}
            aria-label="Toggle word wrap"
            title="Toggle word wrap"
            className={`p-1.5 rounded-md border text-xs transition ${
              wordWrap
                ? 'bg-accent-subtle border-accent/40 text-accent-fg'
                : 'bg-surface-elevated border-line-subtle text-ink-muted hover:text-ink-primary'
            }`}
          >
            <WrapText className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!code}
            aria-label={`Download ${filePath.split('/').pop()}`}
            title="Download file"
            className="p-1.5 rounded-md border border-line-subtle bg-surface-elevated hover:bg-surface-subtle text-ink-muted hover:text-ink-primary transition disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!code}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-elevated hover:bg-surface-subtle text-[11px] font-medium text-ink-secondary hover:text-ink-primary border border-line transition disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-700 dark:text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* In-File Search Bar */}
      {searchOpen && (
        <div
          role="search"
          aria-label="Find in current file"
          className="px-3 py-1.5 border-b border-line-subtle bg-surface-base flex flex-wrap items-center gap-2 shrink-0 animate-fade-in"
        >
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search
              className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  stepMatch(e.shiftKey ? -1 : 1);
                }
              }}
              placeholder="Find in file..."
              aria-label="Search text in file"
              className="w-full pl-8 pr-2.5 py-1 rounded-md bg-surface-inset border border-line text-xs font-mono text-ink-primary placeholder-ink-muted focus:border-accent-fg focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setCaseSensitive((prev) => !prev)}
            aria-pressed={caseSensitive}
            title="Match case"
            className={`px-1.5 py-1 rounded text-[11px] font-mono border transition ${
              caseSensitive
                ? 'bg-accent-subtle border-accent/40 text-accent-fg font-semibold'
                : 'bg-surface-inset border-line text-ink-muted hover:text-ink-primary'
            }`}
          >
            Aa
          </button>

          <span className="text-[11px] font-mono text-ink-muted tabular-nums min-w-[68px]">
            {searchQuery.trim()
              ? matchedLineNumbers.length > 0
                ? `${activeMatchIdx + 1} of ${matchedLineNumbers.length}`
                : 'No matches'
              : '0 matches'}
          </span>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => stepMatch(-1)}
              disabled={matchedLineNumbers.length === 0}
              aria-label="Previous match"
              className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-subtle disabled:opacity-40"
            >
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => stepMatch(1)}
              disabled={matchedLineNumbers.length === 0}
              aria-label="Next match"
              className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-subtle disabled:opacity-40"
            >
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search bar"
            className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-subtle ml-auto"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Code Lines */}
      {loading ? (
        <div className="flex-1 overflow-auto">
          <CodeSkeleton label={`Loading ${filePath}`} />
        </div>
      ) : (
        <div className="flex-1 overflow-auto text-xs font-mono select-text py-3">
          {lines.map((rawLine, idx) => {
            const lineNum = idx + 1;
            const isMatched = matchedLineSet.has(lineNum);
            const isActiveMatch = activeMatchedLine === lineNum;
            const htmlLine = highlightedLines[idx];

            return (
              <div
                key={lineNum}
                ref={(el) => {
                  lineRefs.current[lineNum] = el;
                }}
                className={`flex items-start leading-[21px] ${
                  isActiveMatch
                    ? 'bg-amber-100/90 dark:bg-amber-500/20'
                    : isMatched
                    ? 'bg-amber-50/80 dark:bg-amber-500/10'
                    : 'hover:bg-surface-subtle/50'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`select-none text-right pl-3 pr-3 border-r border-line-subtle tabular-nums shrink-0 w-12 ${
                    isActiveMatch ? 'text-amber-800 dark:text-amber-300 font-semibold' : 'text-ink-muted/70'
                  }`}
                >
                  {lineNum}
                </span>

                <span
                  className={`code-prism flex-1 px-4 ${
                    wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                  }`}
                >
                  {htmlLine !== undefined ? (
                    <span dangerouslySetInnerHTML={{ __html: htmlLine || ' ' }} />
                  ) : (
                    rawLine || ' '
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
