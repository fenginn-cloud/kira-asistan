// Kira Asistan — tenant-form Edge Function (PUBLIC, giriş gerektirmez)
// Kiracının özel linki (/form/<token>) bu fonksiyonu çağırır.
//   action 'view'    → formun doldurulması için gereken MİNİMUM veriyi döndürür
//                      (durum, son geçerlilik, ön-dolgu ad/telefon/mülk).
//   action 'submit'  → kiracının doldurduğu 8 adımı kaydeder, status='completed'.
//
// Güvenlik:
//   - Yalnızca geçerli token'la eşleşen TEK form açılır.
//   - Şirketin diğer formları / verileri ASLA dönmez.
//   - Danışman değerlendirmesi (tenant_form_reviews) public tarafa DAHİL EDİLMEZ.
//   - Süresi dolmuş form gönderilemez; bir kez gönderilen form tekrar gönderilemez.
//   - Belgeler service-role ile güvenli path'e yüklenir; client'a anahtar sızmaz.
//
// Deploy: Edge Functions → Deploy → ad: "tenant-form" → bu dosyayı yapıştır →
//         Deploy. "Verify JWT" KAPALI olmalı (public).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const isExpired = (expiresAt: string | null): boolean =>
  !!expiresAt && new Date(expiresAt).getTime() < Date.now();

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

    const { data: form } = await admin
      .from('tenant_forms')
      .select('id, company_id, contract_id, status, expires_at, submitted_at, tenant_name, tenant_phone, tenant_email')
      .eq('token', token)
      .maybeSingle();
    if (!form) return json({ error: 'Form bulunamadı' }, 404);

    // Şirket adı (marka başlığı için) — tek alan.
    const { data: company } = await admin
      .from('companies').select('name').eq('id', form.company_id).maybeSingle();

    // Bağlı sözleşme varsa mülk bilgisi (Adım 7 ön-dolgu) — sahip verisi YOK.
    let property: { name: string; location: string; rent_amount: number; payment_day: number } | null = null;
    if (form.contract_id) {
      const { data: c } = await admin
        .from('contracts')
        .select('property_name, block, unit, rent_amount, dues_amount, payment_day')
        .eq('id', form.contract_id)
        .maybeSingle();
      if (c) {
        property = {
          name: c.property_name,
          location: [c.block, c.unit].filter(Boolean).join(' / '),
          rent_amount: Number(c.rent_amount ?? 0) + Number(c.dues_amount ?? 0),
          payment_day: Number(c.payment_day ?? 0),
        };
      }
    }

    const expired = form.status === 'expired' || isExpired(form.expires_at);
    const submitted = !!form.submitted_at || form.status === 'completed' || form.status === 'reviewed';

    if (action === 'view') {
      return json({
        ok: true,
        company_name: company?.name ?? 'Kira Asistan',
        status: expired ? 'expired' : submitted ? 'submitted' : 'open',
        expires_at: form.expires_at,
        prefill: {
          tenant_name: form.tenant_name ?? '',
          tenant_phone: form.tenant_phone ?? '',
          tenant_email: form.tenant_email ?? '',
        },
        property,
      });
    }

    if (action === 'submit') {
      if (expired) return json({ error: 'Bu formun süresi dolmuş.' }, 410);
      if (submitted) return json({ error: 'Bu form zaten gönderilmiş.' }, 409);

      const responses = body.responses && typeof body.responses === 'object' ? body.responses : {};

      // Belgeler (opsiyonel, base64 dizisi) — service-role ile güvenli path'e yükle.
      const docs: { document_type: string; file_name: string; storage_path: string }[] = [];
      const incoming = Array.isArray(body.documents) ? body.documents : [];
      for (const d of incoming.slice(0, 8)) {
        try {
          if (!d?.base64) continue;
          const bytes = base64ToBytes(String(d.base64));
          if (bytes.length > 8 * 1024 * 1024) continue; // 8MB üstü atla
          const safe = String(d.name ?? `belge_${Date.now()}`).replace(/[^\w.\-]+/g, '_');
          const path = `${form.company_id}/forms/${form.id}/${Date.now()}_${safe}`;
          const { error: upErr } = await admin.storage
            .from('contracts')
            .upload(path, bytes, { contentType: String(d.mime ?? 'application/octet-stream'), upsert: true });
          if (!upErr) {
            docs.push({
              document_type: String(d.document_type ?? 'other'),
              file_name: safe,
              storage_path: path,
            });
          }
        } catch (_e) {
          // belge opsiyonel — hatayı yut
        }
      }

      // Başlık alanlarını cevaptaki kişisel bilgiden tazele (liste ekranı için).
      const personal = (responses as Record<string, unknown>).personal as Record<string, unknown> | undefined;
      const tName = personal?.fullName ? String(personal.fullName).slice(0, 200) : form.tenant_name;
      const tPhone = personal?.phone ? String(personal.phone).slice(0, 40) : form.tenant_phone;
      const tEmail = personal?.email ? String(personal.email).slice(0, 200) : form.tenant_email;

      const { error: updErr } = await admin
        .from('tenant_forms')
        .update({
          responses,
          status: 'completed',
          submitted_at: new Date().toISOString(),
          tenant_name: tName,
          tenant_phone: tPhone,
          tenant_email: tEmail,
        })
        .eq('id', form.id);
      if (updErr) return json({ error: 'Form kaydedilemedi' }, 500);

      if (docs.length > 0) {
        await admin.from('tenant_form_documents').insert(
          docs.map((d) => ({ form_id: form.id, ...d }))
        );
      }

      return json({ ok: true });
    }

    return json({ error: 'Bilinmeyen işlem' }, 400);
  } catch (e) {
    console.error('tenant-form error:', e);
    return json({ error: 'Beklenmeyen hata' }, 500);
  }
});
