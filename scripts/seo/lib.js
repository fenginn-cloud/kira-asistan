/**
 * SEO statik sayfa yardımcıları — ortak layout, JSON-LD, biçimlendirme.
 *
 * Sayfalar build sırasında saf HTML olarak üretilir (React bundle YOK);
 * tasarım dili uygulamayla aynı: Plus Jakarta Sans, 20px kart yarıçapı,
 * pill butonlar, #F2F4F7 arka plan. Marka rengi #1560E7.
 */
const fs = require('fs');
const path = require('path');

const SITE = 'https://kiraasist.fngn.com.tr';
const BRAND = 'Kira Asistan';
const DISCLAIMER = 'Bilgilendirme amaçlıdır, hukuki danışmanlık yerine geçmez.';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const AY_SLUG = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 1234.5 → "1.234,50 ₺" */
const tl = (n) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
/** 31.23 → "%31,23" */
const pct = (n) => '%' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "2026-11" → { y: 2026, m: 11, label: "Kasım 2026", slug: "2026-kasim" } */
function monthInfo(key) {
  const [y, m] = key.split('-').map(Number);
  return { key, y, m, label: `${AYLAR[m - 1]} ${y}`, slug: `${y}-${AY_SLUG[m - 1]}` };
}
/** Bir önceki ayın etiketi (TÜFE verisinin ait olduğu ay). */
function prevMonthLabel(key) {
  const { y, m } = monthInfo(key);
  return m === 1 ? `Aralık ${y - 1}` : `${AYLAR[m - 2]} ${y}`;
}

const registerUrl = (slug) => `/register?utm_source=seo&utm_medium=${encodeURIComponent(slug)}`;

function cta(slug, text = 'Kiracılarını ücretsiz takip et') {
  return `<aside class="cta">
  <p class="cta-t">${esc(text)}</p>
  <p class="cta-d">Kira günlerini, artış tarihlerini ve ödemeleri tek yerde tut. Hatırlatmaları ${BRAND} yapsın.</p>
  <a class="btn" href="${registerUrl(slug)}">${BRAND}'ı dene →</a>
</aside>`;
}

function faqSection(faqs) {
  return `<section><h2>Sıkça Sorulan Sorular</h2>
${faqs.map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n')}
</section>`;
}

function breadcrumbHtml(crumbs) {
  return `<nav class="bc" aria-label="Breadcrumb">${crumbs
    .map((c, i) =>
      i === crumbs.length - 1 ? `<span aria-current="page">${esc(c.name)}</span>` : `<a href="${c.path}">${esc(c.name)}</a>`
    )
    .join(' <span class="sep">›</span> ')}</nav>`;
}

function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

const CSS = `
:root{--brand:#1560E7;--brand-d:#0F4BC0;--brand-50:#EEF4FE;--bg:#F2F4F7;--surface:#fff;--fg:#0F172A;--muted:#64748B;--border:#E2E8F0;--ok:#16A34A;--warn:#D97706}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
a{color:var(--brand)}
.top{background:var(--surface);border-bottom:1px solid var(--border)}
.top .in{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;max-width:820px;margin:0 auto}
.logo{font-weight:800;color:var(--fg);text-decoration:none;font-size:18px}.logo b{color:var(--brand)}
.top .btn{padding:8px 16px;font-size:14px}
main{max-width:820px;margin:0 auto;padding:16px 16px 48px}
.bc{font-size:13px;color:var(--muted);margin:4px 0 12px}.bc a{color:var(--muted);text-decoration:none}.bc .sep{margin:0 4px}
h1{font-size:28px;line-height:1.25;margin:0 0 8px;font-weight:800;letter-spacing:-.02em}
h2{font-size:21px;line-height:1.3;margin:32px 0 10px;font-weight:800}
h3{font-size:17px;margin:20px 0 6px}
.lead{color:var(--muted);margin:0 0 16px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:18px}
label{display:block;font-weight:600;font-size:14px;margin:0 0 6px}
input[type=text],input[type=email],select{width:100%;font:inherit;padding:12px 14px;border:1.5px solid var(--border);border-radius:14px;background:#fff;color:var(--fg)}
input:focus,select:focus{outline:none;border-color:var(--brand)}
.grid2{display:grid;gap:12px}
@media(min-width:560px){.grid2{grid-template-columns:1fr 1fr}h1{font-size:34px}}
.res{margin-top:16px;display:grid;gap:10px}
.res .row{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:14px;background:var(--bg)}
.res .row.big{background:var(--brand-50);font-size:19px;font-weight:800;color:var(--brand)}
.res .row span:last-child{font-weight:700;text-align:right}
.note{font-size:13px;color:var(--muted)}
.warn{color:var(--warn);font-weight:600}
.btn{display:inline-block;background:var(--brand);color:#fff;text-decoration:none;font-weight:700;border:0;border-radius:999px;padding:12px 22px;font:inherit;font-weight:700;cursor:pointer}
.btn:hover{background:var(--brand-d)}
.btn[disabled]{opacity:.6;cursor:default}
.cta{margin:28px 0;background:var(--brand);color:#fff;border-radius:20px;padding:20px}
.cta-t{font-size:19px;font-weight:800;margin:0 0 4px}.cta-d{margin:0 0 14px;opacity:.9}
.cta .btn{background:#fff;color:var(--brand)}
table{width:100%;border-collapse:collapse;background:var(--surface);border-radius:16px;overflow:hidden;border:1px solid var(--border);font-size:15px}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--border)}
th{background:var(--bg);font-size:13px;color:var(--muted);font-weight:700}
tr:last-child td{border-bottom:0}
td.n{text-align:right;font-variant-numeric:tabular-nums}
.tw{overflow-x:auto}
.faq{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:0 16px;margin:8px 0}
.faq summary{cursor:pointer;font-weight:700;padding:14px 0}
.faq p{margin:0 0 14px;color:#334155}
.formula{background:var(--surface);border:1px dashed var(--border);border-radius:14px;padding:12px 14px;font-weight:600}
.lead-box{margin-top:16px;border-top:1px solid var(--border);padding-top:16px}
.chk{display:flex;gap:8px;align-items:flex-start;font-weight:400;font-size:13px;color:#334155;margin:10px 0}
.chk input{margin-top:3px;width:18px;height:18px;flex:none}
.links{display:grid;gap:8px;padding:0;list-style:none}
.links a{display:block;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;text-decoration:none;font-weight:600}
.dl{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}.btn.alt{background:var(--surface);color:var(--brand);border:1.5px solid var(--brand)}
.doc{background:#fff;border:1px solid var(--border);border-radius:16px;padding:20px;font-size:14px;line-height:1.6;max-height:520px;overflow:auto}
.doc h3{text-align:center;font-size:16px;margin:0 0 12px}.doc h4{font-size:14px;margin:14px 0 4px}.doc p{margin:0 0 8px}
.doc .fl{border-bottom:1px dotted #94A3B8;padding:4px 0;color:#475569}.doc .sg{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;text-align:center;font-weight:700}
.doc .sg div{border-top:1px solid #94A3B8;padding-top:6px;margin-top:36px}
.after{display:none}.after.on{display:block}
.disc{margin-top:32px;font-size:13px;color:var(--muted);border-top:1px solid var(--border);padding-top:12px}
footer{text-align:center;font-size:13px;color:var(--muted);padding:24px 16px}footer a{color:var(--muted)}
`;

/** Cloudflare Web Analytics (çerezsiz). CF_BEACON_TOKEN yoksa hiçbir şey eklenmez. */
function cfBeacon() {
  const t = process.env.CF_BEACON_TOKEN;
  if (!t || !/^[a-f0-9]{32}$/i.test(t)) return '';
  return `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${t}"}'></script>`;
}

/**
 * Tam HTML sayfası.
 * @param {{path:string,title:string,description:string,h1:string,crumbs:{name:string,path:string}[],
 *          body:string,faqs:{q:string,a:string}[],slug:string,legal?:boolean,extraLd?:object[],script?:string}} p
 */
function page(p) {
  if (p.title.length > 60) throw new Error(`title > 60: ${p.title} (${p.title.length})`);
  if (p.description.length > 155) throw new Error(`description > 155: ${p.path} (${p.description.length})`);
  if (!p.faqs || p.faqs.length < 5) throw new Error(`SSS < 5: ${p.path}`);
  const url = SITE + p.path;
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: p.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: SITE + c.path })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: p.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
    ...(p.extraLd || []),
  ];
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:locale" content="tr_TR">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/icon-512.png">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#1560E7">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>${(CSS + (p.css || '')).replace(/\n/g, '')}</style>
${ld.map(jsonLd).join('\n')}
</head>
<body>
<header class="top"><div class="in"><a class="logo" href="/">Kira <b>Asistan</b></a><a class="btn" href="${registerUrl(p.slug)}">Ücretsiz Başla</a></div></header>
<main>
${breadcrumbHtml(p.crumbs)}
<h1>${esc(p.h1)}</h1>
${p.body}
${faqSection(p.faqs)}
${cta(p.slug, p.ctaText)}
${p.legal ? `<p class="disc">${DISCLAIMER}</p>` : ''}
</main>
<footer><a href="/">${BRAND}</a> · <a href="/kira-artis-hesaplama">Kira Artış Hesaplama</a> · <a href="/sablonlar/">Belge Şablonları</a> · <a href="/yasal/kvkk">KVKK</a> · <a href="/yasal/gizlilik">Gizlilik</a></footer>
${p.script ? `<script>${p.script}</script>` : ''}
${cfBeacon()}
</body>
</html>
`;
}

/** dist/<path>.html olarak yazar (GitHub Pages /foo → foo.html çözer; slash'sız temiz URL). */
function writePage(distDir, urlPath, html) {
  // "/klasor/" → klasor/index.html (alt sayfaları olan hub'lar için)
  const rel = urlPath.endsWith('/') ? urlPath + 'index.html' : urlPath + '.html';
  const file = path.join(distDir, rel.replace(/^\//, ''));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  return file;
}

/** .env (yerel) + process.env (CI) — basit okuyucu. */
function readEnv(root) {
  const env = { ...process.env };
  const f = path.join(root, '.env');
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return env;
}

module.exports = { cfBeacon, SITE, BRAND, AYLAR, esc, tl, pct, monthInfo, prevMonthLabel, registerUrl, page, writePage, readEnv };
