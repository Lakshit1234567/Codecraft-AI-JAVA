import React, { useId, useState } from 'react';
import { ChevronRight, Cpu } from 'lucide-react';

interface ThoughtAccordionProps {
  content: string;
}

export const ThoughtAccordion: React.FC<ThoughtAccordionProps> = ({ content }) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  const trimmed = (content || '').trim();
  const firstLine = trimmed.split('\n')[0] || 'Reasoning step';
  const preview = firstLine.length > 72 ? `${firstLine.slice(0, 72)}...` : firstLine;

  return (
    <div className="my-1.5 rounded-md border border-line bg-surface-inset/70 text-xs overflow-hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 text-ink-secondary hover:text-ink-primary transition text-left"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ChevronRight
            className={`w-3.5 h-3.5 text-ink-muted shrink-0 transition-transform ${
              isOpen ? 'rotate-90' : ''
            }`}
            aria-hidden="true"
          />
          <Cpu className="w-3.5 h-3.5 text-accent-fg shrink-0" aria-hidden="true" />
          <span className="truncate font-medium text-[11px]">{preview}</span>
        </div>
        <span className="text-[10px] font-mono text-ink-muted shrink-0">
          {isOpen ? 'Hide' : 'Trace'}
        </span>
      </button>

      {isOpen && (
        <div
          id={panelId}
          className="px-3 py-2 text-[11px] text-ink-secondary font-mono bg-surface-inset border-t border-line-subtle whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto"
        >
          {trimmed || 'No reasoning details recorded.'}
        </div>
      )}
    </div>
  );
};
