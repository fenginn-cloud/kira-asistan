// Kira Asistan — Satın alma servisi (barrel).
//
// Gerçek sağlayıcı platforma göre Metro tarafından seçilir:
//   • provider.native.ts → iOS/Android (RevenueCat SDK)
//   • provider.web.ts     → web (no-op; web'de satın alma yok, plan Supabase'den okunur)
//   • provider.ts         → güvenli fallback (available=false)
//
// Böylece `react-native-purchases` native modülü WEB paketine hiç girmez.

import { purchases } from './provider';

export * from './types';
export { purchases };

/** Kısayol: bu derleme satın almayı destekliyor mu? */
export const purchasesAvailable = purchases.available;
