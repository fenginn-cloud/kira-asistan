// Kira Asistan — Satın alma sağlayıcısı: güvenli fallback.
//
// Metro normalde `provider.native.ts` (iOS/Android) veya `provider.web.ts`
// (web) dosyasını seçer. Bu dosya yalnızca beklenmeyen bir platformda devreye
// girer ve satın almayı kapalı tutar (crash yok).

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
    return { status: 'error', code: 'not_available', message: 'Satın alma bu platformda desteklenmiyor.' };
  },
  async restore() {
    return [];
  },
  async getActiveEntitlements() {
    return [];
  },
};
