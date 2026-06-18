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
