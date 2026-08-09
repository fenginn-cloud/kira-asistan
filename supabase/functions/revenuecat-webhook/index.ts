// Kira Asistan — RevenueCat Webhook (İSKELET / go-live için hazır)
//
// RevenueCat abonelik olaylarını alır ve ilgili ŞİRKETİN entitlement alanlarını
// (companies.plan / subscription_status / current_period_end) günceller.
//
// Eşleme mantığı: RevenueCat'te `app_user_id` olarak Supabase auth.uid() gönderilir
// (SDK: Purchases.logIn(session.user.id)). Webhook geldiğinde app_user_id → profiles
// → company_id bulunur ve o şirket güncellenir. Entitlement ŞİRKET seviyesindedir.
//
// DEPLOY (para/hesap gelince):
//   1. RevenueCat Dashboard → Project → Integrations → Webhooks → URL:
//        https://<proje-ref>.functions.supabase.co/revenuecat-webhook
//   2. Authorization header değeri belirle ve RevenueCat'e gir; aynı değeri
//      Supabase → Edge Functions → Secrets içine REVENUECAT_WEBHOOK_SECRET olarak ekle.
//   3. Bu fonksiyonu deploy et: Supabase Dashboard → Edge Functions → Deploy.
//   4. RevenueCat Products/Entitlements'ı PRODUCT_PLAN ile eşleştir (aşağıya bak).
//
// NOT: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY otomatik enjekte edilir.

import { createClient } from 'jsr:@supabase/supabase-js@2';

// RevenueCat entitlement identifier'ı → uygulama planı.
// RevenueCat'te "pro" ve "business" adında iki entitlement tanımla.
const ENTITLEMENT_PLAN: Record<string, 'pro' | 'business'> = {
  pro: 'pro',
  business: 'business',
};

// Aboneliği "aktif" sayan olay tipleri ve iptal/expire olanlar.
const ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'SUBSCRIPTION_EXTENDED',
]);
const INACTIVE_EVENTS = new Set(['EXPIRATION', 'CANCELLATION', 'BILLING_ISSUE']);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Basit doğrulama: RevenueCat'e girdiğin Authorization header değeriyle karşılaştır.
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (secret) {
    const auth = req.headers.get('Authorization') ?? '';
    if (auth !== secret && auth !== `Bearer ${secret}`) {
      return json({ error: 'Yetkisiz.' }, 401);
    }
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Geçersiz gövde.' }, 400);
  }

  const event = payload?.event ?? {};
  const type: string = event.type ?? '';
  const appUserId: string | undefined = event.app_user_id;
  if (!appUserId) return json({ error: 'app_user_id yok.' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // app_user_id (auth.uid) → şirket.
  const { data: profile } = await admin
    .from('profiles')
    .select('company_id')
    .eq('id', appUserId)
    .single();
  if (!profile) return json({ error: 'Profil bulunamadı.' }, 404);

  // Entitlement → plan.
  const entitlementIds: string[] = event.entitlement_ids ?? [];
  const plan =
    entitlementIds.map((e) => ENTITLEMENT_PLAN[e]).find(Boolean) ?? null;

  let patch: Record<string, unknown> | null = null;

  if (ACTIVE_EVENTS.has(type) && plan) {
    patch = {
      plan,
      subscription_status: 'active',
      current_period_end: event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null,
      billing_provider: 'revenuecat',
    };
  } else if (INACTIVE_EVENTS.has(type)) {
    // Süresi dolan/iptal edilen abonelik → Free'ye düş (legacy'ye DOKUNMA).
    patch = { plan: 'free', subscription_status: 'canceled' };
  }

  if (!patch) return json({ ok: true, skipped: type });

  // Legacy şirketleri asla düşürme.
  const { data: company } = await admin
    .from('companies')
    .select('is_legacy')
    .eq('id', profile.company_id)
    .single();
  if (company?.is_legacy) return json({ ok: true, skipped: 'legacy' });

  const { error } = await admin
    .from('companies')
    .update(patch)
    .eq('id', profile.company_id);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, applied: type, plan: patch.plan });
});
