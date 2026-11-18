import React, { useMemo, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface CodeEditorTextareaProps {
  id: string;
  value: string;
  onChange: (nextValue: string) => void;
  languageLabel: string;
}

const TAB_SPACES = '    ';
const MIN_FONT_SIZE = 11;
const MAX_FONT_SIZE = 16;

export const CodeEditorTextarea: React.FC<CodeEditorTextareaProps> = ({
  id,
  value,
  onChange,
  languageLabel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(12);
  const [tabIndentEnabled, setTabIndentEnabled] = useState(true);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const lineCount = useMemo(() => Math.max(1, value.split('\n').length), [value]);

  const updateCursorPosition = (el: HTMLTextAreaElement) => {
    const pos = el.selectionStart || 0;
    const before = el.value.slice(0, pos);
    const lines = before.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;

    // WCAG 2.1.2 No Keyboard Trap: Escape immediately toggles out of Tab-capture mode
    if (e.key === 'Escape' && tabIndentEnabled) {
      setTabIndentEnabled(false);
      return;
    }

    if (e.key === 'Tab' && tabIndentEnabled) {
      e.preventDefault();
      const start = el.selectionStart;
      const end = el.selectionEnd;

      if (e.shiftKey) {
        // Outdent selected line(s)
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const selectedBlock = value.slice(lineStart, end);
        const lines = selectedBlock.split('\n');
        let removedFromFirst = 0;
        let totalRemoved = 0;

        const outdented = lines
          .map((line, index) => {
            const match = line.match(/^( {1,4}|\t)/);
            if (!match) return line;
            const len = match[0].length;
            if (index === 0) removedFromFirst = len;
            totalRemoved += len;
            return line.slice(len);
          })
          .join('\n');

        const nextVal = value.slice(0, lineStart) + outdented + value.slice(end);
        onChange(nextVal);

        requestAnimationFrame(() => {
          if (!textareaRef.current) return;
          const nextStart = Math.max(lineStart, start - removedFromFirst);
          const nextEnd = Math.max(nextStart, end - totalRemoved);
          textareaRef.current.setSelectionRange(nextStart, nextEnd);
          updateCursorPosition(textareaRef.current);
        });
        return;
      }

      if (start === end) {
        const nextVal = value.slice(0, start) + TAB_SPACES + value.slice(end);
        onChange(nextVal);
        requestAnimationFrame(() => {
          if (!textareaRef.current) return;
          const caret = start + TAB_SPACES.length;
          textareaRef.current.setSelectionRange(caret, caret);
          updateCursorPosition(textareaRef.current);
        });
      } else {
        // Multi-line indent
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const block = value.slice(lineStart, end);
        const lines = block.split('\n');
        const indented = lines.map((l) => TAB_SPACES + l).join('\n');
        const nextVal = value.slice(0, lineStart) + indented + value.slice(end);
        onChange(nextVal);

        requestAnimationFrame(() => {
          if (!textareaRef.current) return;
          textareaRef.current.setSelectionRange(
            start + TAB_SPACES.length,
            end + TAB_SPACES.length * lines.length
          );
          updateCursorPosition(textareaRef.current);
        });
      }
      return;
    }

    // Smart auto-indent on Enter
    if (e.key === 'Enter') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.slice(lineStart, start);
      const baseIndent = currentLine.match(/^\s*/)?.[0] || '';
      const extraIndent = /[{:(]\s*$/.test(currentLine) ? TAB_SPACES : '';
      const insertion = `\n${baseIndent}${extraIndent}`;

      e.preventDefault();
      const nextVal = value.slice(0, start) + insertion + value.slice(end);
      onChange(nextVal);

      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        const caret = start + insertion.length;
        textareaRef.current.setSelectionRange(caret, caret);
        updateCursorPosition(textareaRef.current);
      });
    }
  };

  const lineHeightPx = Math.round(fontSize * 1.65);

  return (
    <div className="flex-1 flex flex-col rounded-md border border-line-subtle bg-surface-inset overflow-hidden min-h-0">
      {/* Editor Body with Synced Gutter */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        <div
          ref={gutterRef}
          aria-hidden="true"
          style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeightPx}px` }}
          className="select-none overflow-hidden py-3 pl-2.5 pr-2.5 text-right font-mono tabular-nums text-ink-muted/70 bg-surface-base/70 border-r border-line-subtle shrink-0 min-w-[44px]"
        >
          {Array.from({ length: lineCount }).map((_, idx) => {
            const lineNum = idx + 1;
            const isActiveLine = lineNum === cursorPos.line;
            return (
              <div
                key={lineNum}
                className={isActiveLine ? 'text-accent-fg font-semibold' : undefined}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            updateCursorPosition(e.target);
          }}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onClick={(e) => updateCursorPosition(e.currentTarget)}
          onKeyUp={(e) => updateCursorPosition(e.currentTarget)}
          spellCheck={false}
          wrap="off"
          style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeightPx}px` }}
          className="flex-1 py-3 px-3.5 bg-transparent font-mono text-ink-primary focus:outline-none resize-none overflow-auto whitespace-pre"
        />
      </div>

      {/* Slim Editor Footer Controls */}
      <div className="h-8 px-3 border-t border-line-subtle bg-surface-base flex items-center justify-between gap-2 text-[11px] font-mono text-ink-muted shrink-0">
        <div className="flex items-center gap-3 tabular-nums">
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <span className="hidden sm:inline">{languageLabel}</span>
          <button
            type="button"
            onClick={() => setTabIndentEnabled((prev) => !prev)}
            title="Toggle whether Tab indents code or moves keyboard focus (Esc also exits Tab-indent)"
            className={`px-1.5 py-0.5 rounded border text-[10px] transition ${
              tabIndentEnabled
                ? 'bg-accent-subtle border-accent/25 text-accent-fg'
                : 'bg-surface-subtle border-line text-ink-muted'
            }`}
          >
            {tabIndentEnabled ? 'Tab: 4 spaces (Esc to focus)' : 'Tab: Focus navigation'}
          </button>
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Editor font size">
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.max(MIN_FONT_SIZE, s - 1))}
            disabled={fontSize <= MIN_FONT_SIZE}
            aria-label="Decrease editor font size"
            className="p-1 rounded hover:bg-surface-subtle hover:text-ink-primary disabled:opacity-40 transition"
          >
            <Minus className="w-3 h-3" aria-hidden="true" />
          </button>
          <span className="tabular-nums w-8 text-center text-[10px]">{fontSize}px</span>
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.min(MAX_FONT_SIZE, s + 1))}
            disabled={fontSize >= MAX_FONT_SIZE}
            aria-label="Increase editor font size"
            className="p-1 rounded hover:bg-surface-subtle hover:text-ink-primary disabled:opacity-40 transition"
          >
            <Plus className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
