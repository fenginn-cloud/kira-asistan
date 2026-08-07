-- ============================================================================
-- 0009 — Excel akıllı senkron: işlem geçmişi (log) tablosu.
-- Sözleşme/ödeme güncellemeleri mevcut RLS'li contracts/payments üzerinden
-- yapılır (ID korunarak UPDATE, ödeme geçmişi bozulmadan). Bu tablo yalnızca
-- "kim, ne zaman, hangi dosyayı yükledi, ne değişti" kaydını tutar.
-- ============================================================================

create table if not exists excel_import_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  uploaded_by uuid references profiles(id) on delete set null,
  file_name text,
  summary jsonb not null default '{}'::jsonb,   -- {total,new,update,unchanged,review}
  changes jsonb,                                 -- [{label, field, from, to}, ...] (eski→yeni)
  created_at timestamptz not null default now()
);

create index if not exists excel_import_logs_company_idx
  on excel_import_logs (company_id, created_at desc);

alter table excel_import_logs enable row level security;

-- Yalnızca kendi şirketinin yöneticisi (veya super_admin) görebilir.
drop policy if exists excel_logs_select on excel_import_logs;
create policy excel_logs_select on excel_import_logs for select
  using (
    auth_role() = 'super_admin'
    or (company_id = auth_company_id() and auth_role() = 'admin')
  );

-- Yalnızca kendi şirketine, yönetici olarak log ekleyebilir.
drop policy if exists excel_logs_insert on excel_import_logs;
create policy excel_logs_insert on excel_import_logs for insert
  with check (
    auth_role() = 'super_admin'
    or (company_id = auth_company_id() and auth_role() = 'admin')
  );
