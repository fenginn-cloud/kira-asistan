import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { AIResponse } from '@/utils/aiSchemas';

/** AI özelliği yalnızca canlı (Supabase) modda çalışır. */
export const isAIAvailable = isSupabaseConfigured;

/**
 * Doğal dil sorusunu ai-assistant Edge Function'a gönderir.
 * API anahtarı SADECE sunucuda; frontend yalnızca bu endpoint'i çağırır.
 */
export async function askAssistant(message: string): Promise<AIResponse> {
  if (!supabase) {
    throw new Error('AI asistan yalnızca canlı modda kullanılabilir.');
  }

  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { message },
  });

  if (error) {
    // Edge Function hatalarının detayı response body'sinde döner.
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const parsed = await ctx.json();
        if (parsed?.error) msg = parsed.error;
      }
    } catch {
      // ignore
    }
    throw new Error(msg || 'AI asistana ulaşılamadı.');
  }

  if (data?.error) throw new Error(data.error);
  return data as AIResponse;
}
