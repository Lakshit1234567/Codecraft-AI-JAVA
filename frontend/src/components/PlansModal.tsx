import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Crown, 
  ExternalLink, 
  CreditCard,
  Layers,
  Cpu,
  Flame,
  Activity
} from 'lucide-react';
import { Plan, Subscription, UsageToday } from '../types';
import { fetchPlans, fetchMySubscription, createCheckoutSession, openCustomerPortal, fetchTodayUsage } from '../api/client';

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

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
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
      }
      if (subData.status === 'fulfilled') {
        setSubscription(subData.value);
      }
      if (usageData.status === 'fulfilled') {
        setUsage(usageData.value);
      }
    } catch (err: any) {
      setError('Failed to load plans data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (planId: number) => {
    setCheckoutLoading(planId);
    setError(null);
    try {
      const { checkoutUrl } = await createCheckoutSession(planId);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Checkout failed. Please ensure Stripe API is configured.');
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
      setError(err.response?.data?.message || err.message || 'Failed to open customer portal');
    } finally {
      setPortalLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentPlanId = subscription?.plan?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                <span>Subscription Plans</span>
              </div>
              {subscription?.status && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  {subscription.status}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Unlock Supercharged AI Engineering
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Scale your full-stack generation, trigger deep adversarial fuzzing, and stress-test competitive programming solutions with no boundaries.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live Usage Bar */}
        {usage && (
          <div className="mt-5 p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Daily Token Quota</h4>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {usage.tokensUsed?.toLocaleString()} / {usage.tokensLimit?.toLocaleString()} tokens used today
                </div>
              </div>
            </div>

            <div className="w-full sm:w-64 flex flex-col gap-1.5">
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((usage.tokensUsed || 0) / (usage.tokensLimit || 1)) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>{usage.previewsRunning} active previews</span>
                <span>Max {usage.previewsLimit} concurrent</span>
              </div>
            </div>
          </div>
        )}

        {/* Plan Cards Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-3 py-16 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span>Fetching available plans from Stripe & Database...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-slate-500 text-xs">
              No active plans configured. Please check database seeds.
            </div>
          ) : (
            plans.map((plan) => {
              const isCurrent = currentPlanId === plan.id || (!currentPlanId && plan.name.toLowerCase().includes('free'));
              const isPro = plan.name.toLowerCase().includes('pro');
              const isEnterprise = plan.name.toLowerCase().includes('enterprise');

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all relative ${
                    isPro
                      ? 'bg-gradient-to-b from-indigo-950/60 via-slate-900 to-[#0e1629] border-2 border-indigo-500/80 shadow-xl shadow-indigo-500/10'
                      : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-300" />
                      <span>Most Popular</span>
                    </div>
                  )}

                  <div>
                    {/* Title & Price */}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-base text-white">{plan.name}</h3>
                      {isEnterprise && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          Full Power
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 my-3">
                      <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        {plan.price || (isPro ? '$29/mo' : isEnterprise ? '$99/mo' : 'Free')}
                      </span>
                      {plan.price !== 'Free' && !plan.name.toLowerCase().includes('free') && (
                        <span className="text-xs text-slate-400">/month</span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                      {isEnterprise
                        ? 'Unlimited adversarial testing, maximal LLM throughput, and high-frequency stress loops.'
                        : isPro
                        ? 'For power engineers shipping production apps with expanded daily token bounds.'
                        : 'Essential toolkit for experimenting with AI generation and local testing.'}
                    </p>

                    {/* Features List */}
                    <ul className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-4 mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Up to <strong className="text-white">{plan.maxProjects}</strong> active projects</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>
                          <strong className="text-white">
                            {plan.unlimitedAi ? 'Unlimited' : plan.maxTokensPerDay.toLocaleString()}
                          </strong> tokens / day
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Max <strong className="text-white">{plan.maxPreviews || 2}</strong> concurrent previews</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{plan.unlimitedAi ? 'Full LLM priority bandwidth' : 'Standard AI generation'}</span>
                      </li>
                      {isPro || isEnterprise ? (
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          <span className="text-indigo-200">DSA Differential Fuzzer & Stress Suite</span>
                        </li>
                      ) : null}
                      {isEnterprise && (
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          <span className="text-purple-200">Web Adversary "Break My App" Suite</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <div>
                    {isCurrent ? (
                      <div className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold text-center border border-slate-700 flex items-center justify-center gap-1.5 cursor-default">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Current Active Plan</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCheckout(plan.id)}
                        disabled={checkoutLoading === plan.id}
                        className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                          isPro
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                        }`}
                      >
                        {checkoutLoading === plan.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>Upgrade to {plan.name}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Management */}
        <div className="mt-8 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure 256-bit Stripe Checkout & Automatic Token Renewal</span>
          </div>

          <button
            onClick={handleOpenPortal}
            disabled={portalLoading}
            className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{portalLoading ? 'Opening...' : 'Manage Invoices & Billing Portal'}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
