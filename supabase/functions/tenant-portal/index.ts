// Kira Asistan — tenant-portal Edge Function (PUBLIC, giriş gerektirmez)
// Kiracının özel linki (/k/<token>) bu fonksiyonu çağırır.
//   action 'view'  → sözleşmenin GÜVENLİ özetini döndürür (sahip bilgisi yok)
//   action 'claim' → kiracının "ödedim" bildirimini (onay bekleyen) kaydeder
//
// Güvenlik:
//   - Yalnızca geçerli token'la eşleşen TEK sözleşmenin verisi döner.
//   - Mülk sahibi telefonu / TC / diğer sözleşmeler ASLA dönmez.
//   - Kiracı veritabanını değiştiremez; sadece "pending" bildirim oluşturur,
//     mülk sahibi onaylayınca cari hesaba işlenir.
//
// Deploy: Edge Functions → Deploy a new function → ad: "tenant-portal" →
//         bu dosyayı yapıştır → Deploy. "Verify JWT" KAPALI olmalı (public).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

const tl = (n: number) =>
  (n < 0 ? '-' : '') +
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Math.abs(Math.round(n))) + ' ₺';
const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const label = (period: string) => { const [y,m]=period.split('-'); return `${MONTHS[Number(m)-1]} ${y}`; };
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function statusLabel(due: number, paid: number, dueDate: string, today: string): string {
  if (due <= 0) return paid > 0 ? 'Fazla Ödeme' : 'Ödendi';
  if (paid > due) return 'Fazla Ödeme';
  if (paid >= due) return 'Ödendi';
  const overdue = dueDate < today;
  if (paid > 0) return overdue ? 'Gecikmiş' : 'Kısmi Ödendi';
  return overdue ? 'Gecikmiş' : 'Bekliyor';
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'view');
    const token = String(body.token ?? '').trim();
    if (!token) return json({ error: 'Geçersiz bağlantı' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: contract } = await admin
      .from('contracts')
      .select('id, company_id, property_name, block, unit, tenant_name, rent_amount, dues_amount, payment_day, status')
      .eq('public_token', token)
      .maybeSingle();
    if (!contract) return json({ error: 'Bağlantı bulunamadı' }, 404);

    const { data: company } = await admin
      .from('companies').select('name').eq('id', contract.company_id).maybeSingle();

    const { data: payments } = await admin
      .from('payments')
      .select('period_month, due_date, amount_due, amount_paid')
      .eq('contract_id', contract.id)
      .order('period_month', { ascending: false });

    const today = new Date().toISOString().slice(0, 10);
    const curKey = today.slice(0, 7);

    if (action === 'claim') {
      const amount = num(body.amount);
      const periodMonth = String(body.period_month ?? '').slice(0, 10);
      if (amount <= 0) return json({ error: 'Geçerli bir tutar girin' }, 400);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(periodMonth)) return json({ error: 'Geçersiz ay' }, 400);

      let receiptUrl: string | null = null;
      if (body.receipt_base64) {
        try {
          const bytes = base64ToBytes(String(body.receipt_base64));
          if (bytes.length > 6 * 1024 * 1024) return json({ error: 'Dosya çok büyük (max 6MB)' }, 400);
          const name = String(body.receipt_name ?? `dekont_${Date.now()}`).replace(/[^\w.\-]+/g, '_');
          const path = `${contract.company_id}/claims/${contract.id}/${Date.now()}_${name}`;
          const { error: upErr } = await admin.storage
            .from('contracts')
            .upload(path, bytes, { contentType: String(body.receipt_mime ?? 'image/jpeg'), upsert: true });
          if (!upErr) receiptUrl = path;
        } catch (_e) {
          // receipt is optional — ignore upload failure
        }
      }

      const { error: insErr } = await admin.from('tenant_payment_claims').insert({
        contract_id: contract.id,
        period_month: periodMonth,
        amount,
        note: body.note ? String(body.note).slice(0, 500) : null,
        receipt_url: receiptUrl,
        status: 'pending',
      });
      if (insErr) return json({ error: 'Bildirim kaydedilemedi' }, 500);
      return json({ ok: true });
    }

    // action 'view'
    let total = 0;
    let curDue = 0, curPaid = 0, curDueDate = '';
    const rows = (payments ?? []).map((p) => {
      const isFuture = p.period_month.slice(0, 7) > curKey;
      const due = num(p.amount_due);
      const paid = num(p.amount_paid);
      total += paid - (isFuture ? 0 : due);
      if (p.period_month.slice(0, 7) === curKey) { curDue = due; curPaid = paid; curDueDate = p.due_date; }
      return {
        period_month: p.period_month,
        label: label(p.period_month),
        due: tl(due),
        paid: tl(paid),
        remaining: Math.max(due - paid, 0),
        remaining_text: tl(Math.max(due - paid, 0)),
        status: statusLabel(due, paid, p.due_date, today),
      };
    });
    if (curDue === 0) { curDue = num(contract.rent_amount) + num(contract.dues_amount); }

    return json({
      ok: true,
      company_name: company?.name ?? 'Kira Asistan',
      property_name: contract.property_name,
      location: [contract.block, contract.unit].filter(Boolean).join(' / '),
      tenant_name: contract.tenant_name,
      monthly_rent_text: tl(num(contract.rent_amount) + num(contract.dues_amount)),
      current_month: {
        period_month: `${curKey}-01`,
        label: label(`${curKey}-01`),
        due_text: tl(curDue),
        paid_text: tl(curPaid),
        remaining: Math.max(curDue - curPaid, 0),
        remaining_text: tl(Math.max(curDue - curPaid, 0)),
      },
      total_balance: total,
      total_balance_text: tl(total),
      rows,
    });
  } catch (e) {
    console.error('tenant-portal error:', e);
    return json({ error: 'Beklenmeyen hata' }, 500);
  }
});
