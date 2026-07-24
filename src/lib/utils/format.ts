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

/** Türkçe iyelik ekiyle ödeme günü: 20 -> "Her ayın 20'si" */
export function paymentDayLabel(day: number): string {
  const suffixByLastDigit: Record<string, string> = {
    '1': "'i", '2': "'si", '3': "'ü", '4': "'ü", '5': "'i",
    '6': "'sı", '7': "'si", '8': "'i", '9': "'u", '0': "'ı",
  };
  const special: Record<number, string> = { 10: "'u", 20: "'si", 30: "'u" };
  const suffix = special[day] ?? suffixByLastDigit[String(day).slice(-1)] ?? "'i";
  return `Her ayın ${day}${suffix}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
