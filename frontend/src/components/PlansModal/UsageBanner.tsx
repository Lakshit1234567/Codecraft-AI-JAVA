import React from 'react';
import { Activity } from 'lucide-react';
import { UsageToday } from '../../types';

interface UsageBannerProps {
  usage: UsageToday;
}

export const UsageBanner: React.FC<UsageBannerProps> = ({ usage }) => {
  const used = usage.tokensUsed || 0;
  const limit = usage.tokensLimit || 1;
  const percent = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="mb-5 p-3.5 rounded-lg bg-surface-base border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-accent-subtle border border-accent/30 flex items-center justify-center text-accent-fg shrink-0">
          <Activity className="w-4 h-4" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-ink-primary">Daily Token Quota</h3>
          <p className="text-[11px] text-ink-secondary font-mono tabular-nums mt-0.5">
            {used.toLocaleString()} / {limit.toLocaleString()} tokens used ({percent}%)
          </p>
        </div>
      </div>

      <div className="w-full sm:w-60 space-y-1.5">
        <div
          role="progressbar"
          aria-label="Daily token quota usage"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden"
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              percent >= 90 ? 'bg-rose-500' : 'bg-accent'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-ink-muted font-mono tabular-nums">
          <span>{usage.previewsRunning} active previews</span>
          <span>Max {usage.previewsLimit}</span>
        </div>
      </div>
    </div>
  );
};
