// Kira Asistan — seo-reminders Edge Function
//
// SEO sayfalarındaki (kira artış hesaplama) formdan e-posta bırakanlara, kira yenileme
// aylarında yasal artış oranıyla birlikte hatırlatma e-postası gönderir (Resend).
// Her yıl tekrarlar (yenileme ayı yıllık döner).
//
//   POST /functions/v1/seo-reminders           → günlük çalışma (x-cron-secret gerekli)
//   POST /functions/v1/seo-reminders?dry=1     → kimseye göndermeden kimlere gideceğini listeler
//   GET  /functions/v1/seo-reminders?u=<token> → abonelikten çık (e-postadaki link)
//
// Deploy: Dashboard → Edge Functions → "Deploy a new function" → adı "seo-reminders"
//   → bu dosyayı yapıştır → Deploy. "Verify JWT" KAPALI olmalı (link ve cron JWT'siz çağırır).
// Secrets (Edge Functions → Manage secrets):
//   RESEND_API_KEY   Resend → API Keys
//   RESEND_FROM      ör. "Kira Asistan <hatirlatma@kiraasist.fngn.com.tr>" (Resend'de doğrulanmış alan adı)
//   CRON_SECRET      send-reminders ile aynı olabilir
//
// Gönderim kuralı (her lead için):
//   hedef ay = renewal_month ile AYNI takvim ayına denk gelen, hem kayıt ayından hem
//   son hatırlatılan aydan SONRAKİ ilk ay. Bugün o aydaysak ve o ayın oranı sitede
//   yayınlandıysa (TÜİK her ayın 3'ü) gönderilir; oran ayın 10'una kadar gelmezse
//   oransız gönderilir. Ay geçtiyse (fonksiyon çalışmadıysa) o yıl atlanır.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SITE = 'https://kiraasist.fngn.com.tr';
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const AY_SLUG = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];
const MAX_PER_RUN = 90; // Resend ücretsiz plan: günde 100

const pad = (n: number) => String(n).padStart(2, '0');
const ym = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
const label = (k: string) => { const [y, m] = k.split('-').map(Number); return `${AYLAR[m - 1]} ${y}`; };
const pct = (n: number) => '%' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** renewal_month ile aynı takvim ayına denk gelen, `after`'dan büyük ilk YYYY-MM */
function nextTarget(renewal: string, after: string): string {
  const m = Number(renewal.slice(5, 7));
  let y = Number(after.slice(0, 4));
  let k = `${y}-${pad(m)}`;
  while (k <= after) { y++; k = `${y}-${pad(m)}`; }
  return k;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function emailHtml(target: string, rate: number | null, unsubUrl: string) {
  const [y, m] = target.split('-').map(Number);
  const utm = 'utm_source=email&utm_medium=kira-artis-hatirlatma';
  const calc = `${SITE}/kira-artis-hesaplama?${utm}`;
  const monthPage = `${SITE}/kira-artis-orani/${y}-${AY_SLUG[m - 1]}?${utm}`;
  const rateBlock = rate != null
    ? `<p style="margin:0 0 6px;color:#64748B;font-size:14px">${esc(label(target))} için yasal azami kira artış oranı</p>
       <p style="margin:0 0 16px;font-size:34px;font-weight:800;color:#1560E7">${pct(rate)}</p>
       <p style="margin:0 0 20px">Mevcut kiranızı girip yeni kiranızı saniyeler içinde hesaplayın:</p>
       <a href="${calc}" style="display:inline-block;background:#1560E7;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">Yeni kiramı hesapla</a>
       <p style="margin:12px 0 0;font-size:13px"><a href="${monthPage}" style="color:#1560E7">${esc(label(target))} oran tablosu →</a></p>`
    : `<p style="margin:0 0 20px">${esc(label(target))} ayının kira artış oranı henüz açıklanmadı. TÜİK açıkladığında hesaplayıcımız güncellenir:</p>
       <a href="${calc}" style="display:inline-block;background:#1560E7;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">Kira artışını hesapla</a>`;
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#F2F4F7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#0F172A">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<p style="font-weight:800;font-size:18px;margin:0 0 16px">Kira <span style="color:#1560E7">Asistan</span></p>
<div style="background:#fff;border:1px solid #E2E8F0;border-radius:20px;padding:24px">
<h1 style="font-size:21px;margin:0 0 12px">Kira artış zamanı geldi</h1>
<p style="margin:0 0 18px">Kira sözleşmeniz ${esc(AYLAR[m - 1])} ayında yenileniyor. Hatırlatmamızı istemiştiniz.</p>
${rateBlock}
</div>
<div style="background:#1560E7;color:#fff;border-radius:20px;padding:20px;margin-top:16px">
<p style="font-weight:800;font-size:17px;margin:0 0 6px">Kiracılarını ücretsiz takip et</p>
<p style="margin:0 0 14px;opacity:.9;font-size:14px">Kira günleri, ödemeler ve artış tarihleri tek yerde; hatırlatmaları Kira Asistan yapsın.</p>
<a href="${SITE}/register?${utm}" style="display:inline-block;background:#fff;color:#1560E7;text-decoration:none;font-weight:700;padding:10px 20px;border-radius:999px">Kira Asistan'ı dene →</a>
</div>
<p style="font-size:12px;color:#64748B;margin:18px 4px 0;line-height:1.6">Bu e-postayı kiraasist.fngn.com.tr üzerinden kira artış hatırlatması istediğiniz için aldınız. Bilgilendirme amaçlıdır, hukuki danışmanlık yerine geçmez.<br><a href="${unsubUrl}" style="color:#64748B">Hatırlatmaları durdur</a></p>
</div></body></html>`;
}

function page(title: string, msg: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="margin:0;background:#F2F4F7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:16px">
<div style="background:#fff;border:1px solid #E2E8F0;border-radius:20px;padding:28px;max-width:420px;text-align:center">
<h1 style="font-size:20px;margin:0 0 8px">${title}</h1><p style="color:#475569;margin:0 0 18px">${msg}</p>
<a href="${SITE}/kira-artis-hesaplama" style="color:#1560E7;font-weight:700">Kira artış hesaplama →</a></div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // ---- Abonelikten çık (e-postadaki link) ----
  if (req.method === 'GET') {
    const token = url.searchParams.get('u') ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(token)) return page('Geçersiz bağlantı', 'Bağlantı hatalı veya eksik.', 400);
    const { data, error } = await admin
      .from('seo_leads')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('unsub_token', token)
      .is('unsubscribed_at', null)
      .select('id');
    if (error) return page('Bir sorun oluştu', 'Lütfen daha sonra tekrar deneyin.', 500);
    return page('Hatırlatmalar durduruldu', data?.length
      ? 'Artık kira artış hatırlatma e-postası almayacaksınız.'
      : 'Bu adres için hatırlatmalar zaten kapalı.');
  }

  // ---- Günlük gönderim ----
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  const dry = url.searchParams.get('dry') === '1';
  const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
  const FROM = Deno.env.get('RESEND_FROM');
  if (!dry && (!RESEND_KEY || !FROM)) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY / RESEND_FROM eksik' }), { status: 500 });
  }

  const now = new Date();
  const thisMonth = ym(now);
  const day = now.getUTCDate();

  let rates: Record<string, number | null> = {};
  try {
    const r = await fetch(`${SITE}/data/kira-artis-oranlari.json`, { headers: { 'cache-control': 'no-cache' } });
    if (r.ok) rates = (await r.json()).oranlar ?? {};
  } catch (_) { /* oran yoksa aşağıda oransız/bekle kuralı */ }
  const rate = typeof rates[thisMonth] === 'number' ? (rates[thisMonth] as number) : null;
  // Oran yayınlanmadıysa ayın 10'una kadar bekle (TÜİK her ayın 3'ünde açıklar).
  if (rate == null && day < 10) {
    return new Response(JSON.stringify({ ok: true, waiting: `${thisMonth} oranı henüz yok` }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: leads, error } = await admin
    .from('seo_leads')
    .select('id, email, renewal_month, created_at, last_reminded_month, unsub_token')
    .is('unsubscribed_at', null)
    .not('renewal_month', 'is', null)
    .like('renewal_month', `%-${thisMonth.slice(5)}`)
    .order('created_at', { ascending: true });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Aynı e-posta birden çok kez kayıt olduysa tek e-posta gider.
  const due = new Map<string, any[]>();
  for (const l of leads ?? []) {
    const created = ym(new Date(l.created_at));
    const after = l.last_reminded_month && l.last_reminded_month > created ? l.last_reminded_month : created;
    if (nextTarget(l.renewal_month, after) !== thisMonth) continue;
    const key = String(l.email).toLowerCase();
    (due.get(key) ?? due.set(key, []).get(key)!).push(l);
  }

  if (dry) {
    return new Response(JSON.stringify({ ok: true, dry: true, month: thisMonth, rate, recipients: due.size }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let sent = 0, failed = 0;
  const fnUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/seo-reminders`;
  for (const [email, rows] of due) {
    if (sent >= MAX_PER_RUN) break; // kalanlar ertesi gün gider
    const unsubUrl = `${fnUrl}?u=${rows[0].unsub_token}`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: rate != null
          ? `${label(thisMonth)} kira artış oranı ${pct(rate)} — yeni kiranı hesapla`
          : `${AYLAR[Number(thisMonth.slice(5)) - 1]} ayı kira artış zamanı`,
        html: emailHtml(thisMonth, rate, unsubUrl),
        headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
      }),
    });
    if (!res.ok) { failed++; continue; }
    sent++;
    await admin
      .from('seo_leads')
      .update({ last_reminded_month: thisMonth, last_reminded_at: new Date().toISOString() })
      .in('id', rows.map((r) => r.id));
  }

  return new Response(JSON.stringify({ ok: true, month: thisMonth, rate, due: due.size, sent, failed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
