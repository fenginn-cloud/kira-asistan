# App Store'da satışa çıkış — kontrol listesi

## Kodda hazır olanlar
- Bundle ID `com.kiraasistan.app`, EAS projesi, `production-ios` derleme ve gönderim profili (`eas.json`).
- Uygulama içi satın alma (RevenueCat), "Satın Alımları Geri Yükle", abonelik yenileme açıklaması.
- Abonelik ekranında Kullanım Şartları ve Gizlilik Politikası bağlantıları (Guideline 3.1.2).
- Uygulama içinden hesap silme (Profil → Hesabı Sil, `delete-account` fonksiyonu) (Guideline 5.1.1(v)).
- Gizlilik manifesti (`app.json` → `ios.privacyManifests`), şifreleme beyanı (`ITSAppUsesNonExemptEncryption: false`).
- Yalnızca fotoğraf arşivi izni (kamera/mikrofon istenmez); iPad desteği kapalı (yalnızca iPhone ekran görüntüsü gerekir).

## Sizin yapmanız gerekenler (dış hesaplar)
1. **App Store Connect → Anlaşmalar, Vergi ve Bankacılık:** Ücretli Uygulamalar anlaşması imzalı, banka ve vergi bilgisi girili olmalı. Yoksa abonelik satılamaz.
2. **Abonelik ürünleri:** Bir abonelik grubu altında `pro_yearly` (3.999 TL/yıl) ve `business_yearly` (11.999 TL/yıl). Her birine görünen ad, açıklama ve inceleme ekran görüntüsü.
3. **RevenueCat:** App Store uygulamasını bağlayın (In-App Purchase anahtarı). Entitlement'lar `pro`, `business`; ürünleri bağlayın; varsayılan Offering oluşturun.
4. **RevenueCat iOS anahtarı (`appl_...`):** Canlı derlemede tanımlı DEĞİL. Tanımlanmazsa mağaza sürümünde satın alma çalışmaz ve inceleme reddedilir:
   ```bash
   eas env:create --environment production --name EXPO_PUBLIC_RC_IOS_KEY --value appl_XXXX --visibility plaintext
   ```
   `preview` profilindeki `test_...` anahtarı mağaza için geçersizdir.
5. **Webhook:** `revenuecat-webhook` Edge Function'ı deploy edin, `REVENUECAT_WEBHOOK_SECRET` tanımlayın, RevenueCat'te webhook URL'sini girin (bkz. REVENUECAT.md).
6. **Uygulama sayfası:** ad, alt başlık, açıklama, anahtar kelimeler, destek URL'si, gizlilik politikası URL'si (`https://<alan-adı>/yasal/gizlilik`), kategori (İş / Finans), yaş derecelendirmesi.
7. **App Privacy (gizlilik etiketleri):** E-posta, ad, telefon, satın alma geçmişi — "uygulama işlevi", kullanıcıya bağlı, takip yok. Kiracı/mülk sahibi bilgileri "Diğer kullanıcı içeriği" olarak beyan edilmeli.
8. **Ekran görüntüleri:** 6.9" iPhone (1320×2868), en az 3 adet.
9. **İnceleme notu:** Apple'a dolu verili bir demo hesabı (e-posta + şifre) verin; abonelik testi sandbox ile yapılır.
10. **Derleme ve gönderim** (`credentials/ios/AuthKey_3K59B5FTDX.p8` yerelde bulunmalı, repoda yok):
    ```bash
    eas build --platform ios --profile production-ios
    ```
    ```bash
    eas submit --platform ios --profile production-ios
    ```
11. **TestFlight'ta sandbox satın alma testi:** satın al → geri yükle → Supabase'de `companies.plan` güncellendi mi kontrol edin.
