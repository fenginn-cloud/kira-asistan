import type { Contract } from '@/types';

/**
 * Excel'den çıkarılan tek bir sözleşme satırı (ham → normalize edilmiş).
 * Alanlar `null` ise "Excel'de bu bilgi yok" demektir; senkronda mevcut veriyi
 * SİLMEZ (yalnızca dolu alanlar güncellenir).
 */
export interface ExtractedContract {
  /** Kaynak izi (hangi sayfa/satır) — log ve "incelenecek" için. */
  source: { sheet: string; row: number };

  propertyName: string | null;
  block: string | null;
  unit: string | null;

  tenantName: string | null;
  tenantPhone: string | null; // +90 ... normalize
  rentAmount: number | null;
  depositAmount: number | null;
  commissionAmount: number | null;
  startDate: string | null; // ISO
  endDate: string | null; // ISO
  paymentDay: number | null;
  notes: string | null;

  /** Aylık ödendi/ödenmedi (renk-duyarlı). period_month ISO (ayın 1'i) → durum. */
  months: { periodMonth: string; amountDue: number; paid: boolean }[];

  /** Bu satır boş daire/placeholder mı (kiracı yok → atlanır). */
  vacant: boolean;
}

export type MatchReason =
  | 'unit' // propertyName+block+unit ile birebir
  | 'tenant+property' // kiracı adı + mülk ile
  | 'phone'; // telefon ile

export type ReviewReason =
  | 'no-tenant'
  | 'ambiguous-match' // birden fazla aday
  | 'missing-property'
  | 'bad-phone'
  | 'bad-date'
  | 'missing-required';

/** Tek bir alandaki değişiklik (önizleme + log). */
export interface FieldChange {
  field: string; // 'rentAmount' | 'tenantPhone' | ...
  label: string; // 'Kira Bedeli'
  from: unknown;
  to: unknown;
}

export interface DiffRow {
  kind: 'new' | 'update' | 'unchanged' | 'review';
  extracted: ExtractedContract;
  /** Eşleşen mevcut sözleşme (update/unchanged için). */
  matchedId?: string;
  matchReason?: MatchReason;
  /** update için değişen alanlar. */
  changes?: FieldChange[];
  /** review için sebep(ler). */
  reviewReasons?: ReviewReason[];
  reviewDetail?: string;
}

export interface ImportPlan {
  rows: DiffRow[];
  summary: {
    total: number;
    new: number;
    update: number;
    unchanged: number;
    review: number;
  };
  /** Excel'de bulunmayan mevcut sözleşmeler (SİLİNMEZ, sadece raporlanır). */
  notInExcel: { id: string; label: string }[];
}

export interface AnalyzeInput {
  /** Mevcut sistemdeki sözleşmeler (aynı şirket). */
  existing: Contract[];
}
