import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact = false,
}) => {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-8 px-4' : 'py-14 px-6'
      }`}
    >
      <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-line flex items-center justify-center text-ink-secondary mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
      <p className="text-xs text-ink-secondary max-w-sm mt-1 leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
