-- SEO sayfalarından gelen e-posta hatırlatma kayıtları (ör. kira artış hatırlatması).
-- Herkese açık sayfalardan anon key ile YALNIZCA ekleme yapılabilir; okuma yok.

create table if not exists public.seo_leads (
  id             uuid primary key default gen_random_uuid(),
  email          text not null check (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source         text not null check (char_length(source) <= 100),
  renewal_month  text check (renewal_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  kvkk_consent   boolean not null check (kvkk_consent = true),
  created_at     timestamptz not null default now()
);

create index if not exists seo_leads_renewal_month_idx on public.seo_leads (renewal_month);

alter table public.seo_leads enable row level security;

revoke all on public.seo_leads from anon, authenticated;
grant insert (email, source, renewal_month, kvkk_consent) on public.seo_leads to anon, authenticated;

drop policy if exists seo_leads_insert on public.seo_leads;
create policy seo_leads_insert on public.seo_leads
  for insert to anon, authenticated
  with check (kvkk_consent = true);
