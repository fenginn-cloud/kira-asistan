import { useMemo } from 'react';
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments } from '@/features/payments/hooks';
import { derivePaymentStatus, remainingDebt } from '@/lib/utils/payments';
import { buildingName } from '@/lib/utils/property';
import type { BarDatum } from '@/components/charts/BarChart';

/** Uygulamanın kira takibine başladığı ilk dönem. Aylar bundan öncesine gitmez. */
export const STATS_START_MONTH = '2026-04-01';

/** Ay-bazlı bina tahsilat özeti. */
export interface BuildingMonthStat {
  building: string;
  due: number;
  collected: number;
  pending: number;
  overdue: number;
  paidUnits: number;
  totalUnits: number;
  /** Bu ay giren kiracılardan alınan komisyon. */
  commission: number;
  /** 0-100 tahsilat oranı. */
  rate: number;
}

export interface MonthOption {
  /** YYYY-MM-01 */
  value: string;
  /** "Tem" */
  short: string;
  /** "Temmuz 2026" */
  long: string;
}

const monthKey = (d: Date) => format(startOfMonth(d), 'yyyy-MM-dd');

interface MonthAgg {
  due: number;
  collected: number;
  pending: number;
  overdue: number;
  paid: number;
  count: number;
}

export function useStats(selectedMonth?: string) {
  const { data: contracts = [], isLoading: lc } = useContracts();
  const { data: payments = [], isLoading: lp } = useAllPayments();

  return useMemo(() => {
    const today = new Date();
    const thisMonth = monthKey(today);
    const contractById = new Map(contracts.map((c) => [c.id, c]));

    // Seçilebilir aylar: STATS_START_MONTH → bu ay (en yeni önce).
    const monthValues: string[] = [];
    let cursor = startOfMonth(today);
    while (monthKey(cursor) >= STATS_START_MONTH) {
      monthValues.push(monthKey(cursor));
      cursor = subMonths(cursor, 1);
    }
    const months: MonthOption[] = monthValues.map((value) => ({
      value,
      short: format(parseISO(value), 'MMM', { locale: tr }),
      long: format(parseISO(value), 'MMMM yyyy', { locale: tr }),
    }));

    const activeMonth =
      selectedMonth && monthValues.includes(selectedMonth) ? selectedMonth : thisMonth;

    // Tüm ödemeleri döneme göre topla (canlı statü ile).
    const aggByMonth = new Map<string, MonthAgg>();
    const emptyAgg = (): MonthAgg => ({
      due: 0,
      collected: 0,
      pending: 0,
      overdue: 0,
      paid: 0,
      count: 0,
    });
    for (const p of payments) {
      const a = aggByMonth.get(p.periodMonth) ?? emptyAgg();
      const live = derivePaymentStatus(p, today);
      a.due += p.amountDue;
      a.collected += p.amountPaid;
      a.count += 1;
      if (live === 'paid') a.paid += 1;
      else if (live === 'overdue') a.overdue += remainingDebt(p);
      else a.pending += remainingDebt(p);
      aggByMonth.set(p.periodMonth, a);
    }

    const cur = aggByMonth.get(activeMonth) ?? emptyAgg();
    const collectionRate = cur.due > 0 ? (cur.collected / cur.due) * 100 : 0;

    // Bir önceki aya göre kıyas (tahsilat tutarı).
    const prevMonth = monthKey(subMonths(parseISO(activeMonth), 1));
    const prev = aggByMonth.get(prevMonth);
    const prevCollected = prev?.collected ?? 0;
    const momDeltaPct =
      prevCollected > 0
        ? ((cur.collected - prevCollected) / prevCollected) * 100
        : null;

    // Bina bazlı ay detayı.
    const buildingMap = new Map<string, BuildingMonthStat>();
    const emptyBuilding = (building: string): BuildingMonthStat => ({
      building,
      due: 0,
      collected: 0,
      pending: 0,
      overdue: 0,
      paidUnits: 0,
      totalUnits: 0,
      commission: 0,
      rate: 0,
    });
    for (const p of payments) {
      if (p.periodMonth !== activeMonth) continue;
      const c = contractById.get(p.contractId);
      if (!c) continue;
      const b = buildingName(c.propertyName);
      const bs = buildingMap.get(b) ?? emptyBuilding(b);
      const live = derivePaymentStatus(p, today);
      bs.due += p.amountDue;
      bs.collected += p.amountPaid;
      bs.totalUnits += 1;
      if (live === 'paid') bs.paidUnits += 1;
      else if (live === 'overdue') bs.overdue += remainingDebt(p);
      else bs.pending += remainingDebt(p);
      buildingMap.set(b, bs);
    }
    // Komisyon: kiracı girişinde bir kerelik. Giriş ayına göre atanır.
    let commissionThisMonth = 0;
    let commissionTotal = 0;
    for (const c of contracts) {
      const com = c.commissionAmount ?? 0;
      if (com <= 0) continue;
      commissionTotal += com;
      if (c.startDate && monthKey(parseISO(c.startDate)) === activeMonth) {
        commissionThisMonth += com;
        const b = buildingName(c.propertyName);
        const bs = buildingMap.get(b) ?? emptyBuilding(b);
        bs.commission += com;
        buildingMap.set(b, bs);
      }
    }

    const byBuilding = [...buildingMap.values()]
      .map((b) => ({ ...b, rate: b.due > 0 ? (b.collected / b.due) * 100 : 0 }))
      // Önce sorunlular: gecikeni olanlar üste, sonra düşük tahsilat oranı.
      .sort((a, b) => {
        if ((b.overdue > 0 ? 1 : 0) !== (a.overdue > 0 ? 1 : 0)) {
          return (b.overdue > 0 ? 1 : 0) - (a.overdue > 0 ? 1 : 0);
        }
        if (b.overdue !== a.overdue) return b.overdue - a.overdue;
        return a.rate - b.rate;
      });

    // Trend: STATS_START_MONTH → bu ay (en fazla son 6 dönem).
    const trendValues = monthValues.slice(0, 6).reverse(); // eski → yeni
    const trend: BarDatum[] = trendValues.map((m) => ({
      label: format(parseISO(m), 'MMM', { locale: tr }),
      value: aggByMonth.get(m)?.collected ?? 0,
    }));
    const trendActiveIndex = trendValues.indexOf(activeMonth);

    // Genel bilgi (aya bağlı değil).
    const activeContracts = contracts.filter((c) => c.status === 'active');
    const portfolioValue = activeContracts.reduce((s, c) => s + c.depositAmount, 0);
    const expectedMonthlyIncome = activeContracts.reduce(
      (s, c) => s + c.rentAmount + c.duesAmount,
      0
    );

    return {
      isLoading: lc || lp,
      months,
      activeMonth,
      activeMonthLong: format(parseISO(activeMonth), 'MMMM yyyy', { locale: tr }),
      // Seçili ay
      due: cur.due,
      collected: cur.collected,
      pending: cur.pending,
      overdue: cur.overdue,
      collectionRate,
      paidContracts: cur.paid,
      totalContracts: cur.count,
      momDeltaPct,
      commissionThisMonth,
      commissionTotal,
      byBuilding,
      // Bağlam
      trend,
      trendActiveIndex,
      // Genel
      activeContractCount: activeContracts.length,
      portfolioValue,
      expectedMonthlyIncome,
    };
  }, [contracts, payments, lc, lp, selectedMonth]);
}
