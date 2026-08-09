-- ============================================================================
-- Kira Asistan — Self-service hesap bootstrap (OTP sonrası)
--
-- Yeni self-service kayıt akışı için: e-posta OTP doğrulaması BAŞARILI olduktan
-- (session var + email_confirmed_at dolu) sonra uygulama bu RPC'yi çağırır ve
-- company + profile + notification_preferences kayıtlarını TEK işlemde oluşturur.
--
-- Tasarım ilkeleri:
--   * auth.users'a INSERT trigger'ı YOKTUR — oluşturma yalnızca doğrulama sonrası.
--   * Parametresiz: user_id/company_id/role client'tan ALINMAZ.
--   * Kimlik daima auth.uid(); e-posta + ad auth.users'tan güvenle okunur.
--   * Yeni self-service hesabın rolü DAİMA 'admin' (super_admin asla üretilemez).
--   * İdempotent: profil zaten varsa mevcut company_id döner, hiçbir şey yaratılmaz
--     → mevcut kullanıcıların (ör. eski müşteriler) company_id/role/verisi DEĞİŞMEZ.
--   * search_path sabit; SECURITY DEFINER; execute yalnız 'authenticated'.
--   * Mevcut bootstrap_account (ilk-admin) ve RLS politikaları DEĞİŞTİRİLMEZ.
--
-- Tekrar çalıştırılabilir (create or replace).
-- ============================================================================

create or replace function bootstrap_self_service_account()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid       uuid := auth.uid();
  v_confirmed timestamptz;
  v_email     text;
  v_name      text;
  v_cid       uuid;
begin
  -- 1) Kimlik doğrulaması zorunlu.
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- 2) İdempotentlik / mevcut hesap koruması: profil varsa hiçbir şey yaratma,
  --    mevcut company_id'yi döndür. (role, company_id, veri DEĞİŞMEZ.)
  select company_id into v_cid from profiles where id = v_uid;
  if v_cid is not null then
    return v_cid;
  end if;

  -- 3) Doğrulanmış e-posta + metadata'yı GÜVENLİ kaynaktan (auth.users) al.
  select email, email_confirmed_at, nullif(trim(raw_user_meta_data->>'full_name'), '')
    into v_email, v_confirmed, v_name
    from auth.users
   where id = v_uid;

  if v_confirmed is null then
    raise exception 'email_not_verified';
  end if;

  -- 4) company + profile + notification_preferences — tek transaction.
  insert into companies (name)
    values (coalesce(v_name, split_part(coalesce(v_email, ''), '@', 1), 'Şirketim'))
    returning id into v_cid;

  insert into profiles (id, company_id, email, full_name, role, is_active)
    values (v_uid, v_cid, coalesce(v_email, ''), coalesce(v_name, ''), 'admin', true);

  insert into notification_preferences (user_id)
    values (v_uid)
    on conflict do nothing;

  return v_cid;
end;
$$;

-- Yalnızca oturumlu kullanıcı çağırabilsin.
revoke all on function bootstrap_self_service_account() from public, anon;
grant execute on function bootstrap_self_service_account() to authenticated;
