import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase/client';

export interface PortalRow {
  period_month: string;
  label: string;
  due: string;
  paid: string;
  remaining: number;
  remaining_text: string;
  status: string;
}

export interface PortalView {
  company_name: string;
  property_name: string;
  location: string;
  tenant_name: string;
  monthly_rent_text: string;
  current_month: {
    period_month: string;
    label: string;
    due_text: string;
    paid_text: string;
    remaining: number;
    remaining_text: string;
  };
  total_balance: number;
  total_balance_text: string;
  rows: PortalRow[];
}

export interface ClaimInput {
  token: string;
  periodMonth: string;
  amount: number;
  note?: string;
  receiptBase64?: string | null;
  receiptName?: string | null;
  receiptMime?: string | null;
}

async function invoke(body: Record<string, unknown>) {
  if (!supabase) throw new Error('Bağlantı yapılandırılmamış.');
  const { data, error } = await supabase.functions.invoke('tenant-portal', { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const parsed = await ctx.json();
        if (parsed?.error) msg = parsed.error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg || 'İşlem başarısız.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function fetchPortal(token: string): Promise<PortalView> {
  return invoke({ action: 'view', token });
}

export function submitClaim(input: ClaimInput): Promise<{ ok: true }> {
  return invoke({
    action: 'claim',
    token: input.token,
    period_month: input.periodMonth,
    amount: input.amount,
    note: input.note ?? null,
    receipt_base64: input.receiptBase64 ?? null,
    receipt_name: input.receiptName ?? null,
    receipt_mime: input.receiptMime ?? null,
  });
}

/** Build the tenant link for sharing (web uses current origin). */
export function tenantLinkFor(token: string): string {
  const base =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : 'https://kiraasist.fngn.com.tr';
  return `${base}/k/${token}`;
}
