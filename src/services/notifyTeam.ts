import { supabase } from '@/lib/supabase/client';

/**
 * Bir kira "alındı" işaretlendiğinde şirketteki diğer kullanıcılara push
 * bildirimi gönderir (notify-team Edge Function). Bildirim gönderilemese bile
 * ana işlem (alındı kaydı) etkilenmesin diye hataları yutar.
 */
export async function notifyTeamPaymentReceived(
  contractId: string,
  note?: string | null
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.functions.invoke('notify-team', {
      body: { contractId, note: note ?? null },
    });
  } catch {
    // sessizce geç — bildirim opsiyonel
  }
}
