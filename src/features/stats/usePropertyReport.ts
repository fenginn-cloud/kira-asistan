import { useMemo } from 'react';
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments } from '@/features/payments/hooks';
import { useBuildingUnits } from './buildingUnitsHooks';
import { STATS_START_MONTH } from './useStats';
import { buildingName, foldSearch } from '@/lib/utils/property';

const monthKey = (d: Date) => format(startOfMonth(d), 'yyyy-MM-dd');

/** Bir mülkün (bina) tek aya ait performans özeti. */
export interface PropertyMonthStat {
  /** YYYY-MM-01 */
  key: string;
  /** "Tem" */
  short: string;
  /** "Temmuz 2026" */
  long: string;
  // Tahsilat
  expected: number;
  collected: number;
  /** 0-100 */
  collectionRate: number;
  // Kiralama / komisyon
  newRentals: number;
  commission: number;
  // Doluluk (ilgili ayda geçerli sözleşmelere göre)
  totalUnits: number;
  occupied: number;
  vacant: number;
  /** 0-100 */
  occupancyRate: number;
}

export interface PropertyReport {
  building: string;
  months: PropertyMonthStat[]; // en yeni önce
  /** Toplam daire sayısı tanımlı mı (building_units'te). */
  hasUnitTotal: boolean;
}

/**
 * Mülk (rezidans) bazlı aylık performans raporu. Tümüyle mevcut sözleşme, ödeme
 * ve komisyon kayıtlarından hesaplanır — hiçbir veri tekrar yazılmaz.
 * `enabled=false` (Free plan) iken hesap yapılmaz.
 */
export function usePropertyReport(building: string, enabled: boolean): PropertyReport | null {
  const { data: contracts = [] } = useContracts();
  const { data: payments = [] } = useAllPayments();
  const { data: unitOverrides = [] } = useBuildingUnits();

  return useMemo(() => {
    if (!enabled || !building) return null;
    const targetKey = foldSearch(building);

    // Bu mülke ait sözleşmeler (bina adına göre, TR duyarsız).
    const own = contracts.filter((c) => foldSearch(buildingName(c.propertyName)) === targetKey);
    const ownIds = new Set(own.map((c) => c.id));

    // Fiziksel daire kimliği (aynı daire mükerrer sözleşmede çift sayılmasın).
    const unitKey = (c: (typeof own)[number]) =>
      foldSearch([c.propertyName, c.block, c.unit].filter(Boolean).join(' '));

    // Toplam daire: building_units override → yoksa tüm zamanların benzersiz dairesi.
    const override = unitOverrides.find((o) => foldSearch(o.building) === targetKey);
    const distinctAllTime = new Set(own.map(unitKey)).size;
    const totalUnits = override ? override.total : distinctAllTime;

    // Ödemeleri döneme göre topla (yalnızca bu mülkün sözleşmeleri).
    const payAgg = new Map<string, { expected: number; collected: number }>();
    for (const p of payments) {
      if (!ownIds.has(p.contractId)) continue;
      const a = payAgg.get(p.periodMonth) ?? { expected: 0, collected: 0 };
      a.expected += p.amountDue;
      a.collected += p.amountPaid;
      payAgg.set(p.periodMonth, a);
    }

    // Seçilebilir aylar: STATS_START_MONTH → bu ay (en yeni önce).
    const today = new Date();
    const monthKeys: string[] = [];
    let cursor = startOfMonth(today);
    while (monthKey(cursor) >= STATS_START_MONTH) {
      monthKeys.push(monthKey(cursor));
      cursor = subMonths(cursor, 1);
    }

    const months: PropertyMonthStat[] = monthKeys.map((key) => {
      const pay = payAgg.get(key) ?? { expected: 0, collected: 0 };

      // O ay yeni kiralama + komisyon (sözleşme başlangıcına göre).
      let newRentals = 0;
      let commission = 0;
      // O ay dolu daireler: başlangıcı <= ay ve (bitişi yok veya bitişi >= ay).
      const occupiedUnits = new Set<string>();
      for (const c of own) {
        if (!c.startDate) continue;
        const sKey = monthKey(parseISO(c.startDate));
        if (sKey === key) {
          newRentals += 1;
          commission += c.commissionAmount ?? 0;
        }
        const eKey = c.endDate ? monthKey(parseISO(c.endDate)) : null;
        const validThisMonth = sKey <= key && (eKey === null || eKey >= key);
        if (validThisMonth) occupiedUnits.add(unitKey(c));
      }

      const occupied = Math.min(occupiedUnits.size, totalUnits || occupiedUnits.size);
      const total = totalUnits || occupied;
      const vacant = Math.max(0, total - occupied);

      return {
        key,
        short: format(parseISO(key), 'MMM', { locale: tr }),
        long: format(parseISO(key), 'MMMM yyyy', { locale: tr }),
        expected: pay.expected,
        collected: pay.collected,
        collectionRate: pay.expected > 0 ? (pay.collected / pay.expected) * 100 : 0,
        newRentals,
        commission,
        totalUnits: total,
        occupied,
        vacant,
        occupancyRate: total > 0 ? (occupied / total) * 100 : 0,
      };
    });

    return { building, months, hasUnitTotal: !!override };
  }, [enabled, building, contracts, payments, unitOverrides]);
}
