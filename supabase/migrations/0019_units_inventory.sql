-- ============================================================================
-- 0019 — Daire Envanteri (units)
-- "Nerede ne dairesi var" tam listesi. Sözleşmelerden AYRI tutulur; mevcut
-- sözleşmelere dokunmaz. Boş daireler elle işaretlenir (status='vacant').
-- Şirket bazlı; RLS ile korunur. İleride genişletilebilir (m², oda tipi,
-- hedef kira) — bu yüzden sade ve eklenebilir tasarlandı.
-- ============================================================================

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  building text not null,
  block text not null default '',
  unit_label text not null,
  -- 'occupied' = dolu, 'vacant' = boş. Varsayılan boş; kullanıcı işaretler.
  status text not null default 'vacant' check (status in ('occupied', 'vacant')),
  -- Daire ne zamandan beri boş (status='vacant' iken "ne kadar zamandır boş").
  vacant_since date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Aynı bina+blok+daire etiketi bir kez. Çakışma olursa mevcut korunur
  -- (import sırasında "isimler çakışıyorsa kalsın").
  unique (company_id, building, block, unit_label)
);

create index if not exists units_company_idx on units (company_id);
create index if not exists units_company_building_idx on units (company_id, building);

alter table units enable row level security;

-- Şirket üyeleri okuyabilir.
drop policy if exists units_select on units;
create policy units_select on units for select
  using (auth_role() = 'super_admin' or company_id = auth_company_id());

-- Yalnızca kendi şirketinin yöneticisi yazabilir.
drop policy if exists units_write on units;
create policy units_write on units for all
  using (auth_role() = 'super_admin' or (company_id = auth_company_id() and auth_role() = 'admin'))
  with check (auth_role() = 'super_admin' or (company_id = auth_company_id() and auth_role() = 'admin'));
