# App Store & Google Play Yayın Checklist

Kira Asistan'ı mağazalara çıkarmak için adım adım hazırlık. (EAS Build tabanlı.)
Uygulama bugün PWA olarak yayında; native yayın IAP için gereklidir.

## 0) Hesaplar
- [ ] Apple Developer Program (~$99/yıl)
- [ ] Google Play Console ($25 tek sefer)
- [ ] Expo hesabı (EAS Build — ücretsiz kotalı)

## 1) Proje kimliği (mevcut — `app.json`)
- [x] iOS `bundleIdentifier`: `com.kiraasistan.app`
- [x] Android `package`: `com.kiraasistan.app`
- [x] Sürüm: `1.0.0`
- [ ] `ios.buildNumber` / `android.versionCode` yönetimi (EAS auto-increment önerilir)

## 2) EAS Build kurulumu
```bash
npm install -g eas-cli
eas login
eas build:configure          # eas.json oluşturur
```
- [ ] `eas.json` içine production profilleri (iOS/Android)
- [ ] Ortam değişkenleri: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
      (EAS secrets olarak)

## 3) Uygulama içi satın alma
- [ ] `react-native-purchases` ekle (bkz. `REVENUECAT.md`)
- [ ] Store abonelik ürünleri: `pro_yearly`, `business_yearly`
- [ ] RevenueCat webhook deploy + secret (bkz. `REVENUECAT.md`)
- [ ] Paywall'da gerçek satın alma butonları
> Apple/Google, dijital abonelikte **kendi IAP'lerini zorunlu** kılar; harici
> ödeme linki reddedilir.

## 4) Mağaza materyalleri
- [ ] Uygulama ikonu / splash (mevcut `assets/`)
- [ ] Ekran görüntüleri (iPhone + iPad + Android; TR)
- [ ] Açıklama metni, anahtar kelimeler, kategori (Finans/İş)
- [ ] Gizlilik politikası URL'i: `https://kiraasist.fngn.com.tr/yasal/gizlilik`
- [ ] Destek URL'i + iletişim e-postası

## 5) Uyumluluk / politika
- [ ] Apple **App Privacy** formu (toplanan veriler: hesap, kullanım, içerik)
- [ ] Google **Data safety** formu
- [ ] Abonelik/mesafeli satış koşulları linki (uygulama içi + mağaza)
- [ ] Hesap silme akışı (Apple şartı) — kullanıcı hesabını silebilmeli
- [ ] `ITSAppUsesNonExemptEncryption=false` (mevcut `app.json`)

## 6) Build & gönderim
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios
eas submit --platform android
```
- [ ] TestFlight / Kapalı test (internal testing)
- [ ] Sandbox IAP testi (Apple) / test satın alma (Google)
- [ ] İncelemeye gönder

## 7) Yayın sonrası
- [ ] RevenueCat canlı olayları izle
- [ ] Supabase `companies.plan` webhook ile güncelleniyor mu doğrula
- [ ] Sürüm yükseltmelerinde `versionCode`/`buildNumber` artır

## Notlar
- Legacy müşteri (ör. Emre) IAP'siz Business haklarını korur — kod hazır.
- Web (PWA) ödemesi ayrı: Iyzico/Stripe (D alt-fazı).
