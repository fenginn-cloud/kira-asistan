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
