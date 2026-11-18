import React, { useMemo, useState } from 'react';
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
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

type Block =
  | { type: 'code'; lang: string; code: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'hr' }
  | { type: 'paragraph'; text: string };

function resolveGrammar(lang: string): Prism.Grammar | null {
  const normalized = lang.trim().toLowerCase();
  const map: Record<string, Prism.Grammar | undefined> = {
    tsx: Prism.languages.tsx,
    ts: Prism.languages.typescript,
    typescript: Prism.languages.typescript,
    jsx: Prism.languages.jsx,
    js: Prism.languages.javascript,
    javascript: Prism.languages.javascript,
    css: Prism.languages.css,
    json: Prism.languages.json,
    html: Prism.languages.markup,
    xml: Prism.languages.markup,
    svg: Prism.languages.markup,
    java: Prism.languages.java,
    py: Prism.languages.python,
    python: Prism.languages.python,
    cpp: Prism.languages.cpp,
    'c++': Prism.languages.cpp,
    c: Prism.languages.c,
  };
  return map[normalized] || Prism.languages.clike || null;
}

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fenceMatch = line.match(/^```([a-zA-Z0-9_+-]*)\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing fence
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') });
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, '').trim());
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, '').trim());
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Paragraph (collect consecutive non-special lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^```/) &&
      !lines[i].match(/^#{1,3}\s+/) &&
      !lines[i].match(/^\s*[-*]\s+/) &&
      !lines[i].match(/^\s*\d+\.\s+/) &&
      !lines[i].match(/^---+$/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join('\n') });
  }

  return blocks;
}

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token.length}`;
    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-surface-subtle border border-line-subtle font-mono text-[11px] text-accent-fg"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={key} className="font-semibold text-ink-primary">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

const CodeBlockCard: React.FC<{ lang: string; code: string }> = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => {
    const grammar = resolveGrammar(lang);
    if (!grammar) return null;
    try {
      return Prism.highlight(code, grammar, lang.toLowerCase());
    } catch {
      return null;
    }
  }, [code, lang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="my-2 rounded-md border border-line bg-surface-inset overflow-hidden">
      <div className="h-7 px-2.5 border-b border-line-subtle bg-surface-base flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
          {lang || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code block"
          className="inline-flex items-center gap-1 text-[10px] font-medium text-ink-secondary hover:text-ink-primary transition"
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
      <pre className="code-prism p-2.5 m-0 text-[11px] leading-relaxed overflow-x-auto">
        {highlighted ? (
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const blocks = useMemo(() => parseBlocks(content || ''), [content]);

  return (
    <div className={`space-y-2 text-xs text-ink-primary leading-relaxed break-words ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlockCard key={idx} lang={block.lang} code={block.code} />;
        }
        if (block.type === 'hr') {
          return <hr key={idx} className="border-line-subtle my-2" />;
        }
        if (block.type === 'heading') {
          const sizeClass =
            block.level === 1
              ? 'text-sm font-bold'
              : block.level === 2
              ? 'text-xs font-bold'
              : 'text-xs font-semibold';
          return (
            <div key={idx} className={`${sizeClass} text-ink-primary pt-1`}>
              {renderInline(block.text)}
            </div>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={idx} className="list-disc pl-4 space-y-1 text-ink-primary">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={idx} className="list-decimal pl-4 space-y-1 text-ink-primary">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-wrap m-0">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
};
