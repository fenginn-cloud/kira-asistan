import { useMemo } from 'react';
import { useCompany } from '@/features/users/hooks';
import { purchasesAvailable } from '@/services/purchases';
import { resolveEntitlement, type Entitlement } from './entitlement';

/**
 * Resolves the current company's entitlement (company-level plan + limits).
 * Read-only: reports the plan; does not enforce limits.
 *
 * LANSMAN (IAP kapalı) DAVRANIŞI:
 * Satın alma (IAP) kapalı olan derlemelerde — ki App Store'a giden production
 * budur — uygulamada plan/yükseltme/kilit kavramı KULLANICIYA GÖSTERİLMEZ
 * (Apple, satın alınamayan plan referanslarını reddediyor: Guideline 2.1(b)).
 * Bu yüzden ücretli-sadece özellikleri herkese açar ve sözleşme limitini
 * kaldırırız; böylece hiçbir "kilitli / Pro plana dahildir / Yükselt" ekranı
 * oluşmaz. Ekip (team) hariç tutulur — ekip UI'ı ayrıca gizlenir ve sunucu
 * tarafı tek kullanıcıyı korur. IAP açıldığında (1.1) gerçek plan limitleri
 * otomatik geri gelir (bu override yalnızca purchasesAvailable=false iken çalışır).
 */
export function useEntitlement(): Entitlement {
  const { data: company } = useCompany();
  return useMemo(() => {
    const base = resolveEntitlement(company);
    if (purchasesAvailable) return base;
    return {
      ...base,
      limits: {
        ...base.limits,
        maxContracts: null, // sözleşme limiti yok (lansman)
        excel: true,
        stats: true,
        advanceReminders: true,
        tenantPortal: true,
      },
    };
  }, [company]);
}
