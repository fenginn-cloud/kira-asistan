import { addMonths, format, startOfMonth } from 'date-fns';

/**
 * Ödeme geçmişi listesinde gösterilecek en eski dönem (`prevMonths` ay önce).
 * Not: Tahakkuk kuralları artık `@/lib/ledger/accrual` içindedir; bu dosya
 * veritabanına satır üretmez.
 */
export function recentPeriodCutoff(today = new Date(), prevMonths = 3): string {
  return format(startOfMonth(addMonths(today, -prevMonths)), 'yyyy-MM-dd');
}
