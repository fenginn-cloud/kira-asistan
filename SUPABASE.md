# Supabase Kurulumu (Faz 2)

Uygulama, `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` tanımlı
olduğunda otomatik olarak mock veriden **gerçek Supabase backend'ine** geçer.
Hiçbir ekran kodu değişmez (repository + auth provider pattern).

## 1) Proje oluştur
1. https://supabase.com → **New project**
2. **Settings → API Keys**:
   - **Publishable key** (`sb_publishable_...`) → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
     (Supabase'in yeni arayüzünde eski "anon public" anahtarının adı budur.)
   - ⚠️ **Secret key** (`sb_secret_...`) uygulamaya KONMAZ.
3. **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`. Bu sayfada yoksa **Settings →
   General**'da ya da proje URL'indeki kimlikten: `https://<proje-ref>.supabase.co`

## 2) Ortam değişkenleri
Proje kökünde `.env` oluştur (`.env.example`'ı kopyala):

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

## 3) Veritabanı şemasını kur
**En kolayı:** `supabase/setup.sql` dosyasının tamamını kopyala, Supabase
**SQL Editor**'a yapıştır ve **Run**. (Üç migration tek dosyada birleşik.)

Ayrı ayrı yapmak istersen sırayla: `migrations/0001_init.sql` →
`0002_rls.sql` → `0003_payments_storage.sql`. CLI: `supabase db push`.

## 4) İlk kullanıcı + şirket
1. **Authentication → Users → Add user** ile e-posta + şifre oluştur ("Auto
   Confirm User" işaretli olsun). Bu senin **admin** hesabın olacak.
2. **SQL Editor**'da aşağıdaki bloğu aç, sadece üç değeri kendine göre değiştir
   (e-posta tam olarak 1. adımdakiyle aynı olmalı) ve **Run**:

```sql
do $$
declare uid uuid; cid uuid;
begin
  select id into uid from auth.users where email = 'senin@email.com';
  insert into companies (name) values ('Şirket Adınız') returning id into cid;
  insert into profiles (id, company_id, email, full_name, role)
    values (uid, cid, 'senin@email.com', 'Ad Soyad', 'admin');
  insert into notification_preferences (user_id) values (uid) on conflict do nothing;
end $$;
```

> Not: `bootstrap_account` fonksiyonu uygulama içi kayıt akışı içindir (oturumlu
> `auth.uid()` gerekir); SQL Editor'da çalışmaz, o yüzden yukarıdaki blok kullanılır.

## 5) Çalıştır
```powershell
npx expo start -c
```
Uygulama artık Supabase'e bağlı. Giriş ekranına gerçek e-posta/şifrenle gir.

## Notlar
- **Ödeme kayıtları:** Sözleşme oluşturulduğunda o ayın ödeme satırı otomatik
  oluşur (`trg_contract_payment`). Aylık toplu üretim için
  `select generate_monthly_payments();` fonksiyonu var — ileride pg_cron / Edge
  Function ile aylık tetiklenecek (Faz 4).
- **Borç & durum:** Ödeme eklendiğinde `recalc_payment` trigger'ı tutarı ve
  durumu (ödendi/kısmi/bekliyor/gecikti) otomatik günceller.
- **PDF:** `contracts` private bucket'ına `şirket/sözleşme/dosya` yoluna yüklenir;
  görüntülerken imzalı URL üretilir. RLS yalnızca kendi şirketinin dosyalarına
  izin verir.
- **Yeni kullanıcı davetiyesi:** Kullanıcı Yönetimi şu an profil satırı ekler;
  gerçek auth kullanıcısı + davet e-postası için bir Edge Function (service role)
  eklenecek (Faz 4). Şimdilik yeni kullanıcıları Supabase Dashboard'dan
  oluşturabilirsin.
- **RLS:** Tüm tablolar şirket bazında izole; personel yalnızca kendine atanmış
  sözleşmeleri görür, admin tüm şirketi, super_admin her şeyi.
```
