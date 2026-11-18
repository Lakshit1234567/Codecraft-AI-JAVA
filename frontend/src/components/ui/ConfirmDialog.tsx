import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      maxWidthClass="max-w-md"
      icon={
        <AlertTriangle
          className={`w-4 h-4 ${
            destructive
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
          aria-hidden="true"
        />
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-md bg-surface-subtle hover:bg-line text-ink-primary text-xs font-medium border border-line transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            data-autofocus
            className={`px-3.5 py-1.5 rounded-md text-white text-xs font-medium transition disabled:opacity-50 ${
              destructive
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-accent hover:bg-accent-hover'
            }`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-xs text-ink-secondary leading-relaxed">{message}</p>
    </Modal>
  );
};
