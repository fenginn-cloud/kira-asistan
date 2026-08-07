import type * as XLSX from 'xlsx';
import type { Contract } from '@/types';
import { extractWorkbook } from './extract';
import { buildPlan } from './match';
import type { ImportPlan } from './types';

export * from './types';
export { extractWorkbook } from './extract';
export { buildPlan } from './match';

/**
 * Bir Excel çalışma kitabını mevcut sözleşmelerle karşılaştırıp senkron planı üretir.
 * Silme YOK; boş hücre mevcut veriyi ezmez; ödeme geçmişi korunur (UPDATE by id).
 */
export function analyzeWorkbook(
  wb: XLSX.WorkBook,
  existing: Contract[],
  opts: { year?: number } = {}
): ImportPlan {
  return buildPlan(extractWorkbook(wb, opts), existing);
}
