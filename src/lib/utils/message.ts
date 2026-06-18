import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { Contract, MessageKind, Payment } from '@/types';
import { formatCurrency, formatShortDate } from './format';
import { remainingDebt } from './payments';

function location(contract: Contract): string {
  return [contract.propertyName, contract.block, contract.unit]
    .filter(Boolean)
    .join(' ');
}

/** Reminder sent before the rent due date (distinct from the overdue one). */
export function buildUpcomingMessage(contract: Contract, payment: Payment): string {
  return `Merhaba ${contract.ownerName},

${location(contract)} için kira ödeme günü yaklaşmaktadır.

Kiracı: ${contract.tenantName}
Kira Tutarı: ${formatCurrency(contract.rentAmount + contract.duesAmount)}
Ödeme Günü: ${formatShortDate(payment.dueDate)}

Bilginize sunarız.`;
}

/** Reminder sent once rent is overdue — overdue days are computed live. */
export function buildOverdueMessage(
  contract: Contract,
  payment: Payment,
  today = new Date()
): string {
  const overdueDays = Math.max(
    differenceInCalendarDays(today, parseISO(payment.dueDate)),
    0
  );
  return `Merhaba ${contract.ownerName},

${location(contract)} için kira ödemesi gecikmiştir.

Kiracı: ${contract.tenantName}
Kira Tutarı: ${formatCurrency(contract.rentAmount + contract.duesAmount)}
Geciken Tutar: ${formatCurrency(remainingDebt(payment))}
Gecikme Süresi: ${overdueDays} gün

Bilginize sunarız.`;
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
