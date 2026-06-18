import { useMemo } from 'react';
import { isThisMonth, parseISO } from 'date-fns';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments } from '@/features/payments/hooks';
import { useSettingsStore } from '@/store/settingsStore';
import { remainingDebt } from '@/lib/utils/payments';
import {
  computeOverdue,
  computeTodayReminders,
  computeUpcoming,
  type OpenItem,
  type ReminderWithRefs,
  type UpcomingBuckets,
} from './reminders';

export interface NotificationCenter {
  isLoading: boolean;
  today: ReminderWithRefs[];
  upcoming: UpcomingBuckets;
  overdue: OpenItem[];
  summary: {
    collectedThisMonth: number;
    pendingCollections: number;
    overdueCollections: number;
  };
}

export function useNotificationCenter(): NotificationCenter {
  const { data: contracts = [], isLoading: lc } = useContracts();
  const { data: payments = [], isLoading: lp } = useAllPayments();
  const prefs = useSettingsStore((s) => s.notifications);

  return useMemo(() => {
    const today = computeTodayReminders({ contracts, payments, prefs });
    const upcoming = computeUpcoming(contracts, payments);
    const overdue = computeOverdue(contracts, payments);

    const collectedThisMonth = payments
      .filter((p) => p.paidAt && isThisMonth(parseISO(p.paidAt)))
      .reduce((sum, p) => sum + p.amountPaid, 0);

    const openByContract = [...upcoming.in7, ...upcoming.in3, ...upcoming.in1, ...overdue];
    const pendingCollections = openByContract.reduce(
      (sum, i) => sum + remainingDebt(i.payment),
      0
    );
    const overdueCollections = overdue.reduce((sum, i) => sum + remainingDebt(i.payment), 0);

    return {
      isLoading: lc || lp,
      today,
      upcoming,
      overdue,
      summary: { collectedThisMonth, pendingCollections, overdueCollections },
    };
  }, [contracts, payments, prefs, lc, lp]);
}
