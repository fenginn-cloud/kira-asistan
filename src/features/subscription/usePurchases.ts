// Kira Asistan — Satın alma akışı hook'ları (paywall bunları kullanır).
//
// Tek doğruluk kaynağı Supabase `companies` satırıdır. Satın alma başarılı
// olunca:
//   1. RevenueCat CustomerInfo'dan entitlement'lar anında okunur (hızlı UI).
//   2. `company` sorgusu invalidate edilir → webhook Supabase'i güncelledikçe
//      kalıcı/sunucu-doğrulanmış plan yansır.

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query';
import { purchases, type PaidPlanId, type PurchaseOutcome, type StorePackage } from '@/services/purchases';

/** Bu derlemede uygulama içi satın alma etkin mi (native + RC key). */
export const purchasesAvailable = purchases.available;

/**
 * Aktif offering'in paketleri (LOKAL fiyatlı). Satın alma etkin değilse boş
 * dizi döner; ekran fallback (katalog fiyatı / "mobilden yükseltin") gösterir.
 */
export function useOfferings() {
  return useQuery({
    queryKey: ['offerings'],
    queryFn: () => purchases.getOfferings(),
    enabled: purchases.available,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Belirli bir plan için mağaza paketini bul (fiyat göstermek/satın almak için). */
export function usePackageFor(planId: PaidPlanId): StorePackage | undefined {
  const { data } = useOfferings();
  return data?.find((p) => p.planId === planId);
}

/** Planı satın al. Sonuç PurchaseOutcome olarak döner (cancelled ≠ error). */
export function usePurchasePlan() {
  const qc = useQueryClient();
  return useMutation<PurchaseOutcome, unknown, PaidPlanId>({
    mutationFn: (planId: PaidPlanId) => purchases.purchase(planId),
    onSuccess: (outcome) => {
      if (outcome.status === 'success') {
        // Webhook Supabase'i güncelledikçe planı çek.
        void qc.invalidateQueries({ queryKey: queryKeys.company });
      }
    },
  });
}

/** Satın alımları geri yükle (telefon değiştirme / yeniden kurulum). */
export function useRestorePurchases() {
  const qc = useQueryClient();
  return useMutation<PaidPlanId[], unknown, void>({
    mutationFn: () => purchases.restore(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.company });
    },
  });
}

/** İnsan-okur satın alma hata mesajı (kullanıcı iptali burada ele alınmaz). */
export function purchaseErrorMessage(outcome: Extract<PurchaseOutcome, { status: 'error' }>): string {
  switch (outcome.code) {
    case 'network':
      return 'Bağlantı hatası. İnternetinizi kontrol edip tekrar deneyin.';
    case 'store_unavailable':
      return 'Mağazaya şu an ulaşılamıyor. Lütfen daha sonra deneyin.';
    case 'already_owned':
      return 'Bu abonelik zaten hesabınızda. "Satın Alımları Geri Yükle"yi deneyin.';
    case 'not_available':
      return outcome.message || 'Satın alma şu an kullanılamıyor.';
    case 'payment_failed':
      return 'Ödeme tamamlanamadı. Lütfen tekrar deneyin.';
    default:
      return 'Satın alma tamamlanamadı. Lütfen tekrar deneyin.';
  }
}

/** Paywall için tek noktadan satın alma yardımcıları. */
export function usePaywallActions() {
  const purchaseMut = usePurchasePlan();
  const restoreMut = useRestorePurchases();

  const buy = useCallback(
    (planId: PaidPlanId) => purchaseMut.mutateAsync(planId),
    [purchaseMut]
  );
  const restore = useCallback(() => restoreMut.mutateAsync(), [restoreMut]);

  return {
    buy,
    restore,
    buying: purchaseMut.isPending,
    restoring: restoreMut.isPending,
    buyingPlan: purchaseMut.variables ?? null,
  };
}
