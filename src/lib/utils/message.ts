import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { Contract, MessageKind, Payment } from '@/types';
import { formatCurrency, formatShortDate } from './format';
import { remainingDebt } from './payments';

function location(contract: Contract): string {
  return [contract.propertyName, contract.block, contract.unit]
    .filter(Boolean)
    .join(' ');
}

/** Reminder sent to the TENANT before the rent due date. */
export function buildUpcomingMessage(contract: Contract, payment: Payment): string {
  return `Merhaba ${contract.tenantName},

${location(contract)} için kira ödeme gününüz yaklaşmaktadır.

Kira Tutarı: ${formatCurrency(contract.rentAmount + contract.duesAmount)}
Son Ödeme Tarihi: ${formatShortDate(payment.dueDate)}

Bilginize sunarız.`;
}

/** Reminder sent to the TENANT once rent is overdue. */
export function buildOverdueMessage(
  contract: Contract,
  payment: Payment,
  today = new Date()
): string {
  const overdueDays = Math.max(
    differenceInCalendarDays(today, parseISO(payment.dueDate)),
    0
  );
  return `Merhaba ${contract.tenantName},

${location(contract)} için kira ödemeniz gecikmiştir.

Güncel Borç: ${formatCurrency(remainingDebt(payment))}
Gecikme Süresi: ${overdueDays} gün

Ödemenizi en kısa sürede yapmanızı rica ederiz.`;
}

export function buildMessage(
  kind: MessageKind,
  contract: Contract,
  payment: Payment,
  today = new Date()
): string {
  return kind === 'overdue'
    ? buildOverdueMessage(contract, payment, today)
    : buildUpcomingMessage(contract, payment);
}
