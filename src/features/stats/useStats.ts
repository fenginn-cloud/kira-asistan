import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments } from '@/features/payments/hooks';
import { remainingDebt } from '@/lib/utils/payments';
import { buildingName } from '@/lib/utils/property';
import type { BarDatum } from '@/components/charts/BarChart';

export interface BuildingStat {
  building: string;
  collected: number;
  due: number;
  contracts: number;
}

export function useStats() {
  const { data: contracts = [], isLoading: lc } = useContracts();
  const { data: payments = [], isLoading: lp } = useAllPayments();

  return useMemo(() => {
    // Monthly collection (last periods present in data)
    const byMonth = new Map<string, number>();
    for (const p of payments) {
      byMonth.set(p.periodMonth, (byMonth.get(p.periodMonth) ?? 0) + p.amountPaid);
    }
    const monthlyCollection: BarDatum[] = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({
        label: format(parseISO(month), 'MMM', { locale: tr }),
        value,
      }));

    const overdueByMonth = new Map<string, number>();
    for (const p of payments) {
      if (p.status === 'overdue') {
        overdueByMonth.set(
          p.periodMonth,
          (overdueByMonth.get(p.periodMonth) ?? 0) + remainingDebt(p)
        );
      }
    }
    const overdueCollection: BarDatum[] = [...byMonth.keys()]
      .sort()
      .map((month) => ({
        label: format(parseISO(month), 'MMM', { locale: tr }),
        value: overdueByMonth.get(month) ?? 0,
      }));

    const totalDue = payments.reduce((s, p) => s + p.amountDue, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
    const successRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

    const activeContracts = contracts.filter((c) => c.status === 'active');
    const portfolioValue = activeContracts.reduce(
      (s, c) => s + c.depositAmount,
      0
    );
    const monthlyRentIncome = activeContracts.reduce(
      (s, c) => s + c.rentAmount + c.duesAmount,
      0
    );
    const pendingCollection = payments
      .filter((p) => p.status !== 'paid')
      .reduce((s, p) => s + remainingDebt(p), 0);
    const overdueCollectionTotal = payments
      .filter((p) => p.status === 'overdue')
      .reduce((s, p) => s + remainingDebt(p), 0);

    // Bina bazlı tahsilat (her binadan toplam ne kadar toplandı)
    const contractById = new Map(contracts.map((c) => [c.id, c]));
    const buildingMap = new Map<string, BuildingStat>();
    for (const c of contracts) {
      const b = buildingName(c.propertyName);
      const cur = buildingMap.get(b) ?? { building: b, collected: 0, due: 0, contracts: 0 };
      cur.contracts += 1;
      buildingMap.set(b, cur);
    }
    for (const p of payments) {
      const c = contractById.get(p.contractId);
      if (!c) continue;
      const b = buildingName(c.propertyName);
      const cur = buildingMap.get(b) ?? { building: b, collected: 0, due: 0, contracts: 0 };
      cur.collected += p.amountPaid;
      cur.due += p.amountDue;
      buildingMap.set(b, cur);
    }
    const byBuilding: BuildingStat[] = [...buildingMap.values()].sort(
      (a, b) => b.collected - a.collected
    );

    return {
      isLoading: lc || lp,
      monthlyCollection,
      overdueCollection,
      successRate,
      activeContractCount: activeContracts.length,
      portfolioValue,
      monthlyRentIncome,
      pendingCollection,
      overdueCollectionTotal,
      byBuilding,
    };
  }, [contracts, payments, lc, lp]);
}
