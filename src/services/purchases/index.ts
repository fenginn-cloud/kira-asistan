/**
 * Satın alma (in-app purchase) soyutlaması — go-live için hazır iskelet.
 *
 * Bugün: satın alma KAPALI (`purchasesAvailable = false`). Paywall "yakında"
 * gösterir. Gerçek para/hesap geldiğinde:
 *   1. `npx expo install react-native-purchases` (+ EAS/dev build; Expo Go/web'de çalışmaz)
 *   2. Aşağıdaki `revenueCatPurchases` implementasyonunu doldur (RevenueCat SDK).
 *   3. `activeProvider`'ı ona yönlendir.
 *   4. Oturum açılınca `Purchases.logIn(session.user.id)` çağır (app_user_id = auth.uid)
 *      ki webhook doğru şirketi bulabilsin (bkz. supabase/functions/revenuecat-webhook).
 *
 * Ekran kodu YALNIZCA bu arayüzü çağırır; sağlayıcı değişince ekran değişmez
 * (auth provider pattern ile aynı yaklaşım).
 */
import type { PlanId } from '@/types';

export interface PurchaseProvider {
  /** Cihaz/derleme satın almayı destekliyor mu (native + yapılandırılmış). */
  readonly available: boolean;
  /** Bir planı satın al (yıllık ürün). Başarılıysa entitlement webhook'la güncellenir. */
  purchase(plan: Exclude<PlanId, 'free'>): Promise<void>;
  /** Önceki satın almaları geri yükle. */
  restore(): Promise<void>;
}

/** Bugünkü no-op sağlayıcı: satın alma henüz etkin değil. */
const stubPurchases: PurchaseProvider = {
  available: false,
  async purchase() {
    throw new Error('Uygulama içi satın alma yakında etkinleştirilecek.');
  },
  async restore() {
    throw new Error('Uygulama içi satın alma yakında etkinleştirilecek.');
  },
};

// TODO(go-live): react-native-purchases ile gerçek implementasyon.
// export const revenueCatPurchases: PurchaseProvider = { ... };

export const purchases: PurchaseProvider = stubPurchases;
export const purchasesAvailable = purchases.available;
