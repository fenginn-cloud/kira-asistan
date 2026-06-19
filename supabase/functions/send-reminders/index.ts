// Kira Asistan — send-reminders Edge Function
// Runs daily (via cron). Finds contracts whose payment day is 7/3/1 days away,
// today, or 1/3/7 days overdue, and sends a Web Push to each company member who
// enabled that trigger. De-duplicated via notification_log so none repeats.
//
// Deploy: Dashboard → Edge Functions → "Deploy a new function" → name it
// "send-reminders" → paste this → Deploy. Turn OFF "Verify JWT" for it.
// Secrets to add (Edge Functions → Manage secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...), CRON_SECRET

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const TRIGGER_OFFSET: Record<string, number> = {
  before_7: 7,
  before_3: 3,
  before_1: 1,
  due_day: 0,
  overdue_1: -1,
  overdue_3: -3,
  overdue_7: -7,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n) + ' ₺';

function daysBetween(todayStr: string, dueStr: string): number {
  return Math.round(
    (Date.parse(dueStr + 'T00:00:00Z') - Date.parse(todayStr + 'T00:00:00Z')) / 86400000
  );
}

function buildMessage(trigger: string, c: any, pay: any, days: number) {
  const loc = [c.property_name, c.block, c.unit].filter(Boolean).join(' ');
  const tutar = fmt(Number(c.rent_amount) + Number(c.dues_amount));
  if (trigger === 'due_day') {
    return {
      title: 'Bugün kira ödeme günü',
      body: `${loc} için bugün kira ödeme gününüzdür. Tutar: ${tutar}.`,
    };
  }
  if (days > 0) {
    return {
      title: 'Kira ödeme günü yaklaşıyor',
      body: `${loc} için kira ödeme gününüze ${days} gün kaldı. Tutar: ${tutar}.`,
    };
  }
  const borc = fmt(Number(pay.amount_due) - Number(pay.amount_paid));
  return {
    title: 'Kira ödemeniz gecikti',
    body: `${loc} için kira ödemeniz ${Math.abs(days)} gün gecikmiştir. Güncel borç: ${borc}.`,
  };
}

Deno.serve(async (req) => {
  // Simple shared-secret gate (cron passes x-cron-secret).
  const secret = Deno.env.get('CRON_SECRET');
  if (secret && req.headers.get('x-cron-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') || 'mailto:info@kiraasistan.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  );

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: contracts }, { data: profiles }, { data: prefs }, { data: subs }] =
    await Promise.all([
      admin
        .from('contracts')
        .select(
          'id, company_id, property_name, block, unit, rent_amount, dues_amount, status'
        )
        .eq('status', 'active'),
      admin.from('profiles').select('id, company_id, is_active'),
      admin.from('notification_preferences').select('*'),
      admin.from('push_subscriptions').select('*'),
    ]);

  const ids = (contracts ?? []).map((c) => c.id);
  const { data: payments } = await admin
    .from('payments')
    .select('contract_id, period_month, due_date, amount_due, amount_paid')
    .in('contract_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);

  // open (unpaid) payment per contract, earliest due first
  const openByContract = new Map<string, any>();
  for (const p of payments ?? []) {
    if (Number(p.amount_due) - Number(p.amount_paid) <= 0) continue;
    const cur = openByContract.get(p.contract_id);
    if (!cur || p.due_date < cur.due_date) openByContract.set(p.contract_id, p);
  }

  const prefByUser = new Map<string, any>((prefs ?? []).map((p) => [p.user_id, p]));
  const subsByUser = new Map<string, any[]>();
  for (const s of subs ?? []) {
    (subsByUser.get(s.user_id) ?? subsByUser.set(s.user_id, []).get(s.user_id)!).push(s);
  }
  const usersByCompany = new Map<string, any[]>();
  for (const u of profiles ?? []) {
    if (!u.is_active) continue;
    (usersByCompany.get(u.company_id) ?? usersByCompany.set(u.company_id, []).get(u.company_id)!).push(u);
  }

  let processed = 0;
  let sent = 0;

  for (const c of contracts ?? []) {
    const pay = openByContract.get(c.id);
    if (!pay) continue;
    const days = daysBetween(today, pay.due_date);
    const trigger = Object.keys(TRIGGER_OFFSET).find((t) => TRIGGER_OFFSET[t] === days);
    if (!trigger) continue;
    processed++;

    const reminderKey = `${c.id}:${pay.period_month}:${trigger}`;
    const targets = usersByCompany.get(c.company_id) ?? [];

    for (const user of targets) {
      const pref = prefByUser.get(user.id);
      if (pref && pref[trigger] === false) continue; // trigger disabled
      const userSubs = subsByUser.get(user.id) ?? [];
      if (userSubs.length === 0) continue;

      // De-dup: only proceed if this (user, reminder) is newly logged.
      const { data: logged } = await admin
        .from('notification_log')
        .upsert(
          { user_id: user.id, reminder_key: reminderKey },
          { onConflict: 'user_id,reminder_key', ignoreDuplicates: true }
        )
        .select();
      if (!logged || logged.length === 0) continue;

      const { title, body } = buildMessage(trigger, c, pay, days);
      const payload = JSON.stringify({ title, body, data: { url: `/contracts/${c.id}` } });

      for (const s of userSubs) {
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
    }
  }

  return new Response(JSON.stringify({ ok: true, today, processed, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
