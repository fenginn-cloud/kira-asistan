-- ============================================================================
-- Kira Asistan — Ödeme tahakkuku sözleşme başlangıç/bitişine bağlansın
--
-- SORUN: ensure_payment() (ve onu çağıran on_contract_created trigger'ı +
-- generate_monthly_payments) bir ödeme dönemi oluştururken sözleşmenin
-- start_date / end_date sınırını kontrol etmiyordu. Sözleşme ileri tarihli
-- (ör. 15.09) oluşturulduğunda, kayıt anındaki ay (ör. Ağustos) için sahte bir
-- "gecikmiş" tahakkuk üretiliyor; bu da cari hesabı ve tüm istatistikleri
-- bozuyordu.
--
-- ÇÖZÜM:
--   1) ensure_payment: sözleşme başlangıç ayından ÖNCE ya da bitiş ayından
--      SONRA hiç kayıt oluşturma.
--   2) Mevcut kapsam-dışı ve ödemesi olmayan kayıtları temizle.
-- Tekrar çalıştırılabilir. Supabase SQL Editor'de çalıştırın.
-- ============================================================================

-- 1) Guard'lı ensure_payment
create or replace function ensure_payment(c contracts, period date)
returns void as $$
declare
  m           date := date_trunc('month', period)::date;
  start_m     date := date_trunc('month', c.start_date)::date;
  end_m       date := case when c.end_date is not null
                           then date_trunc('month', c.end_date)::date end;
  dim int  := extract(day from (m + interval '1 month - 1 day'))::int;
  d   date := m + (least(c.payment_day, dim) - 1);
begin
  -- Sözleşme başlamadan önce ya da bittikten sonra tahakkuk oluşturma.
  if m < start_m then return; end if;
  if end_m is not null and m > end_m then return; end if;

  insert into payments (contract_id, period_month, due_date, amount_due, status)
  values (c.id, m, d, c.rent_amount + c.dues_amount, 'pending')
  on conflict (contract_id, period_month) do nothing;
end;
$$ language plpgsql;

-- 2) Kapsam-dışı, ödemesi olmayan mevcut kayıtları sil.
--    (amount_paid > 0 veya tahsilatı olan dönemler KORUNUR — veri kaybı olmasın.)
delete from payments p
using contracts c
where c.id = p.contract_id
  and (
        p.period_month < date_trunc('month', c.start_date)::date
     or (c.end_date is not null
         and p.period_month > date_trunc('month', c.end_date)::date)
      )
  and coalesce(p.amount_paid, 0) = 0
  and not exists (
    select 1 from payment_transactions t where t.payment_id = p.id
  );
