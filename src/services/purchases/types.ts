// Kira Asistan — Satın alma (in-app purchase) soyutlaması: paylaşılan tipler.
//
// Bu dosya SADECE tip/interface içerir; hiçbir native modül import etmez, bu
// yüzden web dahil her platformda güvenle yüklenir. Gerçek implementasyon
// platforma göre `provider.native.ts` (RevenueCat) veya `provider.web.ts`
// (no-op) dosyasından gelir (Metro platform çözümlemesi).

/** Ücretli plan kimlikleri. RevenueCat entitlement id'leriyle birebir aynı. */
export type PaidPlanId = 'pro' | 'business';

/** Mağazadan (App Store / Google Play) dönen, satın alınabilir yıllık paket. */
export interface StorePackage {
  /** Bu paketin verdiği uygulama planı. */
  planId: PaidPlanId;
  /** Mağazanın döndürdüğü LOKAL fiyat metni, ör. "2.399,00 ₺". */
  priceString: string;
  /** Mağaza ürün kimliği (bilgi/log amaçlı). */
  productId: string;
  /** RevenueCat paketini opak taşımak için (satın almada kullanılır). */
  raw?: unknown;
}

/** Satın alma denemesinin ayrıştırılmış sonucu. */
export type PurchaseOutcome =
  | { status: 'success'; entitlements: PaidPlanId[] }
  /** Kullanıcı Apple/Google ekranını kendi kapattı — HATA gibi gösterme. */
  | { status: 'cancelled' }
  /** Ödeme "Ask to Buy" vb. nedenle beklemede. */
  | { status: 'pending' }
  | { status: 'error'; code: PurchaseErrorCode; message: string };

export type PurchaseErrorCode =
  | 'payment_failed'
  | 'network'
  | 'store_unavailable'
  | 'not_available' // native değil / RC key yok / paket yok
  | 'already_owned'
  | 'unknown';

/**
 * Satın alma sağlayıcısı arayüzü. Ekran kodu YALNIZCA bunu çağırır; sağlayıcı
 * (RevenueCat native / web no-op) değişince ekran değişmez.
 */
export interface PurchaseProvider {
  /**
   * Bu platform/derleme satın almayı destekliyor mu?
   * (native + RC public key yapılandırılmış). Web'de her zaman false.
   */
  readonly available: boolean;

  /** SDK'yı bir kez yapılandır (idempotent). available=false ise no-op. */
  configure(): Promise<void>;

  /**
   * RevenueCat App User ID'yi Supabase auth UUID ile eşitle
   * (Purchases.logIn). Login sonrası çağrılır; anonim kullanıcı oluşmaz.
   */
  identify(appUserId: string): Promise<void>;

  /** Çıkışta RevenueCat oturumunu sıfırla (Purchases.logOut). */
  reset(): Promise<void>;

  /**
   * Aktif offering'in paketlerini LOKAL fiyatlarıyla getir. Offering yoksa
   * boş dizi döner (crash yok).
   */
  getOfferings(): Promise<StorePackage[]>;

  /** Bir planı satın al (StoreKit / Play Billing üzerinden). */
  purchase(planId: PaidPlanId): Promise<PurchaseOutcome>;

  /** Önceki satın almaları geri yükle; aktif entitlement listesini döner. */
  restore(): Promise<PaidPlanId[]>;

  /** CustomerInfo'dan güncel aktif entitlement'ları oku. */
  getActiveEntitlements(): Promise<PaidPlanId[]>;
}

/** RevenueCat entitlement id → uygulama planı (webhook ile birebir). */
export const ENTITLEMENT_IDS: PaidPlanId[] = ['pro', 'business'];

/**
 * Bir paket/ürün kimliğinden planı çöz. Gerçek product ID'ler henüz
 * oluşturulmadığı için KAFADAN id yok; sadece paket/ürün adında 'business'
 * veya 'pro' geçmesine bakılır. RevenueCat offering paketleri bu sözleşmeye
 * göre adlandırılmalıdır (bkz. kurulum raporu).
 */
export function planFromIdentifier(identifier: string): PaidPlanId | null {
  const s = identifier.toLowerCase();
  if (s.includes('business')) return 'business';
  if (s.includes('pro')) return 'pro';
  return null;
}
