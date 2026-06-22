import { addMonths, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import type { Contract } from '@/types';

export interface PaymentSeed {
  contractId: string;
  periodMonth: string; // YYYY-MM-01
  dueDate: string; // YYYY-MM-DD (payment day clamped to month length)
  amountDue: number;
}

/**
 * The payment (charge) periods that should exist for a contract: the previous
 * `prevMonths` months + the current month + the next `nextMonths` months
 * (default → last 3 + current + next 1). Never earlier than the contract's
 * start month, never later than its end month (bitiş tarihi).
 *
 * Missing records are created from these so a past month with no record is
 * surfaced (as overdue/pending), never silently treated as "paid". Each charge
 * freezes the rent of its own month, so changing the rent later does not alter
 * past months' tahakkuk (yeni tutar sadece yeni aylara uygulanır).
 */
export function recentPaymentPeriods(
  contract: Contract,
  today = new Date(),
  prevMonths = 3,
  nextMonths = 1
): PaymentSeed[] {
  const startMonth = contract.startDate
    ? startOfMonth(parseISO(contract.startDate))
    : null;
  const endMonth = contract.endDate
    ? startOfMonth(parseISO(contract.endDate))
    : null;

  const out: PaymentSeed[] = [];
  for (let offset = -prevMonths; offset <= nextMonths; offset++) {
    const m = startOfMonth(addMonths(today, offset));
    if (startMonth && m < startMonth) continue; // before the contract began
    if (endMonth && m > endMonth) continue; // after the contract ended

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
export function recentPeriodCutoff(today = new Date(), prevMonths = 3): string {
  return format(startOfMonth(addMonths(today, -prevMonths)), 'yyyy-MM-dd');
}
