// Kira Asistan — notify-team Edge Function
// Bir kullanıcı bir kirayı "Alındı" işaretlediğinde, aynı şirketteki DİĞER
// kullanıcılara Web Push bildirimi gönderir.
//
// Frontend çağrısı:
//   supabase.functions.invoke('notify-team', { body: { contractId, note } })
//
// Deploy: Edge Functions → Deploy a new function → ad: "notify-team" →
//   bu dosyayı yapıştır → Deploy. "Verify JWT" AÇIK kalsın (giriş gerekli).
// Secret: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (send-reminders ile aynı).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ error: 'Oturum yok' }, 401);

    const { contractId, note } = await req.json().catch(() => ({}));
    if (!contractId) return json({ error: 'contractId gerekli' }, 400);

    // Çağıran kimliği + RLS-güvenli okuma
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: userData } = await supa.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return json({ error: 'Geçersiz oturum' }, 401);

    const { data: me } = await supa
      .from('profiles')
      .select('company_id, full_name')
      .eq('id', uid)
      .single();
    if (!me?.company_id) return json({ error: 'Şirket yok' }, 403);

    const { data: c } = await supa
      .from('contracts')
      .select('property_name, block, unit, tenant_name')
      .eq('id', contractId)
      .maybeSingle();
    if (!c) return json({ error: 'Sözleşme bulunamadı' }, 404);

    // Diğer üyeler + abonelikleri (başkalarının aboneliklerini okumak için service role)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );
    const { data: members } = await admin
      .from('profiles')
      .select('id')
      .eq('company_id', me.company_id)
      .eq('is_active', true)
      .neq('id', uid);
    const ids = (members ?? []).map((m) => m.id);
    if (ids.length === 0) return json({ ok: true, sent: 0 });

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', ids);
    if (!subs || subs.length === 0) return json({ ok: true, sent: 0 });

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') || 'mailto:info@kiraasistan.com',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    );

    const loc = [c.property_name, c.block, c.unit].filter(Boolean).join(' ');
    const title = 'Kira alındı ✓';
    const body =
      `${me.full_name}, ${loc} (${c.tenant_name}) kirasını "alındı" işaretledi.` +
      (note ? ` Not: ${String(note).slice(0, 140)}` : '');
    const payload = JSON.stringify({ title, body, data: { url: `/contracts/${contractId}` } });

    let sent = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      }
    }
    return json({ ok: true, sent });
  } catch (e) {
    console.error('notify-team error:', e);
    return json({ error: 'Beklenmeyen hata' }, 500);
  }
});
