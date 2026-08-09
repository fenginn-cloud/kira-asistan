-- ============================================================================
-- Kira Asistan — Şirket seviyesinde abonelik / entitlement alanları
--
-- Bu migration YALNIZCA kalıcı alanları ekler. Ödeme (RevenueCat) entegrasyonu
-- ve limit/paywall ZORLAMASI bu adımda YOKTUR — böylece mevcut şirketler
-- (var olan sözleşmeleriyle) hiçbir şekilde bozulmaz.
--
-- Entitlement daima ŞİRKET seviyesindedir (haklar workspace'e aittir).
-- Çözümleme sırası (uygulama tarafında): legacy → business → pro → free.
--
-- Tekrar çalıştırılabilir (add column if not exists).
-- ============================================================================

alter table companies
  -- Aktif plan: 'free' | 'pro' | 'business'
  add column if not exists plan text not null default 'free',
  -- Abonelik durumu: 'none' | 'active' | 'trialing' | 'past_due'
  --                  | 'canceled' | 'legacy'
  add column if not exists subscription_status text not null default 'none',
  -- Erken dönem müşteriler için kalıcı ücretsiz hak (generic).
  add column if not exists is_legacy boolean not null default false,
  -- Legacy/özel hak türü, ör. 'legacy_business' (admin panelinden atanabilir).
  add column if not exists entitlement_type text,
  -- Ücretli aboneliğin bitiş/yenilenme tarihi (legacy'de NULL = süresiz).
  add column if not exists current_period_end timestamptz,
  -- Ödeme sağlayıcı referansları (ileride RevenueCat eşlemesi için).
  add column if not exists billing_provider text,
  add column if not exists billing_customer_id text;

comment on column companies.plan is
  'Aktif plan: free|pro|business. Legacy şirketlerde is_legacy önceliklidir.';
comment on column companies.is_legacy is
  'true ise şirket kalıcı olarak Business haklarına sahiptir (paywall görmez).';

-- NOT: Limit/paywall zorlaması sonraki adımda eklenecek. O adımda mevcut
-- şirketler (bu migration''dan önce oluşturulanlar) grandfathering ile
-- korunacak; bu migration tek başına davranışı DEĞİŞTİRMEZ.
