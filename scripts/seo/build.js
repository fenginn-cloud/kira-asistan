/**
 * SEO statik sayfalarını dist/ içine üretir (expo export + pwa-postbuild SONRASI çalışır).
 *   node scripts/seo/build.js
 * Supabase URL/anon key (e-posta hatırlatma formu için) EXPO_PUBLIC_SUPABASE_* env'den
 * veya yereldeki .env'den okunur; yoksa form gizlenir, sayfalar yine üretilir.
 */
const fs = require('fs');
const path = require('path');
const { SITE, readEnv } = require('./lib');
const kiraArtis = require('./kira-artis');
const sablonlar = require('./sablonlar');

const ROOT = path.join(__dirname, '..', '..');
const DIST = path.join(ROOT, 'dist');

if (!fs.existsSync(DIST)) {
  console.error('[seo] dist/ yok — önce expo export çalıştırın.');
  process.exit(1);
}

const env = readEnv(ROOT);
if (env.CF_BEACON_TOKEN) process.env.CF_BEACON_TOKEN = env.CF_BEACON_TOKEN;
else console.warn('[seo] CF_BEACON_TOKEN yok — ziyaretçi ölçümü eklenmedi.');
const supa =
  env.EXPO_PUBLIC_SUPABASE_URL && env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    ? { url: env.EXPO_PUBLIC_SUPABASE_URL.replace(/\/$/, ''), key: env.EXPO_PUBLIC_SUPABASE_ANON_KEY }
    : null;
if (!supa) console.warn('[seo] Supabase env yok — hatırlatma formu gizlenecek.');

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'kira-artis-oranlari.json'), 'utf8'));

(async () => {
const paths = ['/', '/ozellikler', ...kiraArtis.build(DIST, data, supa), ...(await sablonlar.build(DIST))];

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${SITE}${p === '/' ? '/' : p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`
);
// Oran verisi herkese açık JSON olarak da yayınlanır (hatırlatma e-postası fonksiyonu buradan okur).
fs.mkdirSync(path.join(DIST, 'data'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'data', 'kira-artis-oranlari.json'), path.join(DIST, 'data', 'kira-artis-oranlari.json'));

fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`[seo] ${paths.length - 2} SEO sayfası + sitemap.xml + robots.txt üretildi.`);
})().catch((e) => {
  console.error('[seo] HATA:', e);
  process.exit(1);
});
