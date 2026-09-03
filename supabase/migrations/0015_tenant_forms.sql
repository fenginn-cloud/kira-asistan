-- ============================================================================
-- Kira Asistan — Kiracı Bilgi Formu
--
-- Kullanıcı bir kiracı/kiracı adayına giriş gerektirmeyen özel bir link gönderir
-- (/form/<token>). Kiracı formu doldurur; cevaplar Kira Asistan'da saklanır ve
-- opsiyonel olarak bir sözleşmeye bağlanır.
--
-- Güvenlik:
--   - Her form tahmin edilemez bir token taşır (gen_random_uuid).
--   - Public erişim YALNIZCA `tenant-form` Edge Function (service-role) üzerinden;
--     istemci tablolara doğrudan erişmez.
--   - RLS: şirket üyeleri yalnızca kendi şirketlerinin formlarını görür/yönetir.
--   - Danışman değerlendirmesi (tenant_form_reviews) public tarafa ASLA dönmez.
--
-- Tüm planda (Free/Pro/Business) aktif — burada plan/limit kontrolü YOKTUR.
-- Supabase SQL Editor'de çalıştırın. Tekrar çalıştırılabilir.
-- ============================================================================

-- Form durumu
do $$ begin
  create type tenant_form_status as enum ('pending', 'completed', 'reviewed', 'expired');
exception when duplicate_object then null; end $$;

-- Danışman değerlendirme sonucu
do $$ begin
  create type tenant_form_result as enum ('suitable', 'need_docs', 'unsuitable', 'unrated');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- tenant_forms — form başlığı + tüm cevaplar (esneklik için JSONB)
-- ----------------------------------------------------------------------------
create table if not exists tenant_forms (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  contract_id   uuid references contracts (id) on delete set null,
  created_by    uuid references profiles (id) on delete set null,
  token         uuid not null default gen_random_uuid(),
  status        tenant_form_status not null default 'pending',
  expires_at    timestamptz,
  submitted_at  timestamptz,
  -- Liste ekranında hızlı gösterim için başlık alanları (opsiyonel):
  tenant_name   text,
  tenant_phone  text,
  tenant_email  text,
  -- Kiracının doldurduğu tüm adımlar (kişisel, araçlar, iş/gelir, referans...):
  responses     jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists tenant_forms_token_idx on tenant_forms (token);
create index if not exists tenant_forms_company_idx on tenant_forms (company_id);
create index if not exists tenant_forms_contract_idx on tenant_forms (contract_id);
create index if not exists tenant_forms_status_idx on tenant_forms (status);

-- ----------------------------------------------------------------------------
-- tenant_form_documents — yüklenen gelir belgeleri (storage yolu)
-- ----------------------------------------------------------------------------
create table if not exists tenant_form_documents (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references tenant_forms (id) on delete cascade,
  document_type text,                 -- 'payslip' | 'sgk' | 'tax' | 'other'
  file_name     text,
  storage_path  text not null,
  created_at    timestamptz not null default now()
);
create index if not exists tff_docs_form_idx on tenant_form_documents (form_id);

-- ----------------------------------------------------------------------------
-- tenant_form_reviews — DANIŞMAN DEĞERLENDİRMESİ (public tarafa asla dönmez)
-- ----------------------------------------------------------------------------
create table if not exists tenant_form_reviews (
  id                  uuid primary key default gen_random_uuid(),
  form_id             uuid not null unique references tenant_forms (id) on delete cascade,
  reviewer_id         uuid references profiles (id) on delete set null,
  general_note        text,
  income_rent_ratio   numeric(6,2),
  landlord_reference  text,
  income_verification text,
  additional_notes    text,
  result              tenant_form_result not null default 'unrated',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists tff_reviews_form_idx on tenant_form_reviews (form_id);

-- ----------------------------------------------------------------------------
-- updated_at otomatik
-- ----------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_tenant_forms_touch on tenant_forms;
create trigger trg_tenant_forms_touch before update on tenant_forms
  for each row execute function touch_updated_at();

drop trigger if exists trg_tenant_form_reviews_touch on tenant_form_reviews;
create trigger trg_tenant_form_reviews_touch before update on tenant_form_reviews
  for each row execute function touch_updated_at();

-- ----------------------------------------------------------------------------
-- RLS — şirket izolasyonu (mevcut auth_company_id / auth_role yardımcıları)
-- ----------------------------------------------------------------------------
alter table tenant_forms          enable row level security;
alter table tenant_form_documents enable row level security;
alter table tenant_form_reviews   enable row level security;

-- tenant_forms: aynı şirket görür; admin yönetir, personel kendi oluşturduğunu/
-- bağlı sözleşmesini görür. (Sadeleştirme: aynı şirketteki herkes görebilir,
-- yazma admin veya oluşturana ait.)
drop policy if exists tenant_forms_select on tenant_forms;
create policy tenant_forms_select on tenant_forms for select using (
  auth_role() = 'super_admin' or company_id = auth_company_id()
);
drop policy if exists tenant_forms_insert on tenant_forms;
create policy tenant_forms_insert on tenant_forms for insert with check (
  company_id = auth_company_id()
);
drop policy if exists tenant_forms_update on tenant_forms;
create policy tenant_forms_update on tenant_forms for update using (
  auth_role() = 'super_admin'
  or (company_id = auth_company_id()
      and (auth_role() = 'admin' or created_by = auth.uid()))
);
drop policy if exists tenant_forms_delete on tenant_forms;
create policy tenant_forms_delete on tenant_forms for delete using (
  auth_role() = 'super_admin'
  or (company_id = auth_company_id()
      and (auth_role() = 'admin' or created_by = auth.uid()))
);

-- documents: bağlı formun şirketine ait üyeler
drop policy if exists tff_docs_all on tenant_form_documents;
create policy tff_docs_all on tenant_form_documents for all using (
  exists (
    select 1 from tenant_forms f
    where f.id = tenant_form_documents.form_id
      and (auth_role() = 'super_admin' or f.company_id = auth_company_id())
  )
);

-- reviews: bağlı formun şirketine ait üyeler (public API bu tabloyu hiç okumaz)
drop policy if exists tff_reviews_all on tenant_form_reviews;
create policy tff_reviews_all on tenant_form_reviews for all using (
  exists (
    select 1 from tenant_forms f
    where f.id = tenant_form_reviews.form_id
      and (auth_role() = 'super_admin' or f.company_id = auth_company_id())
  )
);
