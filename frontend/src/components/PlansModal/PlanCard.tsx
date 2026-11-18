import React from 'react';
import { Check, Zap } from 'lucide-react';
import { Plan } from '../../types';

interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
  isLoading: boolean;
  onUpgrade: (planId: number) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrent,
  isLoading,
  onUpgrade,
}) => {
  const lowerName = plan.name.toLowerCase();
  const isPro = lowerName.includes('pro');
  const isEnterprise = lowerName.includes('enterprise');
  const isFree = lowerName.includes('free') || plan.price === 'Free';

  const displayPrice = plan.price || (isPro ? '$29' : isEnterprise ? '$99' : 'Free');
  const showPerMonth = !isFree && !displayPrice.includes('/');

  const summary = isEnterprise
    ? 'Maximum throughput for teams running continuous fuzzing and web adversarial audits.'
    : isPro
    ? 'Expanded daily token limits and differential DSA fuzzing for active builders.'
    : 'Essential tools for prototyping React interfaces and local evaluation.';

  return (
    <article
      className={`rounded-lg p-5 flex flex-col justify-between border shadow-card transition ${
        isPro
          ? 'bg-surface-base border-accent ring-1 ring-accent/15'
          : 'bg-surface-base border-line hover:border-line-strong'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm text-ink-primary">{plan.name}</h3>
          {isPro && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-subtle text-accent-fg border border-accent/30">
              Recommended
            </span>
          )}
          {isEnterprise && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-subtle text-ink-secondary border border-line">
              Full Suite
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1 my-3">
          <span className="text-2xl font-bold text-ink-primary tracking-tight tabular-nums">
            {displayPrice}
          </span>
          {showPerMonth && <span className="text-xs text-ink-muted">/month</span>}
        </div>

        <p className="text-xs text-ink-secondary mb-4 leading-relaxed">{summary}</p>

        <ul className="space-y-2 text-xs text-ink-secondary border-t border-line-subtle pt-4 mb-5">
          <li className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Up to <strong className="text-ink-primary font-medium">{plan.maxProjects}</strong> active projects
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong className="text-ink-primary font-medium tabular-nums">
                {plan.unlimitedAi ? 'Unlimited' : plan.maxTokensPerDay.toLocaleString()}
              </strong>{' '}
              tokens / day
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Up to <strong className="text-ink-primary font-medium">{plan.maxPreviews || 2}</strong> concurrent previews
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{plan.unlimitedAi ? 'Priority LLM bandwidth' : 'Standard AI generation'}</span>
          </li>
          {(isPro || isEnterprise) && (
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-accent-fg shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-ink-primary">DSA Differential Fuzzer &amp; Stress Suite</span>
            </li>
          )}
          {isEnterprise && (
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-ink-primary">Web Adversary Vulnerability Suite</span>
            </li>
          )}
        </ul>
      </div>

      <div>
        {isCurrent ? (
          <div className="w-full py-2 rounded-md bg-surface-subtle text-ink-secondary text-xs font-medium text-center border border-line flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Current Plan</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onUpgrade(plan.id)}
            disabled={isLoading}
            className={`w-full py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-50 ${
              isPro
                ? 'bg-accent hover:bg-accent-hover text-white'
                : 'bg-surface-subtle hover:bg-line text-ink-primary border border-line'
            }`}
          >
            {isLoading ? (
              <span
                className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Upgrade to {plan.name}</span>
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
};
