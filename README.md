# Kira Asistan

Çok kullanıcılı, profesyonel kira takip mobil uygulaması. App Store ve Google Play yayınına uygun mimaride kuruldu.

## Teknolojiler

- **React Native 0.81 + Expo (SDK 54)** · Expo Router 6 (typed routes) · React 19
- **TypeScript** (strict mode)
- **TanStack Query** (sunucu durumu) + **Zustand** (istemci durumu)
- **React Hook Form + Zod** (form + doğrulama)
- **NativeWind / Tailwind** (iOS odaklı tasarım sistemi)
- **Lucide** ikonlar, **react-native-svg** grafikler
- **Supabase** (Postgres, Auth, Storage, Edge Functions) — Faz 2
- **Expo Notifications** — Faz 3

## Mimari

Feature-based + Repository pattern + Service layer. Veri erişimi tek bir
kompozisyon noktasından (`src/services/index.ts`) geçer; Faz 1'de mock
repository, Faz 2'de Supabase repository — **feature kodu değişmez**.

```
app/                         # Expo Router ekranları
  (auth)/                    # login, forgot-password
  (app)/(tabs)/              # dashboard, contracts, stats, settings
  (app)/contracts/[id].tsx   # sözleşme detayı
  (app)/contracts/new.tsx    # yeni sözleşme (RHF + Zod)
  (app)/users.tsx            # kullanıcı yönetimi
src/
  components/ui/             # Button, Card, Input, StatCard, Skeleton, ...
  components/charts/         # BarChart, DonutChart (SVG)
  features/
    auth/  contracts/  payments/  dashboard/  stats/  users/  notifications/
  services/repositories/     # types.ts + mock/ (+ supabase/ Faz 2)
  store/                     # zustand: auth, settings
  lib/                       # query, theme, utils, supabase client
  data/mock.ts               # Faz 1 mock veri
supabase/migrations/         # 0001_init.sql, 0002_rls.sql
```

## Kurulum

```bash
npm install
npx expo start            # QR -> Expo Go veya simülatör
```

> Faz 1, tamamen **mock veri** ile çalışır; backend gerektirmez.

## Özellikler (Faz 1 — tamamlandı)

- Giriş ekranı (e-posta, şifre, beni hatırla, şifremi unuttum)
- Dashboard: 4 özet kart + bugün/gecikmiş/yaklaşan ödemeler
- Sözleşme listesi: arama (mülk/kiracı/telefon) + filtreler
- Sözleşme detayı: kiracı/sahip/finans/koşul bilgileri, ödeme geçmişi
- Ödeme ekleme (kısmi ödeme + otomatik borç/durum hesaplama)
- "Mesaj Oluştur": otomatik hatırlatma metni, kopyala & paylaş
- İstatistikler: aylık tahsilat, geciken, başarı oranı (donut), aktif sözleşme
- Kullanıcı yönetimi: ekle, rol seç, aktif/pasif
- Ayarlar: bildirim tercihleri, tema seçimi, şirket
- Loading / empty / skeleton durumları

## Yol Haritası

| Faz | Kapsam | Durum |
|-----|--------|-------|
| 1 | Mimari + tüm ekranlar + mock veri | ✅ |
| 2 | Supabase: Auth, Postgres, RLS, Storage (PDF) | ✅ Kod hazır — kurulum: [SUPABASE.md](SUPABASE.md) |
| 3 | Expo Notifications (cihaz içi hatırlatmalar) | ✅ |
| 4 | Push Notifications + WhatsApp/SMS (Edge Function + cron) | Mimari uygun |
| 5 | App Store / Play Store yayını (EAS Build) | — |

### Faz 2 (Supabase) nasıl etkinleşir

`.env` içine `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY`
girildiğinde uygulama otomatik olarak Supabase'e geçer (repository + auth
provider pattern; ekran kodu değişmez). Adım adım kurulum: **[SUPABASE.md](SUPABASE.md)**.

## Demo giriş

Herhangi bir e-posta/şifre kabul edilir (mock auth).
`admin@vista.com` yönetici olarak, `ayse@vista.com` personel olarak giriş yapar.
