import { useMemo } from 'react';
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments } from '@/features/payments/hooks';
import { derivePaymentStatus, remainingDebt } from '@/lib/utils/payments';
import { buildingName } from '@/lib/utils/property';
import type { BarDatum } from '@/components/charts/BarChart';

/** Ay-bazlı bina tahsilat özeti. */
export interface BuildingMonthStat {
  building: string;
  due: number;
  collected: number;
  pending: number;
  overdue: number;
  paidUnits: number;
  totalUnits: number;
}

export interface MonthOption {
  /** YYYY-MM-01 */
  value: string;
  /** "Tem 2026" */
  label: string;
}

const monthKey = (d: Date) => format(startOfMonth(d), 'yyyy-MM-dd');

export function useStats(selectedMonth?: string) {
  const { data: contracts = [], isLoading: lc } = useContracts();
  const { data: payments = [], isLoading: lp } = useAllPayments();

  return useMemo(() => {
    const today = new Date();
    const thisMonth = monthKey(today);

    // Seçilebilir aylar: veri olan aylar + son 12 ay + bu ay (tekilleştirilmiş).
    const monthSet = new Set<string>([thisMonth]);
    for (const p of payments) monthSet.add(p.periodMonth);
    for (let i = 0; i < 12; i++) monthSet.add(monthKey(subMonths(today, i)));
    const monthValues = [...monthSet].sort((a, b) => b.localeCompare(a)); // en yeni önce
    const months: MonthOption[] = monthValues.map((value) => ({
      value,
      label: format(parseISO(value), 'MMM yyyy', { locale: tr }),
    }));

    const activeMonth =
      selectedMonth && monthSet.has(selectedMonth) ? selectedMonth : thisMonth;

    // Seçili ay ödemeleri (canlı statü ile).
    const monthPayments = payments
      .filter((p) => p.periodMonth === activeMonth)
      .map((p) => ({ ...p, live: derivePaymentStatus(p, today) }));

    let due = 0;
    let collected = 0;
    let pending = 0;
    let overdue = 0;
    let paidContracts = 0;
    for (const p of monthPayments) {
      due += p.amountDue;
      collected += p.amountPaid;
      if (p.live === 'paid') paidContracts += 1;
      else if (p.live === 'overdue') overdue += remainingDebt(p);
      else pending += remainingDebt(p);
    }
    const collectionRate = due > 0 ? (collected / due) * 100 : 0;

    // Bina bazlı ay detayı.
    const contractById = new Map(contracts.map((c) => [c.id, c]));
    const buildingMap = new Map<string, BuildingMonthStat>();
    const emptyBuilding = (building: string): BuildingMonthStat => ({
      building,
      due: 0,
      collected: 0,
      pending: 0,
      overdue: 0,
      paidUnits: 0,
      totalUnits: 0,
    });
    for (const p of monthPayments) {
      const c = contractById.get(p.contractId);
      if (!c) continue;
      const b = buildingName(c.propertyName);
      const cur = buildingMap.get(b) ?? emptyBuilding(b);
      cur.due += p.amountDue;
      cur.collected += p.amountPaid;
      cur.totalUnits += 1;
      if (p.live === 'paid') cur.paidUnits += 1;
      else if (p.live === 'overdue') cur.overdue += remainingDebt(p);
      else cur.pending += remainingDebt(p);
      buildingMap.set(b, cur);
    }
    const byBuilding = [...buildingMap.values()].sort(
      (a, b) => b.due - a.due
    );

    // Son 6 ay tahsilat trendi (bağlam grafiği).
    const trendMonths: string[] = [];
    for (let i = 5; i >= 0; i--) trendMonths.push(monthKey(subMonths(today, i)));
    const collectedByMonth = new Map<string, number>();
    for (const p of payments) {
      collectedByMonth.set(
        p.periodMonth,
        (collectedByMonth.get(p.periodMonth) ?? 0) + p.amountPaid
      );
    }
    const trend: BarDatum[] = trendMonths.map((m) => ({
      label: format(parseISO(m), 'MMM', { locale: tr }),
      value: collectedByMonth.get(m) ?? 0,
    }));

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
      // Seçili ay
      due,
      collected,
      pending,
      overdue,
      collectionRate,
      paidContracts,
      totalContracts: monthPayments.length,
      byBuilding,
      // Bağlam
      trend,
      // Genel
      activeContractCount: activeContracts.length,
      portfolioValue,
      expectedMonthlyIncome,
    };
  }, [contracts, payments, lc, lp, selectedMonth]);
}
