import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full' }) => (
  <div
    aria-hidden="true"
    className={`rounded-md bg-surface-subtle animate-pulse ${className}`}
  />
);

export const ListSkeleton: React.FC<{ rows?: number; label?: string }> = ({
  rows = 3,
  label = 'Loading content',
}) => (
  <div className="space-y-2.5" role="status" aria-busy="true" aria-label={label}>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="p-3 rounded-lg bg-surface-base border border-line-subtle flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="w-8 h-8 rounded-md shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-5 w-14 rounded-full shrink-0" />
      </div>
    ))}
  </div>
);

export const CodeSkeleton: React.FC<{ label?: string }> = ({ label = 'Loading file' }) => (
  <div className="p-4 space-y-2.5" role="status" aria-busy="true" aria-label={label}>
    <Skeleton className="h-3.5 w-2/5" />
    <Skeleton className="h-3.5 w-3/4" />
    <Skeleton className="h-3.5 w-1/2" />
    <Skeleton className="h-3.5 w-5/6" />
    <Skeleton className="h-3.5 w-2/3" />
    <Skeleton className="h-3.5 w-3/5" />
    <Skeleton className="h-3.5 w-4/5" />
  </div>
);
