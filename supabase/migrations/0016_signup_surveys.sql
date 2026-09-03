-- ============================================================================
-- 0016 — Kayıt öncesi anket (rol, portföy büyüklüğü, nereden duydu).
-- Kayıt sırasında toplanır, hesap kurulduktan (OTP + bootstrap) sonra yazılır.
-- user_id/company_id sunucu tarafında (auth.uid()/auth_company_id()) atanır.
-- Raporlama: uygulama sahibi (super_admin) tüm satırları görebilir.
-- ============================================================================

create table if not exists signup_surveys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  company_id uuid default auth_company_id() references companies(id) on delete set null,
  role text,
  portfolio_size text,
  referral text,
  created_at timestamptz not null default now()
);

create index if not exists signup_surveys_created_idx on signup_surveys (created_at desc);

alter table signup_surveys enable row level security;

-- Kullanıcı yalnızca kendi anketini ekleyebilir (user_id = kendisi).
drop policy if exists signup_surveys_insert on signup_surveys;
create policy signup_surveys_insert on signup_surveys for insert
  with check (user_id = auth.uid());

-- Kendi anketini + (yönetici ise) şirketininkini; super_admin hepsini görür.
drop policy if exists signup_surveys_select on signup_surveys;
create policy signup_surveys_select on signup_surveys for select
  using (
    auth_role() = 'super_admin'
    or user_id = auth.uid()
    or (company_id = auth_company_id() and auth_role() = 'admin')
  );
