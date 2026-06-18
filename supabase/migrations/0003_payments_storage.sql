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
