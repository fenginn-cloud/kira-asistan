-- ============================================================================
-- 0011 — Bina bazlı TOPLAM daire sayısı (yönetici girer/düzenler).
-- Boş daire = toplam − dolu (aktif sözleşme). Şirket bazlı; RLS ile korunur.
-- ============================================================================

create table if not exists building_units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  building text not null,
  total_units integer not null check (total_units >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, building)
);

create index if not exists building_units_company_idx on building_units (company_id);

alter table building_units enable row level security;

-- Şirket üyeleri okuyabilir (istatistik yöneticide açık).
drop policy if exists building_units_select on building_units;
create policy building_units_select on building_units for select
  using (auth_role() = 'super_admin' or company_id = auth_company_id());

-- Yalnızca kendi şirketinin yöneticisi yazabilir.
drop policy if exists building_units_write on building_units;
create policy building_units_write on building_units for all
  using (auth_role() = 'super_admin' or (company_id = auth_company_id() and auth_role() = 'admin'))
  with check (auth_role() = 'super_admin' or (company_id = auth_company_id() and auth_role() = 'admin'));
