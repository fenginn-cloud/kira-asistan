import { formatCurrency } from '@/lib/utils/format';
import { remainingDebt } from '@/lib/utils/payments';
import type { ReminderWithRefs } from './reminders';

/**
 * Notification title + body for a reminder. Tenant-focused, matching the
 * product spec. Shared by the web (service worker) and native implementations.
 */
export function reminderNotification(r: ReminderWithRefs): { title: string; body: string } {
  const loc = [r.contract.propertyName, r.contract.block, r.contract.unit]
    .filter(Boolean)
    .join(' ');
  const tutar = formatCurrency(r.contract.rentAmount + r.contract.duesAmount);
  const days = Math.abs(r.daysUntil);

  if (r.trigger === 'due_day') {
    return {
      title: 'Bugün kira ödeme günü',
      body: `${loc} için bugün kira ödeme gününüzdür. Tutar: ${tutar}.`,
    };
  }
  if (r.kind === 'upcoming') {
    return {
      title: 'Kira ödeme günü yaklaşıyor',
      body: `${loc} için kira ödeme gününüze ${days} gün kaldı. Tutar: ${tutar}.`,
    };
  }
  return {
    title: 'Kira ödemeniz gecikti',
    body: `${loc} için kira ödemeniz ${days} gün gecikmiştir. Güncel borç: ${formatCurrency(
      remainingDebt(r.payment)
    )}.`,
  };
}
