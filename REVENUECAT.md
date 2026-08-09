# RevenueCat Entegrasyonu (Go-Live)

Para/hesaplar hazır olduğunda uygulama içi satın almayı (Pro/Business) devreye
almak için adımlar. Kod tarafı **hazır**: webhook fonksiyonu ve satın alma
soyutlaması eklendi; sadece hesap açıp anahtarları girmen ve deploy etmen yeterli.

## Önkoşullar (maliyetli)
- **Apple Developer Program** — ~$99/yıl (iOS IAP)
- **Google Play Console** — $25 tek sefer (Android Billing)
- **RevenueCat** hesabı — ücretsiz kotalı

## 1) Store ürünlerini tanımla
Her iki mağazada da **yıllık abonelik** ürünleri oluştur:
| Ürün ID | Plan | Fiyat |
|---------|------|-------|
| `pro_yearly` | Pro | 1.799 TL/yıl |
| `business_yearly` | Business | 9.599 TL/yıl |

- App Store Connect → Subscriptions
- Play Console → Monetize → Subscriptions

## 2) RevenueCat kurulumu
1. RevenueCat → **Project** oluştur, App Store + Play Store uygulamalarını bağla
   (App Store shared secret + Play service account JSON).
2. **Entitlements** oluştur: `pro`, `business`.
3. **Products** ekle (`pro_yearly`, `business_yearly`) ve ilgili entitlement'a bağla.
4. **Offerings** oluştur (paywall'da gösterilecek paketler).

## 3) Webhook (backend — kod hazır)
Fonksiyon: `supabase/functions/revenuecat-webhook/index.ts`
1. Supabase → Edge Functions → **Deploy** (`revenuecat-webhook`).
2. Bir gizli değer belirle; Supabase → Edge Functions → **Secrets** →
   `REVENUECAT_WEBHOOK_SECRET`.
3. RevenueCat → Integrations → **Webhooks**:
   - URL: `https://<proje-ref>.functions.supabase.co/revenuecat-webhook`
   - Authorization header: (aynı gizli değer)
4. Webhook, `app_user_id`'yi `auth.uid()` kabul eder → `profiles` → `companies`'i
   günceller (`plan`, `subscription_status`, `current_period_end`). **Legacy
   şirketlere dokunmaz.**

## 4) İstemci SDK (kod iskeleti hazır)
Dosya: `src/services/purchases/index.ts` (şu an no-op, `available=false`).
1. `npx expo install react-native-purchases` (+ **EAS/dev build** — Expo Go/web'de çalışmaz).
2. `revenueCatPurchases` implementasyonunu doldur (SDK ile purchase/restore).
3. `purchases` export'unu ona yönlendir.
4. **Önemli:** oturum açılınca `Purchases.logIn(session.user.id)` çağır — böylece
   `app_user_id = auth.uid()` olur ve webhook doğru şirketi bulur.
5. Paywall'daki "yakında" notunu gerçek satın alma butonlarıyla değiştir
   (`purchases.purchase('pro' | 'business')`).

## 5) Doğrulama
- Sandbox (Apple) / test track (Google) ile test satın alma yap.
- RevenueCat → Customer'da entitlement'ın aktif olduğunu gör.
- Webhook sonrası Supabase'de `companies.plan` güncellenmiş olmalı.
- Uygulamada `resolveEntitlement` planı otomatik açar (kod hazır).

## Web (PWA) ödemesi — ayrı yol
IAP web'de yoktur. `kiraasist.fngn.com.tr` için ileride **Iyzico/Stripe** ile
ayrı bir akış gerekir (aynı `companies` entitlement alanları güncellenir).
Bu, C alt-fazından bağımsız D alt-fazıdır.
