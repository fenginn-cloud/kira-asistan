import type { PlanId } from '@/types';

/**
 * Plan catalog — the single source of truth for pricing and marketing copy
 * shown on the paywall. Billing is yearly-only for now.
 *
 * Fiyat/metin değişikliği gerekiyorsa YALNIZCA bu dosyayı düzenle.
 * (RevenueCat entegrasyonunda store ürün fiyatları da buraya eşlenecek.)
 *
 * NOT: Kartlardaki bazı özelliklerin backend'i henüz hazır değildir
 * (bkz. görev raporu: 5 kullanıcı limiti, işlem geçmişi/audit, AI kotası,
 * katmanlı "gelişmiş" AI/Excel). Satın alma bu ekranda kapalıdır ("yakında").
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
  /** "Kendim yönetiyorum" gibi ürün ayrımını anlatan kısa başlık. */
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
    tagline: 'Uygulamayı ücretsiz kullanıyorum',
    features: [
      'En fazla 3 aktif sözleşme',
      'Tek kullanıcı',
      'Kira ve tahsilat takibi',
      'Ödeme geçmişi',
      'Cari hesap / devreden bakiye',
      'Geciken kira takibi',
      'Temel istatistikler',
      'Temel hatırlatmalar',
    ],
    price: null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Portföyümü kendim yönetiyorum',
    features: [
      '99 aktif sözleşmeye kadar',
      'Tek kullanıcı',
      'Tüm hatırlatmalar (7/3/1 gün önce dahil)',
      'Cari hesap ve tahsilat takibi',
      "Excel'den sözleşme aktarımı",
      'İstatistik ve raporlar',
      'Kiracı ödeme bildirimleri',
      'AI Asistan',
    ],
    price: { yearly: 1799, monthlyEquivalent: 150, period: 'yearly' },
  },
  business: {
    id: 'business',
    name: 'Business',
    tagline: 'Portföyümü ekibimle yönetiyorum',
    features: [
      "Pro'daki tüm özellikler",
      'Sınırsız sözleşme',
      '5 kullanıcı dahil',
      'Ekip ve personel yönetimi',
      'Kullanıcı bazlı yetkilendirme',
      'Ekip tahsilat takibi',
      'Öncelikli destek',
    ],
    price: { yearly: 9599, monthlyEquivalent: 800, period: 'yearly' },
    recommended: true,
  },
};

/** Paywall'da gösterilecek ücretli planlar (yükseltme hedefleri). */
export const UPGRADE_PLANS: PlanInfo[] = [PLANS.pro, PLANS.business];

/** Karşılaştırma tablosu satırı. Değer: true=var, false=yok, string=metin. */
export interface FeatureRow {
  label: string;
  free: boolean | string;
  pro: boolean | string;
  business: boolean | string;
}

/** "Tüm özellikleri gör" karşılaştırma matrisi (Free / Pro / Business). */
export const FEATURE_MATRIX: FeatureRow[] = [
  { label: 'Aktif sözleşme', free: '3', pro: '99', business: 'Sınırsız' },
  { label: 'Kullanıcı', free: '1', pro: '1', business: '5' },
  { label: 'Kira ve tahsilat takibi', free: true, pro: true, business: true },
  { label: 'Cari hesap / devreden bakiye', free: true, pro: true, business: true },
  { label: 'Geciken kira takibi', free: true, pro: true, business: true },
  { label: 'İstatistik ve raporlar', free: true, pro: true, business: true },
  { label: 'Hatırlatmalar', free: 'Temel', pro: 'Tümü', business: 'Tümü' },
  { label: "Excel'den sözleşme aktarımı", free: false, pro: true, business: true },
  { label: 'Kiracı ödeme bildirimleri', free: false, pro: true, business: true },
  { label: 'AI Asistan', free: false, pro: true, business: true },
  { label: 'Ekip / personel yönetimi', free: false, pro: false, business: true },
  { label: 'Kullanıcı bazlı yetkilendirme', free: false, pro: false, business: true },
  { label: 'Ekip tahsilat takibi', free: false, pro: false, business: true },
  { label: 'Öncelikli destek', free: false, pro: false, business: true },
];
