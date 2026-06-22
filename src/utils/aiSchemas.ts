/**
 * AI Asistan cevap tipleri — ai-assistant Edge Function'ın döndürdüğü
 * Structured Output JSON'ı ile birebir eşleşir.
 */

export interface AISummaryCard {
  title: string;
  value: string;
}

export interface AIItem {
  tenant_name: string;
  property_name: string;
  /** Bakiye/borç gibi parasal değer (örn. "-12.500 ₺"). Boş olabilir. */
  amount: string;
  /** Durum etiketi (örn. "Borçlu", "Gecikmiş"). Boş olabilir. */
  status: string;
  /** Ek bilgi (örn. son ödeme tarihi, kalan gün). Boş olabilir. */
  note: string;
}

export type AIActionType =
  | 'CREATE_WHATSAPP_REMINDER'
  | 'VIEW_OVERDUE'
  | 'VIEW_CONTRACTS'
  | 'NONE';

export interface AISuggestedAction {
  label: string;
  type: AIActionType;
  /** İlgili kiracı (örn. WhatsApp önerisi için). Boş olabilir. */
  tenant_name: string;
}

export interface AIResponse {
  answer: string;
  summary_cards: AISummaryCard[];
  items: AIItem[];
  suggested_actions: AISuggestedAction[];
}

/** Quick-question chips shown on the empty AI screen. */
export const AI_QUICK_QUESTIONS: string[] = [
  'Kimler borçlu?',
  'Bu ay tahsilat durumum ne?',
  'Geciken kiralar',
  'Sözleşmesi bitenler',
  'En riskli kiracılar kimler?',
];
