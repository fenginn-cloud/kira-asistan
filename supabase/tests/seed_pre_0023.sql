-- 0022 sonrası, 0023 öncesi örnek "mevcut" veri (yalnızca yerel test için).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test');
insert into companies (id, name, plan, is_legacy) values
  ('00000000-0000-0000-0000-0000000000aa', 'A', 'business', true),
  ('00000000-0000-0000-0000-0000000000bb', 'B', 'business', true);
insert into profiles (id, company_id, email, full_name, role) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000aa', 'a@test', 'A', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000bb', 'b@test', 'B', 'admin');
insert into units (id, company_id, building, block, unit_label, status) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000aa', 'Marina Park', 'C', '4', 'occupied');
-- c1: bitişi geçmiş (2026-06-30), Mart–Haziran kayıtlı, Mart ödenmiş.
insert into contracts (id, company_id, property_name, block, unit, tenant_name, tenant_phone, owner_name, owner_phone,
                       rent_amount, start_date, end_date, payment_day, created_at)
values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000aa', 'Dream', 'A', '10', 'Burak', '1', 'S', '2',
        10000, '2025-07-01', '2026-06-30', 5, '2026-03-10');
-- c2: devam eden, 2026-10 başlangıçlı.
insert into contracts (id, company_id, property_name, block, unit, tenant_name, tenant_phone, owner_name, owner_phone,
                       rent_amount, start_date, end_date, payment_day, created_at)
values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000aa', 'Marina Park', 'C', '4', 'Elif', '1', 'S', '2',
        10000, '2026-01-01', '2027-12-31', 5, '2026-10-01');
delete from payments; -- on_contract_created tetikleyicisinin ürettiklerini temizle; aşağıda açıkça ekle
insert into payments (contract_id, period_month, due_date, amount_due) values
  ('00000000-0000-0000-0000-0000000000c1', '2026-03-01', '2026-03-05', 10000),
  ('00000000-0000-0000-0000-0000000000c1', '2026-04-01', '2026-04-05', 10000),
  ('00000000-0000-0000-0000-0000000000c1', '2026-05-01', '2026-05-05', 10000),
  ('00000000-0000-0000-0000-0000000000c1', '2026-06-01', '2026-06-05', 10000),
  ('00000000-0000-0000-0000-0000000000c2', '2026-10-01', '2026-10-05', 10000),
  ('00000000-0000-0000-0000-0000000000c2', '2026-12-01', '2026-12-05', 10000);
insert into payment_transactions (payment_id, amount)
select id, 10000 from payments where contract_id = '00000000-0000-0000-0000-0000000000c1' and period_month = '2026-03-01';

-- c3: 2024'te sonlandırılmış, hiç ödeme kaydı yok (sahte borç oluşmamalı).
insert into contracts (id, company_id, property_name, tenant_name, tenant_phone, owner_name, owner_phone,
                       rent_amount, start_date, end_date, payment_day, status, created_at)
values ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000aa', 'Bahar', 'Önceki', '1', 'S', '2',
        12700, '2023-05-01', '2024-05-01', 10, 'terminated', '2023-05-01');
delete from payments where contract_id = '00000000-0000-0000-0000-0000000000c3';

create table seed_counts as
  select 'payments' as k, count(*) as n from payments
  union all select 'tx', count(*) from payment_transactions;
grant select on seed_counts to authenticated;
