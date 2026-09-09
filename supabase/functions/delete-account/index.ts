// Kira Asistan — delete-account Edge Function
// Permanently deletes the CALLER's account and their data (self-service).
// - If the caller is the only member of their company, the whole company and
//   all its data (contracts, payments, units, documents) are deleted.
// - If the company has other members, only the caller's own account/profile is
//   removed; the company and its shared data stay intact.
// Uses the service role (server-side only).
//
// Deploy: Supabase Dashboard → Edge Functions → "Deploy a new function" →
// name it "delete-account" → paste this file → Deploy. (SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

const BUCKET = 'contracts';

/** Best-effort: remove every storage object under the company's folder. */
async function purgeCompanyStorage(
  admin: ReturnType<typeof createClient>,
  companyId: string
) {
  try {
    const paths: string[] = [];
    const { data: top } = await admin.storage.from(BUCKET).list(companyId, { limit: 1000 });
    for (const entry of top ?? []) {
      // Files at the company root (rare) vs. subfolders (contractId / receipts).
      if (entry.id) {
        paths.push(`${companyId}/${entry.name}`);
        continue;
      }
      const sub = `${companyId}/${entry.name}`;
      const { data: files } = await admin.storage.from(BUCKET).list(sub, { limit: 1000 });
      for (const f of files ?? []) paths.push(`${sub}/${f.name}`);
    }
    if (paths.length) await admin.storage.from(BUCKET).remove(paths);
  } catch (_) {
    // Storage cleanup is best-effort; never block account deletion on it.
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Yalnızca POST.' }, 405);

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!jwt) return json({ error: 'Yetkisiz istek.' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Identify the caller from their JWT.
    const { data: callerAuth, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !callerAuth.user) return json({ error: 'Oturum geçersiz.' }, 401);
    const userId = callerAuth.user.id;

    const { data: profile } = await admin
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (profile?.company_id) {
      const companyId = profile.company_id as string;
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId);

      if ((count ?? 1) <= 1) {
        // Sole member → wipe the company (cascades all data) + its storage.
        await purgeCompanyStorage(admin, companyId);
        const { error: delErr } = await admin.from('companies').delete().eq('id', companyId);
        if (delErr) return json({ error: 'Veriler silinemedi: ' + delErr.message }, 500);
      }
      // Multi-member: leave the company; only the auth user (and its profile via
      // ON DELETE CASCADE) is removed below.
    }

    // Delete the auth user last. Cascades: profiles, notification_preferences,
    // device_sessions (all reference auth.users / profiles on delete cascade).
    const { error: authDelErr } = await admin.auth.admin.deleteUser(userId);
    if (authDelErr) return json({ error: 'Hesap silinemedi: ' + authDelErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Beklenmeyen hata.' }, 500);
  }
});
