/**
 * Extract a human-readable message from any thrown value — Error instances,
 * Supabase/PostgREST error objects ({ message, details, hint, code }), strings.
 */
export function errorMessage(e: unknown, fallback = 'Bir hata oluştu'): string {
  if (!e) return fallback;
  if (typeof e === 'string') return e;
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'object') {
    const o = e as Record<string, unknown>;
    const msg =
      (o.message as string) ||
      (o.error_description as string) ||
      (o.error as string) ||
      (o.details as string) ||
      (o.hint as string);
    if (msg) return msg;
  }
  return fallback;
}
