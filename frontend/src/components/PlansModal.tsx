import React, { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  ShieldCheck,
  ExternalLink,
  CreditCard,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Plan, Subscription, UsageToday } from '../types';
import {
  fetchPlans,
  fetchMySubscription,
  createCheckoutSession,
  openCustomerPortal,
  fetchTodayUsage,
} from '../api/client';
import { Modal } from './ui/Modal';
import { Skeleton } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';
import { PlanCard } from './PlansModal/PlanCard';
import { UsageBanner } from './PlansModal/UsageBanner';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlansModal: React.FC<PlansModalProps> = ({ isOpen, onClose }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansData, subData, usageData] = await Promise.allSettled([
        fetchPlans(),
        fetchMySubscription(),
        fetchTodayUsage(),
      ]);

      if (plansData.status === 'fulfilled') {
        setPlans(plansData.value);
      } else {
        setError('Unable to fetch subscription plans from the server.');
      }
      if (subData.status === 'fulfilled') setSubscription(subData.value);
      if (usageData.status === 'fulfilled') setUsage(usageData.value);
    } catch {
      setError('Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleCheckout = async (planId: number) => {
    setCheckoutLoading(planId);
    setError(null);
    try {
      const { checkoutUrl } = await createCheckoutSession(planId);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Checkout failed. Verify Stripe configuration on the backend.'
      );
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const { portalUrl } = await openCustomerPortal();
      if (portalUrl) {
        window.location.href = portalUrl;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to open billing portal.');
    } finally {
      setPortalLoading(false);
    }
  };

  const currentPlanId = subscription?.plan?.id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      title="Plans & Billing"
      description="Manage token quotas, concurrent previews, and adversarial testing tiers."
      icon={<Crown className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />}
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-secondary">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <span>Encrypted Stripe checkout with automated quota sync</span>
            {subscription?.status && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                {subscription.status}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenPortal}
            disabled={portalLoading}
            className="inline-flex items-center gap-1.5 text-accent-fg hover:underline disabled:opacity-50"
          >
            <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{portalLoading ? 'Opening portal...' : 'Manage Invoices & Billing'}</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-md bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-200 hover:underline shrink-0"
          >
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {usage && <UsageBanner usage={usage} />}

      {loading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          role="status"
          aria-busy="true"
          aria-label="Loading subscription plans"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="p-5 rounded-lg bg-surface-base border border-line-subtle space-y-3"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-10 w-full" />
              <div className="space-y-2 pt-3 border-t border-line-subtle">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
              <Skeleton className="h-8 w-full mt-4" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          compact
          icon={<Crown className="w-5 h-5" aria-hidden="true" />}
          title="No active plans available"
          description="Subscription tiers have not been seeded in the backend database yet."
          action={
            <button
              type="button"
              onClick={loadData}
              className="px-3.5 py-1.5 rounded-md bg-surface-subtle hover:bg-line border border-line text-xs font-medium text-ink-primary transition"
            >
              Reload Plans
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent =
              currentPlanId === plan.id ||
              (!currentPlanId && plan.name.toLowerCase().includes('free'));
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={isCurrent}
                isLoading={checkoutLoading === plan.id}
                onUpgrade={handleCheckout}
              />
            );
          })}
        </div>
      )}
    </Modal>
  );
};
