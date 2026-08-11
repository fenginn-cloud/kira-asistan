-- ============================================================================
-- Kira Asistan — Ödeme vadelerini sözleşmedeki ödeme gününe göre düzelt
--
-- SORUN: Bazı payments.due_date değerleri contracts.payment_day ile uyuşmuyordu.
-- (Excel import ödeme gününü eksik/yanlış aldığında `?? 1` ile ayın 1'ine
-- düşüyordu; ya da ödeme günü sonradan değişince eski vade kalıyordu.)
-- Bu yüzden bazı kayıtlar VADESİ GELMEDEN "gecikmiş" görünüyordu.
--
-- KURAL: due_date = ilgili ayın payment_day'i (ay uzunluğuna göre kırpılmış).
-- Tekrar çalıştırılabilir.
-- ============================================================================

-- Yardımcı: bir dönem (ayın 1'i) + ödeme günü → doğru vade
create or replace function due_date_for(period date, pay_day int)
returns date language sql immutable as $$
  select date_trunc('month', period)::date
    + (least(
         pay_day,
         extract(day from (date_trunc('month', period) + interval '1 month - 1 day'))::int
       ) - 1)
$$;

-- 1) MEVCUT VERİ: tüm ödemelerin vadesini sözleşmenin ödeme gününe göre düzelt.
update payments p
set due_date = due_date_for(p.period_month, c.payment_day)
from contracts c
where c.id = p.contract_id
  and p.due_date <> due_date_for(p.period_month, c.payment_day);

-- 2) TEKRARI ÖNLE: ödeme günü değişince ilgili ödemelerin vadesini güncelle.
create or replace function sync_due_dates() returns trigger as $$
begin
  if new.payment_day is distinct from old.payment_day then
    update payments p
    set due_date = due_date_for(p.period_month, new.payment_day)
    where p.contract_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_due_dates on contracts;
create trigger trg_sync_due_dates
  after update of payment_day on contracts
  for each row execute function sync_due_dates();
