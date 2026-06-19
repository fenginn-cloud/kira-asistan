import { addMonths, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import type { Contract } from '@/types';

export interface PaymentSeed {
  contractId: string;
  periodMonth: string; // YYYY-MM-01
  dueDate: string; // YYYY-MM-DD (payment day clamped to month length)
  amountDue: number;
}

/**
 * The payment periods that should exist for a contract: the current month plus
 * the previous `prevMonths` months (default 2 → current + 2 = last 3 months),
 * never earlier than the contract's start month.
 *
 * Missing records are created from these so a past month with no record is
 * surfaced (as overdue/pending), never silently treated as "paid".
 */
export function recentPaymentPeriods(
  contract: Contract,
  today = new Date(),
  prevMonths = 2
): PaymentSeed[] {
  const startMonth = contract.startDate
    ? startOfMonth(parseISO(contract.startDate))
    : null;

  const out: PaymentSeed[] = [];
  for (let i = 0; i <= prevMonths; i++) {
    const m = startOfMonth(addMonths(today, -i));
    if (startMonth && m < startMonth) continue; // before the contract began

    const day = Math.min(contract.paymentDay, endOfMonth(m).getDate());
    const due = new Date(m.getFullYear(), m.getMonth(), day);
    out.push({
      contractId: contract.id,
      periodMonth: format(m, 'yyyy-MM-dd'),
      dueDate: format(due, 'yyyy-MM-dd'),
      amountDue: contract.rentAmount + contract.duesAmount,
    });
  }
  return out;
}

/** Earliest period string to display (start of `prevMonths` months ago). */
export function recentPeriodCutoff(today = new Date(), prevMonths = 2): string {
  return format(startOfMonth(addMonths(today, -prevMonths)), 'yyyy-MM-dd');
}
