# Blog yazım kuralları (yazar ajan için)

Bu kurallar Kira Asistan blogunun kalitesini ve Google'daki güvenilirliğini korur. Her yazıda uyulur.

## Okur ve amaç
- Okur: Türkiye'de kiralık mülkü olan **ev sahipleri**, **emlak ofisleri**, **site yöneticileri**.
- Amaç: Okurun gerçek bir sorununu çözen, pratik, dürüst bir rehber. Satış metni değil.
- Kira Asistan'dan **en fazla iki yerde**, doğal bir şekilde bahsedilir (ör. "bunu bir kira takip uygulamasıyla otomatik yapabilirsiniz"). Sayfanın sonundaki kayıt çağrısı otomatik eklenir; metne ayrıca eklenmez.

## Doğruluk (en önemli kural)
- **Rakam, oran, tarih, kanun maddesi, ceza veya süre uydurma.** Emin olmadığın hiçbir sayıyı yazma.
- Kira artış oranı gerekiyorsa yalnızca `data/kira-artis-oranlari.json` içindeki değerleri kullan ve ayını belirt; ya da okuru [Kira Artış Hesaplama](/kira-artis-hesaplama) sayfasına yönlendir.
- Hukuki konularda genel ilkeyi anlat, kesin hüküm verme; "bir avukata danışın" de ve JSON'da `"legal": true` yap. Türk Borçlar Kanunu madde numarası ancak kesin biliyorsan yazılır.
- İstatistik, anket sonucu, "uzmanlar diyor ki" gibi kaynaksız iddialar yazma.
- Uygulamada olmayan bir özellikten bahsetme. Kira Asistan'ın yaptıkları: tahsilat takibi (kısmi ödeme, geri alma), geciken/yaklaşan ödemeler, cari hesap, sözleşme uzatma, kira artışı, kiracı çıkışı ve depozito kaydı, bina/daire doluluğu, kiracıya hazır WhatsApp mesajı (kullanıcı kendisi gönderir; **otomatik mesaj gönderilmez**), Excel'den aktarma (Pro), personel hesapları (Business), iPhone uygulaması ve web.

## Biçim
- Dosya: `content/blog/<slug>.json`. Biçim `scripts/seo/blog.js` dosyasının başında anlatılıyor; mevcut yazıları örnek al.
- `slug`: Türkçe karakter yok, küçük harf, tireli (ör. `depozito-iadesi-nasil-yapilir`).
- `title` ≤ 60 karakter, `description` ≤ 155 karakter; ikisi de aranacak ifadeyi içersin.
- 800–1400 kelime; en az 3 bölüm (`sections`), en az 5 SSS (`faqs`).
- Kısa paragraflar (2–4 cümle). Adım adım listeler kullan.
- İç bağlantılar: uygun yerde site içi sayfalara bağlantı ver: `[metin](/kira-artis-hesaplama)`, `[kira sözleşmesi örneği](/sablonlar/kira-sozlesmesi-ornegi)`, `[tahliye taahhütnamesi](/sablonlar/tahliye-taahhutnamesi-ornegi)`, `[kira ödeme ihtarnamesi](/sablonlar/kira-odeme-ihtarnamesi-ornegi)`, `[depozito tutanağı](/sablonlar/depozito-teslim-iade-tutanagi)`, `[daire teslim tutanağı](/sablonlar/daire-teslim-tutanagi)` ve diğer blog yazıları (`/blog/<slug>`). Dış bağlantı verme.
- Dil: sade, samimi ama profesyonel Türkçe; "siz" hitabı. Yapay zekâ kalıplarından kaçın ("Sonuç olarak", "Günümüzde", "Bu yazımızda" gibi girişler; abartılı sıfatlar).
- Yinelenen içerik yok: yeni yazı, mevcut yazılarla aynı konuyu tekrar anlatmaz; gerekirse onlara bağlantı verir.

## Kontrol
Commit etmeden önce:
```bash
node scripts/seo/blog.js --check
```
Hata varsa düzelt; hata kalmadan yayınlama.
