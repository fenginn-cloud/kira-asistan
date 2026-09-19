// Kira Asistan — Satın alma sağlayıcısı: NATIVE (iOS/Android, RevenueCat).
//
// - RevenueCat public SDK key'i env'den okunur (EXPO_PUBLIC_RC_IOS_KEY /
//   EXPO_PUBLIC_RC_ANDROID_KEY). KEY YOKSA `available=false` → satın alma
//   kapalı kalır (production varsayılan olarak KAPALI). Sandbox/test için
//   ilgili build profiline public key konur.
// - App User ID = Supabase auth UUID (identify → Purchases.logIn).
// - SECRET key ASLA burada yer almaz; yalnızca public SDK key kullanılır.

import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import {
  ENTITLEMENT_IDS,
  planFromIdentifier,
  type PaidPlanId,
  type PurchaseErrorCode,
  type PurchaseOutcome,
  type PurchaseProvider,
  type StorePackage,
} from './types';

const API_KEY =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_RC_IOS_KEY ?? ''
    : Platform.OS === 'android'
      ? process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? ''
      : '';

const AVAILABLE = (Platform.OS === 'ios' || Platform.OS === 'android') && API_KEY.length > 0;

let configured = false;

/** Aktif entitlement id'lerini CustomerInfo'dan çıkar. */
function activeEntitlements(info: CustomerInfo): PaidPlanId[] {
  return ENTITLEMENT_IDS.filter((id) => info.entitlements.active[id] != null);
}

/** RC paketini → uygulama planına eşle (product/paket adına göre). */
function planOfPackage(pkg: PurchasesPackage): PaidPlanId | null {
  return (
    planFromIdentifier(pkg.identifier) ??
    planFromIdentifier(pkg.product.identifier)
  );
}

function ensureConfigured(appUserID?: string): void {
  if (!AVAILABLE || configured) return;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);
  Purchases.configure(appUserID ? { apiKey: API_KEY, appUserID } : { apiKey: API_KEY });
  configured = true;
}

/** RC hatasını uygulama sonucuna çevir. */
function mapError(e: unknown): PurchaseOutcome {
  const err = e as { userCancelled?: boolean; code?: string; message?: string };
  if (err?.userCancelled) return { status: 'cancelled' };

  let code: PurchaseErrorCode = 'unknown';
  switch (err?.code) {
    case PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR:
      return { status: 'cancelled' };
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return { status: 'pending' };
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
      code = 'network';
      break;
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
      code = 'store_unavailable';
      break;
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
      code = 'already_owned';
      break;
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
    case PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR:
      code = 'payment_failed';
      break;
    default:
      code = 'unknown';
  }
  return { status: 'error', code, message: err?.message ?? 'Satın alma tamamlanamadı.' };
}

/** Aktif offering'in ham RC paketleri (satın alma için). */
async function rawPackages(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export const purchases: PurchaseProvider = {
  available: AVAILABLE,

  async configure() {
    ensureConfigured();
  },

  async identify(appUserId: string) {
    if (!AVAILABLE || !appUserId) return;
    if (!configured) {
      ensureConfigured(appUserId);
    } else {
      await Purchases.logIn(appUserId);
    }
  },

  async reset() {
    if (!AVAILABLE || !configured) return;
    try {
      await Purchases.logOut();
    } catch {
      // Zaten anonimse RC hata verebilir; yut.
    }
  },

  async getOfferings(): Promise<StorePackage[]> {
    if (!AVAILABLE) return [];
    ensureConfigured();
    try {
      const pkgs = await rawPackages();
      const out: StorePackage[] = [];
      for (const pkg of pkgs) {
        const planId = planOfPackage(pkg);
        if (!planId) continue;
        out.push({
          planId,
          priceString: pkg.product.priceString,
          productId: pkg.product.identifier,
          raw: pkg,
        });
      }
      return out;
    } catch {
      return [];
    }
  },

  async purchase(planId: PaidPlanId): Promise<PurchaseOutcome> {
    if (!AVAILABLE) {
      return { status: 'error', code: 'not_available', message: 'Satın alma bu derlemede etkin değil.' };
    }
    ensureConfigured();
    try {
      const pkgs = await rawPackages();
      const pkg = pkgs.find((p) => planOfPackage(p) === planId);
      if (!pkg) {
        return { status: 'error', code: 'not_available', message: 'Bu plan için mağaza ürünü bulunamadı.' };
      }
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return { status: 'success', entitlements: activeEntitlements(customerInfo) };
    } catch (e) {
      return mapError(e);
    }
  },

  async restore(): Promise<PaidPlanId[]> {
    if (!AVAILABLE) return [];
    ensureConfigured();
    const info = await Purchases.restorePurchases();
    return activeEntitlements(info);
  },

  async getActiveEntitlements(): Promise<PaidPlanId[]> {
    if (!AVAILABLE) return [];
    ensureConfigured();
    try {
      const info = await Purchases.getCustomerInfo();
      return activeEntitlements(info);
    } catch {
      return [];
    }
  },
};
