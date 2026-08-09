import type { PlanId } from '@/types';

/**
 * Plan catalog — the single source of truth for pricing and marketing copy
 * shown on the paywall. Billing is yearly-only for now.
 *
 * Fiyat değişikliği gerekiyorsa YALNIZCA bu dosyayı düzenle. (RevenueCat
 * entegrasyonunda store ürün fiyatları da buraya eşlenecek.)
 */

export type BillingPeriod = 'yearly';

export interface PlanPrice {
  /** Yearly total charged, in TRY. */
  yearly: number;
  /** Monthly-equivalent for display ("/ay eşdeğeri"), in TRY. */
  monthlyEquivalent: number;
  period: BillingPeriod;
}

export interface PlanInfo {
  id: PlanId;
  name: string;
  tagline: string;
  features: string[];
  /** Null for Free (no price). */
  price: PlanPrice | null;
  /** Highlight this plan on the paywall. */
  recommended?: boolean;
}

export const PLANS: Record<PlanId, PlanInfo> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Başlamak için ücretsiz',
    features: ['En fazla 3 sözleşme', 'Tek kullanıcı', 'Temel hatırlatmalar'],
    price: null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Sınırsız sözleşme, tek kullanıcı',
    features: [
      'Sınırsız sözleşme',
      'Tek kullanıcı',
      'Tüm hatırlatmalar',
      'İstatistikler ve raporlar',
    ],
    price: { yearly: 1788, monthlyEquivalent: 149, period: 'yearly' },
  },
  business: {
    id: 'business',
    name: 'Business',
    tagline: 'Ekip ile sınırsız kullanım',
    features: [
      'Sınırsız sözleşme',
      'Personel / ekip yönetimi (sınırsız personel)',
      'Excel senkronizasyonu',
      'Öncelikli destek',
    ],
    price: { yearly: 9588, monthlyEquivalent: 799, period: 'yearly' },
    recommended: true,
  },
};

/** Paywall'da gösterilecek ücretli planlar (yükseltme hedefleri). */
export const UPGRADE_PLANS: PlanInfo[] = [PLANS.pro, PLANS.business];
