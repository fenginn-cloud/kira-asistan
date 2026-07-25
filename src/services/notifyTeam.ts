import { supabase } from '@/lib/supabase/client';

export interface NotifyResult {
  ok: boolean;
  /** Kaç cihaza bildirim gitti. */
  sent: number;
  /** Hata varsa kısa açıklama. */
  error?: string;
}

/**
 * Bir kira "alındı" işaretlendiğinde şirketteki diğer kullanıcılara push
 * bildirimi gönderir (notify-team Edge Function). Ana işlemi (alındı kaydı)
 * bloklamaz; sonucu döndürür ki UI gerekirse bilgi verebilsin.
 */
export async function notifyTeamPaymentReceived(
  contractId: string,
  note?: string | null
): Promise<NotifyResult> {
  if (!supabase) return { ok: false, sent: 0, error: 'Bağlantı yok' };
  try {
    const { data, error } = await supabase.functions.invoke('notify-team', {
      body: { contractId, note: note ?? null },
    });
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
      return { ok: false, sent: 0, error: msg || 'Bildirim gönderilemedi' };
    }
    return { ok: true, sent: Number(data?.sent ?? 0) };
  } catch (e) {
    return { ok: false, sent: 0, error: e instanceof Error ? e.message : 'Bilinmeyen hata' };
  }
}
