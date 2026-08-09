// Kira Asistan — create-user Edge Function
// Creates an auth user + profile in the caller's company. Requires the caller
// to be admin/super_admin. Uses the service role (server-side only).
//
// Deploy: Supabase Dashboard → Edge Functions → "Deploy a new function" →
// name it "create-user" → paste this file → Deploy. (No extra secrets needed;
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!jwt) return json({ error: 'Yetkisiz istek.' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Identify the caller from their JWT.
    const { data: callerAuth, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !callerAuth.user) return json({ error: 'Oturum geçersiz.' }, 401);

    const { data: caller, error: callerErr } = await admin
      .from('profiles')
      .select('company_id, role')
      .eq('id', callerAuth.user.id)
      .single();
    if (callerErr || !caller) return json({ error: 'Profil bulunamadı.' }, 403);
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      return json({ error: 'Bu işlem için yetkiniz yok.' }, 403);
    }

    // Seat limit (server-side backstop; mirrors resolveEntitlement).
    // Free/Pro = 1 user, Business = 5, legacy = unlimited. super_admin bypasses.
    if (caller.role !== 'super_admin') {
      const { data: company } = await admin
        .from('companies')
        .select('plan, is_legacy, subscription_status')
        .eq('id', caller.company_id)
        .single();

      let maxUsers: number | null = 1;
      if (company?.is_legacy) {
        maxUsers = null; // unlimited (grandfathered)
      } else if (
        (company?.subscription_status === 'active' ||
          company?.subscription_status === 'trialing') &&
        company?.plan === 'business'
      ) {
        maxUsers = 5;
      }

      if (maxUsers !== null) {
        const { count } = await admin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', caller.company_id);
        if ((count ?? 0) >= maxUsers) {
          return json(
            {
              error:
                maxUsers === 1
                  ? 'Ekip yönetimi Business planına dahildir.'
                  : `Planınız ${maxUsers} kullanıcı içerir. Daha fazlası için yükseltin.`,
            },
            403,
          );
        }
      }
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const fullName = String(body.fullName ?? '').trim();
    let role = String(body.role ?? 'personnel');

    if (!email || !password || !fullName) {
      return json({ error: 'E-posta, şifre ve ad soyad zorunludur.' }, 400);
    }
    if (password.length < 6) return json({ error: 'Şifre en az 6 karakter olmalı.' }, 400);

    const allowed = ['admin', 'personnel', ...(caller.role === 'super_admin' ? ['super_admin'] : [])];
    if (!allowed.includes(role)) role = 'personnel';

    // 1) Create the auth user (email pre-confirmed).
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? 'Kullanıcı oluşturulamadı.' }, 400);
    }

    // 2) Insert the profile in the caller's company.
    const { error: insErr } = await admin.from('profiles').insert({
      id: created.user.id,
      company_id: caller.company_id,
      email,
      full_name: fullName,
      role,
      is_active: true,
    });
    if (insErr) {
      // Roll back the auth user if the profile insert fails.
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: insErr.message }, 400);
    }

    await admin.from('notification_preferences').insert({ user_id: created.user.id });

    return json({ id: created.user.id, email, fullName, role, companyId: caller.company_id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Sunucu hatası.' }, 500);
  }
});
