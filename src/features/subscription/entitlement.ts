import type { Company, PlanId } from '@/types';

/**
 * Company-level entitlement resolution.
 *
 * Resolution order (highest wins):
 *   1. legacy Business  (company.is_legacy)         → Business, süresiz
 *   2. active paid Business                          → Business
 *   3. active Pro                                    → Pro
 *   4. otherwise                                     → Free
 *
 * NOTE: This module only *reports* the plan and its limits. Hard enforcement
 * (blocking contract creation / showing a paywall) is a separate, later step
 * that must grandfather existing companies first.
 */

export interface PlanLimits {
  /** Maximum number of contracts. `null` = unlimited. */
  maxContracts: number | null;
  /** Whether the plan allows staff / team members. */
  team: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { maxContracts: 3, team: false },
  pro: { maxContracts: null, team: false },
  business: { maxContracts: null, team: true },
};

export const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
};

export type EntitlementSource = 'legacy' | 'subscription' | 'free';

export interface Entitlement {
  /** Effective plan the company is entitled to. */
  plan: PlanId;
  /** Where the entitlement came from. */
  source: EntitlementSource;
  /** True for grandfathered/legacy companies (never see a paywall). */
  isLegacy: boolean;
  limits: PlanLimits;
}

/** Subscription statuses that grant access to a paid plan. */
const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export function resolveEntitlement(company: Company | null | undefined): Entitlement {
  // Default to Free when the company is not loaded yet.
  if (!company) {
    return { plan: 'free', source: 'free', isLegacy: false, limits: PLAN_LIMITS.free };
  }

  // 1) Legacy always wins — permanent Business, no expiry, no paywall.
  if (company.isLegacy) {
    return { plan: 'business', source: 'legacy', isLegacy: true, limits: PLAN_LIMITS.business };
  }

  // 2) / 3) Active paid subscription.
  const active =
    ACTIVE_STATUSES.has(company.subscriptionStatus) &&
    (company.plan === 'business' || company.plan === 'pro');
  if (active) {
    return {
      plan: company.plan,
      source: 'subscription',
      isLegacy: false,
      limits: PLAN_LIMITS[company.plan],
    };
  }

  // 4) Free.
  return { plan: 'free', source: 'free', isLegacy: false, limits: PLAN_LIMITS.free };
}
