-- ============================================================================
-- 0023 regresyon testi — YEREL PostgreSQL'de çalıştırılır (canlı veriye DEĞİL).
-- Kullanım: supabase/tests/run-local.sh  (0001..0022 → seed → 0023 → bu dosya)
-- Her kontrol başarısızsa RAISE EXCEPTION ile durur.
-- ============================================================================
\set ON_ERROR_STOP 1

create or replace function pg_temp.check(ok boolean, label text) returns void as $$
begin
  if not coalesce(ok, false) then raise exception 'FAIL: %', label; end if;
  raise notice 'ok  %', label;
end $$ language plpgsql;

-- --- 0023 sonrası: mevcut veriler korunmuş mu? -------------------------------
select pg_temp.check((select count(*) from payments) = (select n from seed_counts where k = 'payments'),
                     'migration hiçbir ödeme satırını silmedi');
select pg_temp.check((select count(*) from payment_transactions) = (select n from seed_counts where k = 'tx'),
                     'migration hiçbir tahsilatı silmedi');
select pg_temp.check((select tracking_start from contracts where id = '00000000-0000-0000-0000-0000000000c1') = '2026-03-01',
                     'tracking_start = en eski kayıtlı ay');
select pg_temp.check((select auto_renew from contracts where id = '00000000-0000-0000-0000-0000000000c1') = false,
                     'bitişi geçmiş mevcut sözleşme: auto_renew=false (eski davranış korunur)');
select pg_temp.check((select auto_renew from contracts where id = '00000000-0000-0000-0000-0000000000c2') = true,
                     'süresi devam eden sözleşme: auto_renew=true');
select pg_temp.check((select unit_id from contracts where id = '00000000-0000-0000-0000-0000000000c2') = '00000000-0000-0000-0000-0000000000a1',
                     'tek kesin daire eşleşmesi unit_id ile bağlandı');

select pg_temp.check((select terminated_at from contracts where id = '00000000-0000-0000-0000-0000000000c3') is null,
                     'eski sonlandırılmış sözleşmeye çıkış tarihi uydurulmadı (sahte borç yok)');
select ensure_payment(c, '2023-08-01') from contracts c where c.id = '00000000-0000-0000-0000-0000000000c3';
select pg_temp.check(not exists(select 1 from payments where contract_id = '00000000-0000-0000-0000-0000000000c3'),
                     'eski sonlandırılmış sözleşmede tahakkuk üretilmiyor');

-- --- Kullanıcı A olarak (RLS etkin) -------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

-- Uzayan sözleşme: bitişten sonraki ay artık eklenebiliyor.
update contracts set auto_renew = true where id = '00000000-0000-0000-0000-0000000000c1';
insert into payments (contract_id, period_month, due_date, amount_due)
values ('00000000-0000-0000-0000-0000000000c1', '2026-08-01', '2026-08-05', 10000);
select pg_temp.check(exists(select 1 from payments where contract_id = '00000000-0000-0000-0000-0000000000c1' and period_month = '2026-08-01'),
                     'auto_renew=true: bitiş sonrası ay tahakkuk ediyor (takip durmuyor)');
-- Uzamayan sözleşmede bitiş sonrası sessizce engellenir.
update contracts set auto_renew = false where id = '00000000-0000-0000-0000-0000000000c1';
insert into payments (contract_id, period_month, due_date, amount_due)
values ('00000000-0000-0000-0000-0000000000c1', '2026-09-01', '2026-09-05', 10000);
select pg_temp.check(not exists(select 1 from payments where contract_id = '00000000-0000-0000-0000-0000000000c1' and period_month = '2026-09-01'),
                     'auto_renew=false: bitiş sonrası ay oluşmuyor');
-- Başlangıç bakiyesi (kind=opening) başlangıçtan önceki aya yazılabilir.
insert into payments (contract_id, period_month, due_date, amount_due, kind)
values ('00000000-0000-0000-0000-0000000000c2', '2025-12-01', '2025-12-01', 7000, 'opening');
select pg_temp.check(exists(select 1 from payments where kind = 'opening'), 'başlangıç bakiyesi satırı eklendi');

-- Mükerrer tahsilat: aynı client_ref ikinci kez eklenemez.
insert into payment_transactions (payment_id, amount, client_ref)
select id, 3000, '11111111-1111-1111-1111-111111111111' from payments
 where contract_id = '00000000-0000-0000-0000-0000000000c2' and period_month = '2026-10-01';
do $$ begin
  insert into payment_transactions (payment_id, amount, client_ref)
  select id, 3000, '11111111-1111-1111-1111-111111111111' from payments
   where contract_id = '00000000-0000-0000-0000-0000000000c2' and period_month = '2026-10-01';
  raise exception 'FAIL: duplicate client_ref accepted';
exception when unique_violation then raise notice 'ok  aynı client_ref ile ikinci tahsilat reddedildi';
end $$;
select pg_temp.check((select amount_paid from payments where contract_id = '00000000-0000-0000-0000-0000000000c2' and period_month = '2026-10-01') = 3000,
                     'kısmi ödeme: amount_paid = 3000 (tek kez)');

-- Kira artışı: Aralık 2026'dan itibaren (ileri tarihli). Geçmiş tutarlar korunur.
select apply_rent_change('00000000-0000-0000-0000-0000000000c2', '2026-12-01', 12000, 0);
select pg_temp.check((select amount_due from payments where contract_id = '00000000-0000-0000-0000-0000000000c2' and period_month = '2026-10-01') = 10000,
                     'kira artışı: geçmiş ay (Ekim) eski tutarda');
select pg_temp.check((select amount_due from payments where contract_id = '00000000-0000-0000-0000-0000000000c2' and period_month = '2026-12-01') = 12000,
                     'kira artışı: önceden oluşturulmuş Aralık yeni tutara çekildi');
select pg_temp.check((select rent_amount from contracts where id = '00000000-0000-0000-0000-0000000000c2') = 10000
                 and (select next_rent_from from contracts where id = '00000000-0000-0000-0000-0000000000c2') = '2026-12-01',
                     'ileri tarihli artış: mevcut kira değişmedi, plan kaydedildi');
select pg_temp.check((select amount_paid from payments where contract_id = '00000000-0000-0000-0000-0000000000c2' and period_month = '2026-10-01') = 3000,
                     'kira artışı tahsilatlara dokunmadı');

-- Geri alma: tahsilat silinince ay bakiyesi geri döner.
delete from payment_transactions where client_ref = '11111111-1111-1111-1111-111111111111';
select pg_temp.check((select amount_paid from payments where contract_id = '00000000-0000-0000-0000-0000000000c2' and period_month = '2026-10-01') = 0,
                     'tahsilat geri alındı: amount_paid = 0');

-- Kiracı çıkışı
select terminate_contract('00000000-0000-0000-0000-0000000000c2', '2026-11-15', 8000, 2000, 'Boya bedeli');
select pg_temp.check((select status::text from contracts where id = '00000000-0000-0000-0000-0000000000c2') = 'terminated'
                 and (select deposit_deduction from contracts where id = '00000000-0000-0000-0000-0000000000c2') = 2000,
                     'çıkış: durum + depozito kesintisi kaydedildi');
insert into payments (contract_id, period_month, due_date, amount_due)
values ('00000000-0000-0000-0000-0000000000c2', '2027-01-01', '2027-01-05', 12000);
select pg_temp.check(not exists(select 1 from payments where contract_id = '00000000-0000-0000-0000-0000000000c2' and period_month = '2027-01-01'),
                     'sonlandırılmış sözleşmede çıkış sonrası yeni borç oluşmuyor');
-- Geçmiş borç tahsil edilebilir.
insert into payment_transactions (payment_id, amount)
select id, 10000 from payments where contract_id = '00000000-0000-0000-0000-0000000000c2' and period_month = '2026-10-01';
select pg_temp.check((select amount_paid from payments where contract_id = '00000000-0000-0000-0000-0000000000c2' and period_month = '2026-10-01') = 10000,
                     'sonlandırılmış sözleşmede geçmiş borç tahsil edilebiliyor');

-- --- Kullanıcı B (başka şirket): veri izolasyonu ------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select pg_temp.check((select count(*) from contracts) = 0, 'B şirketi A sözleşmelerini göremiyor');
do $$ begin
  perform apply_rent_change('00000000-0000-0000-0000-0000000000c1', '2026-01-01', 1, 0);
  raise exception 'FAIL: cross-company rent change allowed';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok  B, A sözleşmesine kira artışı uygulayamıyor (%)', sqlerrm;
end $$;
do $$ begin
  perform terminate_contract('00000000-0000-0000-0000-0000000000c1', '2026-01-01', 0, 0, null);
  raise exception 'FAIL: cross-company terminate allowed';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok  B, A sözleşmesini sonlandıramıyor (%)', sqlerrm;
end $$;
reset role;
select pg_temp.check((select status::text from contracts where id = '00000000-0000-0000-0000-0000000000c1') = 'active',
                     'A sözleşmesi B tarafından değiştirilmedi');
