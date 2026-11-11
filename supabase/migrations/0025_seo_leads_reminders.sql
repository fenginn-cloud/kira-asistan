-- SEO hatırlatma e-postaları: gönderim takibi + abonelikten çıkma.
-- seo-reminders Edge Function (service role) bu kolonları okur/yazar; anon erişimi değişmez
-- (anon yalnızca 0024'teki insert kolonlarına yazabilir).

alter table public.seo_leads
  add column if not exists unsub_token          uuid not null default gen_random_uuid(),
  add column if not exists unsubscribed_at      timestamptz,
  add column if not exists last_reminded_month  text check (last_reminded_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  add column if not exists last_reminded_at     timestamptz;

create unique index if not exists seo_leads_unsub_token_idx on public.seo_leads (unsub_token);
