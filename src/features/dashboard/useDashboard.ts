import { useMemo } from 'react';
import { isThisMonth, parseISO } from 'date-fns';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments } from '@/features/payments/hooks';
import { daysUntilDue, remainingDebt } from '@/lib/utils/payments';
import type { Contract, Payment } from '@/types';

export interface DashboardData {
  isLoading: boolean;
  stats: {
    activeContracts: number;
    overdueCount: number;
    collectedThisMonth: number;
    pendingCollections: number;
  };
  upcoming: PaymentWithContract[];
  dueToday: PaymentWithContract[];
  overdue: PaymentWithContract[];
}

export interface PaymentWithContract {
  payment: Payment;
  contract: Contract;
  daysUntil: number;
}

export function useDashboard(): DashboardData {
  const { data: contracts = [], isLoading: lc } = useContracts();
  const { data: payments = [], isLoading: lp } = useAllPayments();

  return useMemo(() => {
    const byId = new Map(contracts.map((c) => [c.id, c]));
    const withContract: PaymentWithContract[] = payments
      .map((payment) => {
        const contract = byId.get(payment.contractId);
        if (!contract) return null;
        return { payment, contract, daysUntil: daysUntilDue(payment) };
      })
      .filter((x): x is PaymentWithContract => x !== null);

    const open = withContract.filter((x) => x.payment.status !== 'paid');

    const overdue = open
      .filter((x) => x.payment.status === 'overdue')
      .sort((a, b) => a.daysUntil - b.daysUntil);

    const dueToday = open.filter((x) => x.daysUntil === 0);

    const upcoming = open
      .filter((x) => x.daysUntil > 0)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    const collectedThisMonth = payments
      .filter((p) => p.paidAt && isThisMonth(parseISO(p.paidAt)))
      .reduce((sum, p) => sum + p.amountPaid, 0);

    const pendingCollections = open.reduce(
      (sum, x) => sum + remainingDebt(x.payment),
      0
    );

    return {
      isLoading: lc || lp,
      stats: {
        activeContracts: contracts.filter((c) => c.status === 'active').length,
        overdueCount: overdue.length,
        collectedThisMonth,
        pendingCollections,
      },
      upcoming,
      dueToday,
      overdue,
    };
  }, [contracts, payments, lc, lp]);
}
