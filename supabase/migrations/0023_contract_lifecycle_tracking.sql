-- ============================================================================
-- 0023 — Sözleşme yaşam döngüsü + güvenilir tahakkuk/tahsilat
--
-- SORUNLAR (UX İnceleme Raporu, Bulgu 1, 5, 6, 7, 8, 10):
--   * 0017'deki tetikleyici bitiş ayından SONRAKİ tahakkukları sessizce
--     reddediyordu → süre dolunca kira takibi duruyordu.
--   * Uygulama sözleşme detayı açıldığında son 3 ayı "ödenmedi" olarak
--     yazıyordu (bilinmeyen geçmiş = sahte borç). Artık görüntüleme yazmaz;
--     takip başlangıç ayı (tracking_start) açıkça tutulur.
--   * Uzatma / kira artışı / kiracı çıkışı için alan ve işlem yoktu.
--   * Tahsilatlarda çift tıklama / bağlantı tekrarı mükerrer kayıt üretebiliyordu.
--   * Sözleşme ↔ daire ilişkisi yalnızca metin eşleşmesine dayanıyordu.
--
-- VERİ GÜVENLİĞİ: Hiçbir ödeme/tahsilat silinmez, hiçbir ay "ödendi" yapılmaz.
--   * tracking_start, mevcut sözleşmelerde EN ESKİ kayıtlı ödeme ayına (yoksa
--     oluşturulma ayına) ayarlanır → mevcut bakiyeler değişmez.
--   * auto_renew: bitiş tarihi ZATEN geçmiş mevcut sözleşmelerde false
--     (eski davranış korunur; arayüz "Süresi doldu · takip durdu" diye açıkça
--     gösterir ve Uzat / Çıkış sorar). Diğerlerinde ve yeni sözleşmelerde true.
--
-- Tekrar çalıştırılabilir. Önceki migration'lardan sonra uygulayın.
-- ============================================================================

-- 1) Yeni kolonlar --------------------------------------------------------------
alter table contracts add column if not exists tracking_start date;
alter table contracts add column if not exists auto_renew boolean;
alter table contracts add column if not exists terminated_at date;
alter table contracts add column if not exists deposit_returned numeric(12,2);
alter table contracts add column if not exists deposit_deduction numeric(12,2);
alter table contracts add column if not exists deposit_note text;
alter table contracts add column if not exists next_rent_amount numeric(12,2);
alter table contracts add column if not exists next_dues_amount numeric(12,2);
alter table contracts add column if not exists next_rent_from date;
alter table contracts add column if not exists unit_id uuid references units(id) on delete set null;
create index if not exists contracts_unit_id_idx on contracts (unit_id);

alter table payments add column if not exists kind text not null default 'rent';
do $$ begin
  alter table payments add constraint payments_kind_check check (kind in ('rent', 'opening'));
exception when duplicate_object then null; end $$;

alter table payment_transactions add column if not exists client_ref uuid;
create unique index if not exists payment_transactions_client_ref_key
  on payment_transactions (client_ref) where client_ref is not null;

-- 2) Mevcut veriler için güvenli varsayılanlar -----------------------------------
update contracts c
   set tracking_start = coalesce(
         (select min(p.period_month) from payments p where p.contract_id = c.id),
         date_trunc('month', c.created_at)::date
       )
 where c.tracking_start is null;

update contracts
   set auto_renew = not (end_date is not null and end_date < current_date)
 where auto_renew is null;

alter table contracts alter column auto_renew set default true;
alter table contracts alter column auto_renew set not null;

-- NOT: Önceden sonlandırılmış sözleşmelere terminated_at DOLDURULMAZ. Doldurulsaydı
-- takip başlangıcı ile çıkış arasındaki kayıtsız aylar borç gibi görünürdü
-- (bilinmeyen geçmiş). terminated_at boş olan sonlandırılmış sözleşmede yalnızca
-- KAYITLI aylar sayılır; yeni tahakkuk üretilmez.

-- 3) Tek ayın tahakkuk tutarı (ileri tarihli kira artışı dahil) --------------------
create or replace function contract_amount_for(c contracts, m date)
returns numeric language sql stable as $$
  select case
    when c.next_rent_from is not null and m >= date_trunc('month', c.next_rent_from)::date
      then coalesce(c.next_rent_amount, c.rent_amount) + coalesce(c.next_dues_amount, c.dues_amount)
    else c.rent_amount + c.dues_amount
  end
$$;

-- 4) Tahakkuk aralığı: takip başlangıcı → (çıkış ayı | bitiş ayı [uzamıyorsa] | ∞)
create or replace function ensure_payment(c contracts, period date)
returns void as $$
declare
  m       date := date_trunc('month', period)::date;
  start_m date := greatest(
                    date_trunc('month', c.start_date)::date,
                    coalesce(date_trunc('month', c.tracking_start)::date, '0001-01-01'::date)
                  );
  dim int  := extract(day from (m + interval '1 month - 1 day'))::int;
  d   date := m + (least(c.payment_day, dim) - 1);
begin
  if m < start_m then return; end if;
  if c.status = 'terminated' then
    if c.terminated_at is null or m > date_trunc('month', c.terminated_at)::date then return; end if;
  elsif c.status <> 'active' then
    return;
  end if;
  if c.end_date is not null and not c.auto_renew
     and m > date_trunc('month', c.end_date)::date then
    return;
  end if;

  insert into payments (contract_id, period_month, due_date, amount_due, status)
  values (c.id, m, d, contract_amount_for(c, m), 'pending')
  on conflict (contract_id, period_month) do nothing;
end;
$$ language plpgsql;

-- 5) Tetikleyici: aralık dışı insert'i engelle — ama uzayan sözleşmeyi DURDURMA.
create or replace function payments_within_contract() returns trigger as $$
declare
  c contracts;
  sm date;
begin
  if new.kind = 'opening' then return new; end if;  -- başlangıç bakiyesi
  select * into c from contracts where id = new.contract_id;
  if not found or c.start_date is null then return new; end if;

  sm := date_trunc('month', c.start_date)::date;
  if new.period_month < sm then return null; end if;
  if c.terminated_at is not null
     and new.period_month > date_trunc('month', c.terminated_at)::date then
    return null;
  end if;
  if c.end_date is not null and not c.auto_renew
     and new.period_month > date_trunc('month', c.end_date)::date then
    return null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_payments_within_contract on payments;
create trigger trg_payments_within_contract
  before insert on payments
  for each row execute function payments_within_contract();

-- 6) Kira artışı: geçmiş korunur, seçilen aydan itibaren yeni tutar ---------------
--    security invoker → RLS geçerli (yalnızca erişebildiği sözleşme).
create or replace function apply_rent_change(
  p_contract uuid,
  p_effective date,
  p_rent numeric,
  p_dues numeric
) returns void
language plpgsql security invoker as $$
declare
  c   contracts;
  eff date := date_trunc('month', p_effective)::date;
  cur date := date_trunc('month', current_date)::date;
  m   date;
begin
  if p_rent is null or p_rent < 0 or p_dues is null or p_dues < 0 then
    raise exception 'invalid_amount';
  end if;
  select * into c from contracts where id = p_contract for update;
  if not found then raise exception 'contract_not_found'; end if;

  -- Artıştan önceki ayları ESKİ tutarla dondur (kayıt yoksa oluştur).
  m := greatest(date_trunc('month', c.start_date)::date,
                coalesce(date_trunc('month', c.tracking_start)::date, cur));
  while m < eff and m <= cur + interval '1 month' loop
    perform ensure_payment(c, m);
    m := (m + interval '1 month')::date;
  end loop;

  if eff <= cur then
    update contracts
       set rent_amount = p_rent, dues_amount = p_dues,
           next_rent_amount = null, next_dues_amount = null, next_rent_from = null
     where id = p_contract;
  else
    update contracts
       set next_rent_amount = p_rent, next_dues_amount = p_dues, next_rent_from = eff
     where id = p_contract;
  end if;

  -- Önceden oluşturulmuş (eff ve sonrası) dönemler yeni tutara çekilir;
  -- tahsil edilen tutarlar (amount_paid) olduğu gibi kalır.
  update payments p
     set amount_due = p_rent + p_dues,
         status = (case
           when p.amount_paid >= p_rent + p_dues then 'paid'
           when p.amount_paid > 0 and p.due_date < current_date then 'overdue'
           when p.amount_paid > 0 then 'partial'
           when p.due_date < current_date then 'overdue'
           else 'pending'
         end)::payment_status
   where p.contract_id = p_contract
     and p.kind = 'rent'
     and p.period_month >= eff;
end;
$$;

-- 7) Kiracı çıkışı ----------------------------------------------------------------
create or replace function terminate_contract(
  p_contract uuid,
  p_exit date,
  p_deposit_returned numeric,
  p_deposit_deduction numeric,
  p_note text
) returns void
language plpgsql security invoker as $$
begin
  update contracts
     set status = 'terminated',
         terminated_at = p_exit,
         deposit_returned = p_deposit_returned,
         deposit_deduction = p_deposit_deduction,
         deposit_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_contract;
  if not found then raise exception 'contract_not_found'; end if;
end;
$$;

-- 8) Sözleşme → daire bağı (yalnızca TEK ve kesin eşleşmede) ----------------------
--    Belirsiz (birden fazla aday) olanlara dokunulmaz; arayüz kullanıcıya seçtirir.
with candidates as (
  select c.id as contract_id, u.id as unit_id,
         count(*) over (partition by c.id) as n
    from contracts c
    join units u
      on u.company_id = c.company_id
     and lower(trim(u.building)) = lower(trim(c.property_name))
     and lower(trim(u.block)) = lower(trim(coalesce(c.block, '')))
     and lower(trim(u.unit_label)) = lower(trim(coalesce(c.unit, '')))
   where c.unit_id is null and coalesce(trim(c.unit), '') <> ''
)
update contracts c
   set unit_id = k.unit_id
  from candidates k
 where k.contract_id = c.id and k.n = 1;

grant execute on function apply_rent_change(uuid, date, numeric, numeric) to authenticated;
grant execute on function terminate_contract(uuid, date, numeric, numeric, text) to authenticated;
