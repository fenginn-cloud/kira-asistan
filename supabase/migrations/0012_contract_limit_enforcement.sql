-- ============================================================================
-- Kira Asistan — Sunucu tarafı sözleşme limiti (Free plan)
--
-- UI gate'ini (paywall) veritabanı seviyesinde de zorlar; böylece API'yi
-- doğrudan çağırarak limit aşılamaz.
--
-- Strateji: "yalnızca YENİ kayıtta engelle" — BEFORE INSERT trigger'ı.
--   * Mevcut satırlara DOKUNMAZ (yalnızca insert kontrol edilir).
--   * Entitlement çözümlemesi uygulamayla AYNI: legacy → business → pro → free.
--   * Legacy (ör. Emre) ve aktif Pro/Business → sınırsız, asla engellenmez.
--   * Free → en fazla 3 sözleşme; 3'e ulaşmış şirkette yeni insert reddedilir.
--
-- Tekrar çalıştırılabilir (create or replace + drop trigger if exists).
-- ============================================================================

create or replace function enforce_contract_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company   companies%rowtype;
  v_unlimited boolean := false;
  v_count     integer;
  free_limit  constant integer := 3;
begin
  select * into v_company from companies where id = new.company_id;
  if not found then
    -- Şirket yoksa FK kısıtı devreye girsin; burada karar verme.
    return new;
  end if;

  -- Entitlement (resolveEntitlement ile birebir).
  if v_company.is_legacy then
    v_unlimited := true;
  elsif v_company.subscription_status in ('active', 'trialing')
        and v_company.plan in ('pro', 'business') then
    v_unlimited := true;
  end if;

  if v_unlimited then
    return new;
  end if;

  -- Free plan: mevcut sözleşme sayısı limite ulaştıysa yeni eklemeyi engelle.
  select count(*) into v_count from contracts where company_id = new.company_id;
  if v_count >= free_limit then
    raise exception 'contract_limit_reached'
      using hint = 'Ücretsiz planda en fazla 3 sözleşme eklenebilir.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_contract_limit on contracts;
create trigger trg_enforce_contract_limit
  before insert on contracts
  for each row execute function enforce_contract_limit();
