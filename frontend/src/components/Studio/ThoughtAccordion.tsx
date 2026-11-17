import React, { useState } from 'react';
import { ChevronDown, Brain } from 'lucide-react';

interface ThoughtAccordionProps {
  content: string;
}

export const ThoughtAccordion: React.FC<ThoughtAccordionProps> = ({ content }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-1.5 rounded-lg border border-indigo-500/20 bg-indigo-950/20 text-xs overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2.5 py-1.5 flex items-center justify-between text-indigo-300 hover:text-indigo-200 transition font-medium"
      >
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-indigo-400" />
          <span>{content || 'Thinking...'}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="p-2.5 pt-1 text-[11px] text-slate-300 font-mono bg-black/20 border-t border-indigo-500/10 whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      )}
    </div>
  );
};
