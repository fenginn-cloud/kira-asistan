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
  /** Maximum number of users (incl. admin). `null` = unlimited. */
  maxUsers: number | null;
  /** Whether the plan includes the AI assistant. */
  ai: boolean;
  /** Gelişmiş AI (Business): derin analiz, öneri aksiyonları, sınırsız kullanım. */
  aiAdvanced: boolean;
  /** Günlük AI soru limiti. `null` = sınırsız, `0` = kapalı. */
  aiDailyLimit: number | null;
  /** Advance reminders (7/3/1 gün önce). Free only gets due-day + overdue. */
  advanceReminders: boolean;
  /** Excel'den sözleşme aktarımı. */
  excel: boolean;
  /** İstatistikler + Finansal Özet ekranı (Pro/Business). */
  stats: boolean;
  /** Kiracı ödeme portalı / bildirim linki. */
  tenantPortal: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxContracts: 3,
    team: false,
    maxUsers: 1,
    ai: false,
    aiAdvanced: false,
    aiDailyLimit: 0,
    advanceReminders: false,
    excel: false,
    stats: false,
    tenantPortal: false,
  },
  pro: {
    maxContracts: 30,
    team: false,
    maxUsers: 1,
    ai: true,
    aiAdvanced: false,
    aiDailyLimit: 15,
    advanceReminders: true,
    excel: true,
    stats: true,
    tenantPortal: true,
  },
  business: {
    maxContracts: null,
    team: true,
    maxUsers: 5,
    ai: true,
    aiAdvanced: true,
    aiDailyLimit: null,
    advanceReminders: true,
    excel: true,
    stats: true,
    tenantPortal: true,
  },
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
  //    Legacy keeps unlimited users (grandfathered) so existing staff never
  //    break, even though the paid Business tier includes 5.
  if (company.isLegacy) {
    return {
      plan: 'business',
      source: 'legacy',
      isLegacy: true,
      limits: { ...PLAN_LIMITS.business, maxUsers: null },
    };
  }

  // 2) / 3) Active paid subscription.
  //
  // Bir plan iki durumda "erişilebilir" sayılır:
  //   a) subscription_status active/trialing, VEYA
  //   b) İPTAL EDİLMİŞ AMA DÖNEM SONU GELMEMİŞ / ödeme sorunu (grace):
  //      current_period_end gelecekteyse erişim sürer. Böylece kullanıcı
  //      yenilemeyi iptal etse bile dönem sonuna kadar Pro/Business kalır.
  //      EXPIRATION (webhook) plan'ı 'free'ye çektiğinde erişim kapanır.
  const paid = company.plan === 'business' || company.plan === 'pro';
  const activeByStatus = ACTIVE_STATUSES.has(company.subscriptionStatus);
  const periodEndMs = company.currentPeriodEnd
    ? new Date(company.currentPeriodEnd).getTime()
    : null;
  const withinPaidPeriod =
    periodEndMs != null &&
    Number.isFinite(periodEndMs) &&
    periodEndMs > Date.now() &&
    // 'none' = hiç abone olunmamış; süreye rağmen hak verme.
    company.subscriptionStatus !== 'none';

  if (paid && (activeByStatus || withinPaidPeriod)) {
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

/**
 * Merkezî özellik erişim yardımcıları. Uygulamanın her yerinde dağınık
 * `if (plan === 'pro')` yerine bunları kullanın. Kaynak yine PLAN_LIMITS'tir.
 */
export interface FeatureAccess {
  canUseExcel: boolean;
  canUseAdvancedReports: boolean;
  canUseTeamManagement: boolean;
  canUseAdvancedNotifications: boolean;
  /** AI destekli öneriler (Pro+). */
  canUseAi: boolean;
  /** Gelişmiş AI destekli analizler (Business). */
  canUseAdvancedAi: boolean;
  maxContracts: number | null;
  maxUsers: number | null;
}

export function featureAccess(entitlement: Entitlement): FeatureAccess {
  const l = entitlement.limits;
  return {
    canUseExcel: l.excel,
    canUseAdvancedReports: l.stats,
    canUseTeamManagement: l.team,
    canUseAdvancedNotifications: l.advanceReminders,
    canUseAi: l.ai,
    canUseAdvancedAi: l.aiAdvanced,
    maxContracts: l.maxContracts,
    maxUsers: l.maxUsers,
  };
}
