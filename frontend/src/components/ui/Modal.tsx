import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  maxWidthClass?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeLabel?: string;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  maxWidthClass = 'max-w-lg',
  children,
  footer,
  closeLabel = 'Close dialog',
}) => {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Move initial focus inside modal (prefer autofocus element or dialog container)
    const raf = requestAnimationFrame(() => {
      const container = dialogRef.current;
      if (!container) return;
      const autoFocused = container.querySelector<HTMLElement>('[data-autofocus]');
      if (autoFocused) {
        autoFocused.focus();
      } else {
        const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        (firstFocusable || container).focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`w-full ${maxWidthClass} bg-surface-elevated border border-line rounded-xl shadow-modal flex flex-col max-h-[88vh] animate-modal-in outline-none`}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-line-subtle">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-line flex items-center justify-center shrink-0 mt-0.5">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 id={titleId} className="text-sm font-semibold text-ink-primary tracking-tight">
                {title}
              </h2>
              {description && (
                <p id={descId} className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-subtle transition shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-line-subtle bg-surface-base/60 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
