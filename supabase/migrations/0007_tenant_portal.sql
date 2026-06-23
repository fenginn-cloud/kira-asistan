-- ============================================================================
-- Kira Asistan — Kiracı Ödeme Linki (tenant self-service portal)
-- - Her sözleşmeye tahmin edilemez bir public_token
-- - Kiracının bildirdiği ödemeler (onay bekleyen) için tenant_payment_claims
-- Supabase SQL Editor'de çalıştırın.
-- ============================================================================

-- 1) Sözleşmelere public_token (giriş gerektirmeyen kiracı linki için).
alter table contracts
  add column if not exists public_token uuid not null default gen_random_uuid();

create unique index if not exists contracts_public_token_idx on contracts (public_token);

-- 2) Kiracının bildirdiği ödemeler (sahip onaylayana kadar "pending").
create table if not exists tenant_payment_claims (
  id            uuid primary key default gen_random_uuid(),
  contract_id   uuid not null references contracts (id) on delete cascade,
  period_month  date not null,
  amount        numeric(12,2) not null check (amount > 0),
  note          text,
  receipt_url   text,
  status        text not null default 'pending', -- pending | approved | rejected
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);
create index if not exists tpc_contract_idx on tenant_payment_claims (contract_id);
create index if not exists tpc_status_idx on tenant_payment_claims (status);

alter table tenant_payment_claims enable row level security;

-- Şirket üyeleri kendi sözleşmelerinin bildirimlerini görür/yönetir.
-- (Kiracı tarafı doğrudan tabloya erişmez; yalnızca Edge Function service-role
--  ile insert eder, o da RLS'yi bypass eder.)
drop policy if exists tpc_company on tenant_payment_claims;
create policy tpc_company on tenant_payment_claims for all using (
  exists (
    select 1 from contracts c
    where c.id = tenant_payment_claims.contract_id
      and (
        auth_role() = 'super_admin'
        or (c.company_id = auth_company_id()
            and (auth_role() = 'admin' or c.assigned_user_id = auth.uid()))
      )
  )
);
