-- ============================================================================
-- 0020 — Daire detayları (units tablosuna ek alanlar)
-- Daireye tıklayınca girilebilen bilgiler: m², oda tipi (2+1), balkon, teras
-- ve demirbaşlar. Sade tutuldu; ileride yeni alan eklenebilir.
-- ============================================================================

alter table units
  add column if not exists area_m2   numeric,
  add column if not exists layout    text,      -- ör. "2+1"
  add column if not exists balcony   boolean not null default false,
  add column if not exists terrace   boolean not null default false,
  add column if not exists fixtures  text[]  not null default '{}';  -- demirbaşlar
