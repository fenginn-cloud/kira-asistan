-- ============================================================
-- Kira Asistan — TEK DOSYA KURULUM
-- Supabase SQL Editor'a bu dosyanin TAMAMINI yapistir ve Run.
-- ============================================================

-- ============================================================================
-- Kira Asistan — Initial schema
-- PostgreSQL / Supabase
-- ============================================================================

-- Roles enum
create type user_role as enum ('super_admin', 'admin', 'personnel');
create type contract_status as enum ('active', 'passive', 'terminated');
create type payment_status as enum ('paid', 'partial', 'pending', 'overdue');

-- ----------------------------------------------------------------------------
-- companies
-- ----------------------------------------------------------------------------
create table companies (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  phone                       text,
  email                       text,
  address                     text,
  tax_office                  text,
  tax_number                  text,
  logo_url                    text,
  currency                    text not null default 'TRY',
  default_notification_days   smallint[] not null default '{7,3,1}',
  created_at                  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  company_id     uuid not null references companies (id) on delete cascade,
  email          text not null,
  full_name      text not null,
  role           user_role not null default 'personnel',
  is_active      boolean not null default true,
  phone          text,
  avatar_url     text,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now()
);
create index on profiles (company_id);

-- ----------------------------------------------------------------------------
-- contracts
-- ----------------------------------------------------------------------------
create table contracts (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies (id) on delete cascade,
  assigned_user_id    uuid references profiles (id) on delete set null,

  property_name       text not null,
  block               text,
  unit                text,

  tenant_name         text not null,
  tenant_phone        text not null,
  tenant_national_id  text,

  owner_name          text not null,
  owner_phone         text not null,

  rent_amount         numeric(12,2) not null default 0,
  dues_amount         numeric(12,2) not null default 0,
  deposit_amount      numeric(12,2) not null default 0,

  start_date          date not null,
  end_date            date,
  payment_day         smallint not null check (payment_day between 1 and 31),

  notes               text,
  status              contract_status not null default 'active',
  document_url        text,

  notify_owner        boolean not null default true,
  notify_tenant       boolean not null default false,
  notify_staff        boolean not null default true,

  created_at          timestamptz not null default now()
);
create index on contracts (company_id);
create index on contracts (assigned_user_id);
create index on contracts (status);

-- ----------------------------------------------------------------------------
-- payments  (one row per contract per month)
-- ----------------------------------------------------------------------------
create table payments (
  id            uuid primary key default gen_random_uuid(),
  contract_id   uuid not null references contracts (id) on delete cascade,
  period_month  date not null,            -- normalized to first of month
  due_date      date not null,
  amount_due    numeric(12,2) not null default 0,
  amount_paid   numeric(12,2) not null default 0,
  status        payment_status not null default 'pending',
  paid_at       date,
  note          text,
  unique (contract_id, period_month)
);
create index on payments (contract_id);
create index on payments (status);

-- ----------------------------------------------------------------------------
-- payment_transactions  (tranches logged against a payment period)
-- ----------------------------------------------------------------------------
create table payment_transactions (
  id           uuid primary key default gen_random_uuid(),
  payment_id   uuid not null references payments (id) on delete cascade,
  amount       numeric(12,2) not null,
  paid_at      date not null default current_date,
  description  text,
  created_at   timestamptz not null default now()
);
create index on payment_transactions (payment_id);

-- ----------------------------------------------------------------------------
-- notification_preferences  (per user)
-- ----------------------------------------------------------------------------
create table notification_preferences (
  user_id     uuid primary key references profiles (id) on delete cascade,
  before_7    boolean not null default true,
  before_3    boolean not null default true,
  before_1    boolean not null default true,
  due_day     boolean not null default true,
  overdue_1   boolean not null default true,
  overdue_3   boolean not null default true,
  overdue_7   boolean not null default false,
  expo_push_token text
);

-- ============================================================================
-- Triggers: keep payment.amount_paid + status in sync with transactions
-- ============================================================================
create or replace function recalc_payment() returns trigger as $$
declare
  total numeric(12,2);
  rec   payments%rowtype;
begin
  select * into rec from payments where id = coalesce(new.payment_id, old.payment_id);
  select coalesce(sum(amount), 0) into total
    from payment_transactions where payment_id = rec.id;

  update payments
     set amount_paid = total,
         paid_at = case when total > 0 then current_date else null end,
         status = (case
           when total >= rec.amount_due then 'paid'
           when total > 0 and rec.due_date < current_date then 'overdue'
           when total > 0 then 'partial'
           when rec.due_date < current_date then 'overdue'
           else 'pending'
         end)::payment_status
   where id = rec.id;
  return null;
end;
$$ language plpgsql;

create trigger trg_recalc_payment
  after insert or update or delete on payment_transactions
  for each row execute function recalc_payment();


-- ============================================================================
-- Kira Asistan — Row Level Security
-- Multi-tenant isolation by company_id, with role-based visibility.
-- ============================================================================

-- Helper: current user's company
create or replace function auth_company_id() returns uuid as $$
  select company_id from profiles where id = auth.uid()
$$ language sql stable security definer;

-- Helper: current user's role
create or replace function auth_role() returns user_role as $$
  select role from profiles where id = auth.uid()
$$ language sql stable security definer;

alter table companies                 enable row level security;
alter table profiles                  enable row level security;
alter table contracts                 enable row level security;
alter table payments                  enable row level security;
alter table payment_transactions      enable row level security;
alter table notification_preferences  enable row level security;

-- ----------------------------------------------------------------------------
-- companies: super_admin sees all; others see their own company
-- ----------------------------------------------------------------------------
create policy companies_select on companies for select using (
  auth_role() = 'super_admin' or id = auth_company_id()
);
create policy companies_update on companies for update using (
  auth_role() = 'super_admin' or (id = auth_company_id() and auth_role() = 'admin')
);

-- ----------------------------------------------------------------------------
-- profiles: same company; admins manage, personnel read
-- ----------------------------------------------------------------------------
create policy profiles_select on profiles for select using (
  auth_role() = 'super_admin' or company_id = auth_company_id()
);
create policy profiles_write on profiles for all using (
  auth_role() = 'super_admin'
  or (company_id = auth_company_id() and auth_role() = 'admin')
) with check (
  auth_role() = 'super_admin'
  or (company_id = auth_company_id() and auth_role() = 'admin')
);

-- ----------------------------------------------------------------------------
-- contracts: company isolation; personnel limited to assigned records
-- ----------------------------------------------------------------------------
create policy contracts_select on contracts for select using (
  auth_role() = 'super_admin'
  or (
    company_id = auth_company_id()
    and (auth_role() = 'admin' or assigned_user_id = auth.uid())
  )
);
create policy contracts_write on contracts for all using (
  auth_role() = 'super_admin'
  or (company_id = auth_company_id() and auth_role() = 'admin')
) with check (
  auth_role() = 'super_admin'
  or (company_id = auth_company_id() and auth_role() = 'admin')
);

-- ----------------------------------------------------------------------------
-- payments: inherit access from parent contract
-- ----------------------------------------------------------------------------
create policy payments_select on payments for select using (
  exists (
    select 1 from contracts c
    where c.id = payments.contract_id
      and (
        auth_role() = 'super_admin'
        or (c.company_id = auth_company_id()
            and (auth_role() = 'admin' or c.assigned_user_id = auth.uid()))
      )
  )
);
create policy payments_write on payments for all using (
  exists (
    select 1 from contracts c
    where c.id = payments.contract_id
      and (auth_role() = 'super_admin'
           or (c.company_id = auth_company_id()
               and (auth_role() = 'admin' or c.assigned_user_id = auth.uid())))
  )
);

-- ----------------------------------------------------------------------------
-- payment_transactions: inherit access from parent payment -> contract
-- ----------------------------------------------------------------------------
create policy tx_all on payment_transactions for all using (
  exists (
    select 1
    from payments p
    join contracts c on c.id = p.contract_id
    where p.id = payment_transactions.payment_id
      and (auth_role() = 'super_admin'
           or (c.company_id = auth_company_id()
               and (auth_role() = 'admin' or c.assigned_user_id = auth.uid())))
  )
);

-- ----------------------------------------------------------------------------
-- notification_preferences: each user manages their own
-- ----------------------------------------------------------------------------
create policy notif_self on notification_preferences for all using (
  user_id = auth.uid()
) with check (user_id = auth.uid());


-- ============================================================================
-- Kira Asistan — Automatic monthly payments + document storage
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ensure_payment: create the payment row for a contract's month if missing.
-- due_date = payment_day of that month, clamped to the month's length.
-- ----------------------------------------------------------------------------
create or replace function ensure_payment(c contracts, period date)
returns void as $$
declare
  m   date := date_trunc('month', period)::date;
  dim int  := extract(day from (m + interval '1 month - 1 day'))::int;
  d   date := m + (least(c.payment_day, dim) - 1);
begin
  insert into payments (contract_id, period_month, due_date, amount_due, status)
  values (c.id, m, d, c.rent_amount + c.dues_amount, 'pending')
  on conflict (contract_id, period_month) do nothing;
end;
$$ language plpgsql;

-- Create the current month's payment as soon as a contract is created.
create or replace function on_contract_created() returns trigger as $$
begin
  perform ensure_payment(new, current_date);
  return new;
end;
$$ language plpgsql;

create trigger trg_contract_payment
  after insert on contracts
  for each row execute function on_contract_created();

-- Generate the current (or given) month's payments for all active contracts.
-- Intended to be called monthly by an Edge Function + cron (pg_cron).
create or replace function generate_monthly_payments(target date default current_date)
returns int as $$
declare
  c contracts;
  n int := 0;
begin
  for c in select * from contracts where status = 'active' loop
    perform ensure_payment(c, target);
    n := n + 1;
  end loop;
  return n;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- bootstrap_account: first sign-up creates a company + admin profile.
-- Call once right after the first user signs up (e.g. from the app).
-- ----------------------------------------------------------------------------
create or replace function bootstrap_account(company_name text, full_name text)
returns uuid as $$
declare cid uuid;
begin
  insert into companies (name) values (company_name) returning id into cid;

  insert into profiles (id, company_id, email, full_name, role)
  values (
    auth.uid(),
    cid,
    coalesce((select email from auth.users where id = auth.uid()), ''),
    full_name,
    'admin'
  );

  insert into notification_preferences (user_id) values (auth.uid())
  on conflict do nothing;

  return cid;
end;
$$ language plpgsql security definer;

-- Track last login (called by the app after sign-in).
create or replace function touch_last_login() returns void as $$
  update profiles set last_login_at = now() where id = auth.uid();
$$ language sql security definer;

-- ----------------------------------------------------------------------------
-- Storage: private bucket for contract PDFs.
-- Path convention: contracts/{company_id}/{contract_id}/{filename}
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

create policy "contract_docs_access" on storage.objects for all
  using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth_company_id()::text
  )
  with check (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth_company_id()::text
  );


-- ============================================================================
-- Kira Asistan — Payment method + receipt on transactions
-- ============================================================================

alter table payment_transactions
  add column if not exists method      text,
  add column if not exists receipt_url text;


-- ============================================================================
-- Kira Asistan — Fix: cast computed status to the payment_status enum.
-- Without the ::payment_status cast Postgres raises:
--   column "status" is of type payment_status but expression is of type text
-- ============================================================================

create or replace function recalc_payment() returns trigger as $$
declare
  total numeric(12,2);
  rec   payments%rowtype;
begin
  select * into rec from payments where id = coalesce(new.payment_id, old.payment_id);
  select coalesce(sum(amount), 0) into total
    from payment_transactions where payment_id = rec.id;

  update payments
     set amount_paid = total,
         paid_at = case when total > 0 then current_date else null end,
         status = (case
           when total >= rec.amount_due then 'paid'
           when total > 0 and rec.due_date < current_date then 'overdue'
           when total > 0 then 'partial'
           when rec.due_date < current_date then 'overdue'
           else 'pending'
         end)::payment_status
   where id = rec.id;
  return null;
end;
$$ language plpgsql;
