// Kira Asistan — RevenueCat Webhook
//
// RevenueCat abonelik olaylarını alır ve ilgili ŞİRKETİN entitlement alanlarını
// (companies.plan / subscription_status / current_period_end / billing_provider)
// günceller. Tek doğruluk kaynağı Supabase'dir; iOS/Android/web planı buradan
// okur.
//
// Eşleme: RevenueCat'te `app_user_id` = Supabase auth.uid (SDK: Purchases.logIn).
// Webhook geldiğinde app_user_id → profiles → company_id bulunur; entitlement
// ŞİRKET seviyesindedir.
//
// GÜVENLİK / DAVRANIŞ:
//  - Authorization header, REVENUECAT_WEBHOOK_SECRET ile doğrulanır.
//  - SANDBOX olayları, REVENUECAT_ACCEPT_SANDBOX=true olmadıkça UYGULANMAZ
//    (sandbox satın alması production kullanıcısına gerçek hak vermez).
//  - CANCELLATION: yalnızca otomatik yenileme kapanır; erişim current_period_end'e
//    kadar SÜRER. Süre GEÇMİŞSE (refund vb.) erişim hemen kapanır.
//  - EXPIRATION: dönem bitti → Free.
//  - BILLING_ISSUE: grace/geçerlilik süresi boyunca erişim korunur.
//  - Legacy şirketlere asla dokunulmaz.
//  - İdempotent: aynı olay birden çok gelse de sonuç değişmez.
//
// DEPLOY:
//   1. Supabase → Edge Functions → Deploy (bu dosya).
//   2. Supabase → Edge Functions → Secrets:
//        REVENUECAT_WEBHOOK_SECRET = <RC'ye gireceğin Authorization değeri>
//        REVENUECAT_ACCEPT_SANDBOX = 'true'  (yalnızca test aşamasında)
//   3. RevenueCat → Integrations → Webhooks:
//        URL: https://<proje-ref>.functions.supabase.co/revenuecat-webhook
//        Authorization: <REVENUECAT_WEBHOOK_SECRET ile aynı değer>
//   4. RevenueCat entitlement'ları: 'pro' ve 'business'.
//
// NOT: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY otomatik enjekte edilir.

import { createClient } from 'jsr:@supabase/supabase-js@2';

// RevenueCat entitlement identifier → uygulama planı.
const ENTITLEMENT_PLAN: Record<string, 'pro' | 'business'> = {
  pro: 'pro',
  business: 'business',
};

// Hakkı VEREN / SÜRDÜREN olaylar.
const GRANT_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'SUBSCRIPTION_EXTENDED',
  'NON_RENEWING_PURCHASE',
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isoOrNull(ms: unknown): string | null {
  return typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // 1) Authorization doğrulaması.
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

  // 2) SANDBOX ayrımı: test olayları yalnızca açıkça izin verilmişse uygulanır.
  const acceptSandbox = (Deno.env.get('REVENUECAT_ACCEPT_SANDBOX') ?? 'false') === 'true';
  const environment: string = event.environment ?? 'PRODUCTION';
  if (environment === 'SANDBOX' && !acceptSandbox) {
    return json({ ok: true, skipped: 'sandbox' });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 3) app_user_id (auth.uid) → şirket.
  const { data: profile } = await admin
    .from('profiles')
    .select('company_id')
    .eq('id', appUserId)
    .single();
  if (!profile) return json({ error: 'Profil bulunamadı.' }, 404);

  // 4) Entitlement → plan.
  const entitlementIds: string[] = event.entitlement_ids ?? [];
  const plan = entitlementIds.map((e) => ENTITLEMENT_PLAN[e]).find(Boolean) ?? null;

  // 5) Zaman/deneme bilgileri.
  const expMs: number | null =
    typeof event.expiration_at_ms === 'number' ? event.expiration_at_ms : null;
  const isFuture = expMs != null && expMs > Date.now();
  const isTrial = event.period_type === 'TRIAL';

  // 6) Olay → companies patch'i.
  let patch: Record<string, unknown> | null = null;

  if (GRANT_EVENTS.has(type) && plan) {
    patch = {
      plan,
      subscription_status: isTrial ? 'trialing' : 'active',
      current_period_end: isoOrNull(expMs),
      billing_provider: 'revenuecat',
    };
  } else if (type === 'CANCELLATION') {
    // Yalnızca otomatik yenileme kapandı. Süre GELECEKTEYSE erişim sürer;
    // GEÇMİŞSE (ör. refund) hemen Free'ye düşer.
    patch =
      plan && isFuture
        ? {
            plan,
            subscription_status: 'active',
            current_period_end: isoOrNull(expMs),
            billing_provider: 'revenuecat',
          }
        : { plan: 'free', subscription_status: 'canceled', current_period_end: isoOrNull(expMs) };
  } else if (type === 'EXPIRATION') {
    patch = { plan: 'free', subscription_status: 'canceled', current_period_end: isoOrNull(expMs) };
  } else if (type === 'BILLING_ISSUE') {
    // Grace period: RC'nin verdiği geçerlilik süresi boyunca erişimi koru.
    patch =
      plan && isFuture
        ? {
            plan,
            subscription_status: 'past_due',
            current_period_end: isoOrNull(expMs),
            billing_provider: 'revenuecat',
          }
        : { plan: 'free', subscription_status: 'past_due', current_period_end: isoOrNull(expMs) };
  }
  // TRANSFER / SUBSCRIPTION_PAUSED / TEST → şimdilik atla (idempotent no-op).

  if (!patch) return json({ ok: true, skipped: type });

  // 7) Legacy şirketleri ASLA düşürme/değiştirme.
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

  return json({ ok: true, applied: type, plan: patch.plan ?? null, environment });
});
