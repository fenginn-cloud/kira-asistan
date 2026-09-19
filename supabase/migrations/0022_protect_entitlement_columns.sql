-- ============================================================================
-- Kira Asistan — Entitlement sütunlarını client yazımına kapat
--
-- SORUN: companies_update RLS politikası satır bazlıdır; sütun kısıtlamaz.
-- Bu yüzden bir admin, doğrudan PostgREST PATCH ile
--   { "plan": "business" } / { "subscription_status": "active" }
-- gönderip planını yükseltebilir. Abonelik alanları YALNIZCA güvenilir
-- server-side (service_role → RevenueCat webhook) tarafından yazılmalı.
--
-- ÇÖZÜM: `authenticated` rolünden companies UPDATE yetkisini kaldır ve yalnızca
-- düzenlenebilir profil sütunları için sütun bazlı UPDATE ver. Böylece plan/
-- abonelik sütunları client tarafından güncellenemez. service_role bu
-- kısıtlamadan etkilenmez (webhook güncellemeye devam eder).
--
-- NOT: RLS SELECT/UPDATE politikaları (0002) aynen kalır; bu migration yalnızca
-- SÜTUN düzeyinde yazma yetkisini daraltır. Uygulamanın şirket profili
-- güncellemesi (ad, telefon, adres, logo, para birimi, bildirim günleri)
-- çalışmaya devam eder — fromCompany() zaten yalnızca bu sütunları yazıyor.
--
-- Tekrar çalıştırılabilir.
-- ============================================================================

-- Tablo düzeyi UPDATE yetkisini kaldır (varsa).
revoke update on public.companies from authenticated;

-- Yalnızca düzenlenebilir profil sütunlarına UPDATE ver.
grant update (
  name,
  phone,
  email,
  address,
  tax_office,
  tax_number,
  logo_url,
  currency,
  default_notification_days
) on public.companies to authenticated;

-- Bilgi amaçlı: aşağıdaki sütunlar KASITLI olarak verilmedi; client bunları
-- güncelleyemez (yalnızca service_role/webhook yazar):
--   plan, subscription_status, is_legacy, entitlement_type,
--   current_period_end, billing_provider, billing_customer_id
