import { differenceInCalendarDays, parseISO } from 'date-fns';
import type {
  Contract,
  NotificationPreferences,
  NotificationTrigger,
  Payment,
  Reminder,
} from '@/types';
import { remainingDebt } from '@/lib/utils/payments';

/** Day offset (relative to due date) at which each trigger fires. */
export const TRIGGER_OFFSET: Record<NotificationTrigger, number> = {
  before_7: 7,
  before_3: 3,
  before_1: 1,
  due_day: 0,
  overdue_1: -1,
  overdue_3: -3,
  overdue_7: -7,
};

export interface ReminderWithRefs extends Reminder {
  contract: Contract;
  payment: Payment;
}

/** The single open (unpaid/partial) payment that still owes money. */
export function openPaymentFor(payments: Payment[]): Payment | undefined {
  return payments
    .filter((p) => remainingDebt(p) > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
}

function triggerFiringToday(daysUntil: number): NotificationTrigger | null {
  for (const [trigger, offset] of Object.entries(TRIGGER_OFFSET) as [
    NotificationTrigger,
    number,
  ][]) {
    // before_* => daysUntil === offset; overdue_* => daysUntil === offset (negative)
    if (daysUntil === offset) return trigger;
  }
  return null;
}

interface ComputeInput {
  contracts: Contract[];
  payments: Payment[];
  prefs: NotificationPreferences;
  today?: Date;
}

/**
 * Reminders that should be SENT today — one per contract whose open payment's
 * due date lands exactly on a trigger offset and whose trigger is enabled.
 */
export function computeTodayReminders({
  contracts,
  payments,
  prefs,
  today = new Date(),
}: ComputeInput): ReminderWithRefs[] {
  const result: ReminderWithRefs[] = [];

  for (const contract of contracts) {
    if (contract.status !== 'active') continue;

    const contractPayments = payments.filter((p) => p.contractId === contract.id);
    const open = openPaymentFor(contractPayments);
    if (!open) continue;

    const daysUntil = differenceInCalendarDays(parseISO(open.dueDate), today);
    const trigger = triggerFiringToday(daysUntil);
    if (!trigger || !prefs[trigger]) continue;

    result.push({
      id: `${contract.id}:${open.periodMonth}:${trigger}`,
      contractId: contract.id,
      paymentId: open.id,
      trigger,
      daysUntil,
      kind: daysUntil < 0 ? 'overdue' : 'upcoming',
      contract,
      payment: open,
    });
  }

  // Most urgent first (most overdue, then soonest due).
  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}

export interface OpenItem {
  contract: Contract;
  payment: Payment;
  daysUntil: number;
}

function openItems(contracts: Contract[], payments: Payment[], today: Date): OpenItem[] {
  const items: OpenItem[] = [];
  for (const contract of contracts) {
    if (contract.status !== 'active') continue;
    const open = openPaymentFor(payments.filter((p) => p.contractId === contract.id));
    if (!open) continue;
    items.push({
      contract,
      payment: open,
      daysUntil: differenceInCalendarDays(parseISO(open.dueDate), today),
    });
  }
  return items;
}

export interface UpcomingBuckets {
  in7: OpenItem[]; // 4–7 gün
  in3: OpenItem[]; // 2–3 gün
  in1: OpenItem[]; // 1 gün
}

export function computeUpcoming(
  contracts: Contract[],
  payments: Payment[],
  today = new Date()
): UpcomingBuckets {
  const items = openItems(contracts, payments, today).filter((i) => i.daysUntil > 0);
  return {
    in7: items.filter((i) => i.daysUntil >= 4 && i.daysUntil <= 7),
    in3: items.filter((i) => i.daysUntil >= 2 && i.daysUntil <= 3),
    in1: items.filter((i) => i.daysUntil === 1),
  };
}

export function computeOverdue(
  contracts: Contract[],
  payments: Payment[],
  today = new Date()
): OpenItem[] {
  return openItems(contracts, payments, today)
    .filter((i) => i.daysUntil < 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
