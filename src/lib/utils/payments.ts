import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { Payment, PaymentStatus } from '@/types';

/** Remaining debt for a payment period. */
export function remainingDebt(payment: Payment): number {
  return Math.max(payment.amountDue - payment.amountPaid, 0);
}

/**
 * Derive the live status of a payment from amounts + due date.
 * Stored status can drift; this is the source of truth for the UI.
 */
export function derivePaymentStatus(payment: Payment, today = new Date()): PaymentStatus {
  const remaining = remainingDebt(payment);
  if (remaining <= 0) return 'paid';

  const due = parseISO(payment.dueDate);
  const overdue = differenceInCalendarDays(today, due) > 0;

  if (payment.amountPaid > 0) return overdue ? 'overdue' : 'partial';
  return overdue ? 'overdue' : 'pending';
}

/** Positive = days remaining, negative = days overdue. */
export function daysUntilDue(payment: Payment, today = new Date()): number {
  return differenceInCalendarDays(parseISO(payment.dueDate), today);
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: 'Ödendi',
  partial: 'Kısmi Ödendi',
  pending: 'Bekliyor',
  overdue: 'Gecikti',
};

export const CONTRACT_STATUS_LABEL = {
  active: 'Aktif',
  passive: 'Pasif',
  terminated: 'Sonlandırıldı',
} as const;
