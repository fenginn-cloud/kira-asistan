-- ============================================================================
-- Kira Asistan — Personel erişimi: şirket geneli
--
-- SORUN: Eski kurallarda 'personnel' rolü YALNIZCA kendisine atanmış
-- (assigned_user_id = auth.uid()) sözleşmeleri görebiliyordu. Sözleşmeler
-- yöneticiye atanmış olduğu için personel hiçbir şey göremiyordu.
--
-- ÇÖZÜM: Şirket içindeki herkes (admin + personel) kendi şirketinin
-- sözleşmelerini GÖRÜR ve ödeme kaydı ("Alındı") yapabilir.
-- Sözleşme ekleme/düzenleme/silme yetkisi YALNIZCA admin'de kalır.
--
-- Supabase → SQL Editor → çalıştır. Tekrar çalıştırılabilir.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- contracts: okuma şirket geneli (yazma admin'de kalır — contracts_write)
-- ---------------------------------------------------------------------------
drop policy if exists contracts_select on contracts;
create policy contracts_select on contracts for select using (
  auth_role() = 'super_admin' or company_id = auth_company_id()
);

-- ---------------------------------------------------------------------------
-- payments: şirket içi herkes okur/yazar (personel "Alındı" işaretleyebilsin)
-- ---------------------------------------------------------------------------
drop policy if exists payments_select on payments;
create policy payments_select on payments for select using (
  exists (
    select 1 from contracts c
    where c.id = payments.contract_id
      and (auth_role() = 'super_admin' or c.company_id = auth_company_id())
  )
);

drop policy if exists payments_write on payments;
create policy payments_write on payments for all using (
  exists (
    select 1 from contracts c
    where c.id = payments.contract_id
      and (auth_role() = 'super_admin' or c.company_id = auth_company_id())
  )
) with check (
  exists (
    select 1 from contracts c
    where c.id = payments.contract_id
      and (auth_role() = 'super_admin' or c.company_id = auth_company_id())
  )
);

-- ---------------------------------------------------------------------------
-- payment_transactions: tahsilat kaydı — şirket içi herkes
-- ---------------------------------------------------------------------------
drop policy if exists tx_all on payment_transactions;
create policy tx_all on payment_transactions for all using (
  exists (
    select 1 from payments p
    join contracts c on c.id = p.contract_id
    where p.id = payment_transactions.payment_id
      and (auth_role() = 'super_admin' or c.company_id = auth_company_id())
  )
) with check (
  exists (
    select 1 from payments p
    join contracts c on c.id = p.contract_id
    where p.id = payment_transactions.payment_id
      and (auth_role() = 'super_admin' or c.company_id = auth_company_id())
  )
);

-- ---------------------------------------------------------------------------
-- tenant_payment_claims: kiracı bildirimleri — şirket içi herkes
-- (tablo 0007 ile geldi; yoksa bu blok atlanır)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.tenant_payment_claims') is not null then
    execute 'drop policy if exists tpc_company on tenant_payment_claims';
    execute $p$
      create policy tpc_company on tenant_payment_claims for all using (
        exists (
          select 1 from contracts c
          where c.id = tenant_payment_claims.contract_id
            and (auth_role() = 'super_admin' or c.company_id = auth_company_id())
        )
      )$p$;
  end if;
end $$;
