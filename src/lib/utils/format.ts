import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

/** Format a number as Turkish Lira: 22500 -> "22.500 ₺" */
export function formatCurrency(amount: number): string {
  return (
    new Intl.NumberFormat('tr-TR', {
      maximumFractionDigits: 0,
    }).format(amount) + ' ₺'
  );
}

/** "17 Haziran 2026" */
export function formatDate(iso: string): string {
  return format(parseISO(iso), 'd MMMM yyyy', { locale: tr });
}

/** "17.06.2026" */
export function formatShortDate(iso: string): string {
  return format(parseISO(iso), 'dd.MM.yyyy', { locale: tr });
}

/** "Haziran 2026" */
export function formatMonth(iso: string): string {
  return format(parseISO(iso), 'MMMM yyyy', { locale: tr });
}

/** "17.06.2026 10:42" */
export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: tr });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
