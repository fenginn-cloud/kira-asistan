-- ============================================================================
-- Kira Asistan — Ödeme dönemleri sözleşme aralığına ZORUNLU bağlansın
--
-- SORUN: Bazı sözleşmelerde başlangıç tarihinden ÖNCEKİ (ör. Temmuz'da başlayan
-- sözleşmede Haziran) veya bitişten SONRAKİ aylar için ödeme kaydı vardı —
-- bir kısmı "ödendi" işaretliydi (çoğu Excel içe aktarımından). Bu, cari hesabı
-- ve istatistikleri bozuyordu.
--
-- ÇÖZÜM:
--   1) TETİKLEYİCİ: payments tablosuna, ilgili sözleşmenin başlangıç ayından
--      önce ya da bitiş ayından sonra HİÇBİR kayıt eklenemesin (sessizce atlanır).
--      Böylece Excel import, kiracı bildirimi, otomatik üretim — tüm yollar kapsanır.
--   2) TEMİZLİK: mevcut dönem-dışı TÜM ödeme kayıtları silinir ("ödendi" olanlar
--      dahil; tahsilatları cascade ile silinir). Sözleşmedeki başlangıç/bitiş
--      tarihi doğru kabul edilir.
--
-- Tekrar çalıştırılabilir. Supabase SQL Editor'de çalıştırın.
-- ============================================================================

-- 1) Dönem-dışı insert'i engelleyen tetikleyici
create or replace function payments_within_contract() returns trigger as $$
declare
  sm date;
  em date;
begin
  select date_trunc('month', c.start_date)::date,
         case when c.end_date is not null
              then date_trunc('month', c.end_date)::date end
    into sm, em
  from contracts c
  where c.id = new.contract_id;

  if sm is null then return new; end if;           -- sözleşme yok/tarih yok → dokunma
  if new.period_month < sm then return null; end if; -- başlangıçtan önce → ekleme
  if em is not null and new.period_month > em then return null; end if; -- bitişten sonra
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_payments_within_contract on payments;
create trigger trg_payments_within_contract
  before insert on payments
  for each row execute function payments_within_contract();

-- 2) Mevcut dönem-dışı kayıtları temizle (ödenmiş olanlar dahil).
--    payment_transactions FK'si on delete cascade olduğundan tahsilatlar da silinir.
delete from payments p
using contracts c
where c.id = p.contract_id
  and (
        p.period_month < date_trunc('month', c.start_date)::date
     or (c.end_date is not null
         and p.period_month > date_trunc('month', c.end_date)::date)
      );
