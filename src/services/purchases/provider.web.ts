// Kira Asistan — Satın alma sağlayıcısı: WEB (no-op).
//
// Web'de uygulama içi satın alma YOKTUR. Web yalnızca Supabase companies
// satırındaki planı OKUR (mobilden alınan abonelik burada da görünür).
// `react-native-purchases` bu dosyada import EDİLMEZ; böylece native modül
// web paketine hiç girmez ve web build bozulmaz.
//
// İleride RevenueCat Web Billing eklendiğinde bu dosya gerçek web
// implementasyonuna dönüştürülebilir (mimari aynı kalır).

import type { PurchaseProvider } from './types';

export const purchases: PurchaseProvider = {
  available: false,
  async configure() {},
  async identify() {},
  async reset() {},
  async getOfferings() {
    return [];
  },
  async purchase() {
    return {
      status: 'error',
      code: 'not_available',
      message: 'Web üzerinden satın alma şu an kapalı. Mobil uygulamadan yükseltebilirsiniz.',
    };
  },
  async restore() {
    return [];
  },
  async getActiveEntitlements() {
    return [];
  },
};
