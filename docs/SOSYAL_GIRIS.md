# Google ve Apple ile giriş (web) — kurulum

Kod hazır: giriş ve kayıt ekranlarında "Google ile devam et" / "Apple ile devam et"
butonları **yalnızca web'de** görünür. Mobil uygulama sonraki sürümde eklenecek.

Akış: buton → Supabase → Google/Apple sayfası → `https://kiraasist.fngn.com.tr/login`
adresine dönüş → oturum yakalanır → ilk kez giren kullanıcı için şirket + profil
otomatik oluşturulur (`bootstrap_self_service_account`, idempotent). Aynı e-postayla
daha önce kayıt olmuş kullanıcı, Supabase'in otomatik hesap bağlamasıyla aynı
hesaba girer (e-posta doğrulanmışsa).

Supabase geri dönüş adresi (her iki sağlayıcıda da kullanılır):
`https://vhwbjyfuzrgtwsxirryl.supabase.co/auth/v1/callback`

## 1) Supabase → Authentication → URL Configuration
- Site URL: `https://kiraasist.fngn.com.tr`
- Redirect URLs: `https://kiraasist.fngn.com.tr/**` ekleyin.

## 2) Google
1. Google Cloud Console → yeni proje (ör. "Kira Asistan").
2. APIs & Services → OAuth consent screen: External, uygulama adı, destek e-postası,
   yetkili alan adı `fngn.com.tr`, gizlilik/kullanım şartları bağlantıları.
3. Credentials → Create credentials → OAuth client ID → **Web application**:
   - Authorized JavaScript origins: `https://kiraasist.fngn.com.tr`
   - Authorized redirect URIs: `https://vhwbjyfuzrgtwsxirryl.supabase.co/auth/v1/callback`
4. Client ID + Client Secret → Supabase → Authentication → Providers → Google → Enable.

## 3) Apple
1. Apple Developer → Identifiers → **Services IDs** → yeni (ör. `com.kiraasistan.web`),
   "Sign in with Apple" işaretli → Configure:
   - Primary App ID: `com.kiraasistan.app`
   - Domains: `vhwbjyfuzrgtwsxirryl.supabase.co`, `kiraasist.fngn.com.tr`
   - Return URLs: `https://vhwbjyfuzrgtwsxirryl.supabase.co/auth/v1/callback`
2. App ID `com.kiraasistan.app` → "Sign in with Apple" yeteneğini açın.
3. Keys → yeni anahtar, "Sign in with Apple" → `.p8` indirin (bir kez indirilir).
4. Supabase → Providers → Apple → Enable: Services ID, Team ID (`NKQAA2G26N`),
   Key ID ve `.p8` içeriği. Apple'ın gizli anahtarı (client secret) 6 ayda bir
   yenilenmelidir.

## Mobil (sonraki sürüm)
- iOS: `expo-apple-authentication` (telefonun kendi penceresi) + Google için ayrı
  iOS OAuth istemcisi; yeni derleme gerekir.
- Apple kuralı 4.8: uygulamada Google varsa Apple ile giriş de zorunlu.
