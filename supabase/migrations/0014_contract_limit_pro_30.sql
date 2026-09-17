-- ============================================================================
-- Kira Asistan — Sözleşme limiti güncellemesi: Pro 99 → 30
--
-- 0013'teki enforce_contract_limit() fonksiyonunu, ücretli Pro planının
-- sözleşme limitini 99'dan 30'a çekecek şekilde günceller. Free (3),
-- Business (sınırsız) ve legacy (sınırsız) davranışı değişmez.
-- Yalnızca YENİ insert kontrol edilir; mevcut satırlara dokunulmaz — bu
-- yüzden hâlihazırda 30'dan fazla sözleşmesi olan Pro şirketler etkilenmez,
-- yeni sözleşme eklemeleri sınıra ulaşana dek durur.
--
-- Tekrar çalıştırılabilir (create or replace).
-- ============================================================================

create or replace function enforce_contract_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company companies%rowtype;
  v_limit   integer;          -- null = sınırsız
  v_count   integer;
begin
  select * into v_company from companies where id = new.company_id;
  if not found then
    return new;
  end if;

  -- Etkin plan limiti (resolveEntitlement ile birebir).
  if v_company.is_legacy then
    v_limit := null;                                   -- legacy: sınırsız
  elsif v_company.subscription_status in ('active', 'trialing') then
    if v_company.plan = 'business' then
      v_limit := null;                                 -- Business: sınırsız
    elsif v_company.plan = 'pro' then
      v_limit := 30;                                   -- Pro: 30 (eski 99)
    else
      v_limit := 3;                                    -- güvenli varsayılan
    end if;
  else
    v_limit := 3;                                      -- Free / aktif olmayan
  end if;

  if v_limit is null then
    return new;
  end if;

  select count(*) into v_count from contracts where company_id = new.company_id;
  if v_count >= v_limit then
    raise exception 'contract_limit_reached'
      using hint = 'Plan sözleşme limitine ulaşıldı.';
  end if;

  return new;
end;
$$;

-- Trigger 0012'de oluşturuldu; fonksiyon güncellendiği için yeniden bağlamaya
-- gerek yok. Idempotent olması için yine de garanti altına al:
drop trigger if exists trg_enforce_contract_limit on contracts;
create trigger trg_enforce_contract_limit
  before insert on contracts
  for each row execute function enforce_contract_limit();
