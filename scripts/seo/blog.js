/**
 * Blog: content/blog/*.json → /blog/<slug> statik sayfaları + /blog/ listesi.
 *
 * Yazı biçimi (JSON):
 * {
 *   "slug": "kira-artisi-nasil-hesaplanir",        // a-z, 0-9, tire
 *   "date": "2026-11-20",                          // YYYY-MM-DD; gelecekteki tarih yayınlanmaz
 *   "title": "...",        // <= 60 karakter (SEO başlığı)
 *   "description": "...",  // <= 155 karakter (meta açıklama)
 *   "h1": "...",
 *   "intro": "Giriş paragrafı",
 *   "sections": [ { "h2": "...", "paragraphs": ["..."], "list": ["..."] } ],   // en az 3
 *   "faqs": [ { "q": "...", "a": "..." } ],   // en az 5
 *   "legal": true          // hukuki konu ise sayfa sonuna uyarı eklenir
 * }
 *
 * Doğrulama (ajan commit'ten önce çalıştırır):  node scripts/seo/blog.js --check
 */
const fs = require('fs');
const path = require('path');
const { esc, page, writePage } = require('./lib');

const DIR = path.join(__dirname, '..', '..', 'content', 'blog');
const HUB = '/blog/';

function loadPosts({ includeFuture = false } = {}) {
  if (!fs.existsSync(DIR)) return [];
  const today = new Date().toISOString().slice(0, 10);
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const post = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      post.__file = f;
      return post;
    })
    .filter((p) => includeFuture || p.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function validate(post) {
  const errs = [];
  const f = post.__file;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(post.slug || '')) errs.push(`${f}: slug geçersiz`);
  if (f !== `${post.slug}.json`) errs.push(`${f}: dosya adı slug ile aynı olmalı (${post.slug}.json)`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date || '')) errs.push(`${f}: date YYYY-MM-DD olmalı`);
  if (!post.title || post.title.length > 60) errs.push(`${f}: title boş ya da 60 karakterden uzun`);
  if (!post.description || post.description.length > 155) errs.push(`${f}: description boş ya da 155 karakterden uzun`);
  if (!post.h1) errs.push(`${f}: h1 yok`);
  if (!post.intro) errs.push(`${f}: intro yok`);
  if (!Array.isArray(post.sections) || post.sections.length < 3) errs.push(`${f}: en az 3 bölüm gerekli`);
  for (const [i, s] of (post.sections || []).entries()) {
    if (!s.h2) errs.push(`${f}: bölüm ${i + 1} başlığı yok`);
    if (!Array.isArray(s.paragraphs) || s.paragraphs.length === 0) errs.push(`${f}: bölüm ${i + 1} paragrafsız`);
  }
  if (!Array.isArray(post.faqs) || post.faqs.length < 5) errs.push(`${f}: en az 5 SSS gerekli`);
  const words = [post.intro, ...(post.sections || []).flatMap((s) => [...(s.paragraphs || []), ...(s.list || [])])]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  if (words < 600) errs.push(`${f}: metin çok kısa (${words} kelime, en az 600)`);
  return errs;
}

/** Paragraf içi basit biçim: **kalın** ve [metin](/yol) iç bağlantı (yalnızca site içi). */
function inline(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
}

function postBody(post) {
  const d = new Date(post.date + 'T00:00:00Z').toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return [
    `<p class="lead" style="color:var(--muted);font-size:14px">${esc(d)}</p>`,
    `<p>${inline(post.intro)}</p>`,
    ...post.sections.map(
      (s) =>
        `<h2>${esc(s.h2)}</h2>` +
        s.paragraphs.map((p) => `<p>${inline(p)}</p>`).join('') +
        (s.list && s.list.length ? `<ul>${s.list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>` : '')
    ),
  ].join('\n');
}

/** @returns {string[]} sitemap için path'ler */
function build(distDir) {
  const posts = loadPosts();
  const errs = posts.flatMap(validate);
  if (errs.length) throw new Error('Blog doğrulama hatası:\n' + errs.join('\n'));
  if (posts.length === 0) return [];

  const paths = [];
  for (const post of posts) {
    const p = `${HUB}${post.slug}`;
    writePage(
      distDir,
      p,
      page({
        path: p,
        title: post.title,
        description: post.description,
        h1: post.h1,
        crumbs: [
          { name: 'Kira Asistan', path: '/' },
          { name: 'Blog', path: HUB },
          { name: post.h1, path: p },
        ],
        body: postBody(post),
        faqs: post.faqs,
        slug: `blog-${post.slug}`,
        legal: !!post.legal,
        extraLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.h1,
            description: post.description,
            datePublished: post.date,
            dateModified: post.date,
            inLanguage: 'tr-TR',
            author: { '@type': 'Organization', name: 'Kira Asistan' },
            publisher: { '@type': 'Organization', name: 'Kira Asistan' },
            mainEntityOfPage: `https://kiraasist.fngn.com.tr${p}`,
          },
        ],
      })
    );
    paths.push(p);
  }

  const list = posts
    .map(
      (post) =>
        `<li style="margin-bottom:14px"><a href="${HUB}${post.slug}"><b>${esc(post.h1)}</b></a><br><span style="color:var(--muted);font-size:14px">${esc(post.description)}</span></li>`
    )
    .join('');
  writePage(
    distDir,
    HUB,
    page({
      path: HUB,
      title: 'Kira Takibi Blogu: Ev Sahipleri ve Emlakçılar İçin',
      description:
        'Kira artışı, tahsilat, depozito, sözleşme ve kiracı ilişkileri üzerine ev sahipleri ve emlak ofisleri için pratik rehberler.',
      h1: 'Kira Asistan Blog',
      crumbs: [
        { name: 'Kira Asistan', path: '/' },
        { name: 'Blog', path: HUB },
      ],
      body: `<p>Ev sahipleri ve emlak ofisleri için kira takibi, tahsilat ve sözleşme yönetimi üzerine pratik yazılar.</p><ul style="list-style:none;padding:0">${list}</ul>`,
      faqs: [
        { q: 'Bu blog kimler için?', a: 'Kiralık mülkü olan ev sahipleri, emlak ofisleri ve site yöneticileri için.' },
        { q: 'Yazılar hukuki danışmanlık yerine geçer mi?', a: 'Hayır. Yazılar bilgilendirme amaçlıdır; hukuki konularda bir avukata danışmanız önerilir.' },
        { q: 'Kira artış oranını nereden öğrenebilirim?', a: 'Güncel oranı ve hesaplamayı Kira Artış Hesaplama sayfamızda bulabilirsiniz.' },
        { q: 'Kira sözleşmesi şablonu var mı?', a: 'Evet, Belge Şablonları sayfamızda ücretsiz kira belgesi şablonları bulunur.' },
        { q: 'Kira Asistan ücretli mi?', a: '3 sözleşmeye kadar ücretsizdir; daha fazlası için Pro ve Business planları vardır.' },
      ],
      slug: 'blog',
    })
  );
  paths.push(HUB);
  return paths;
}

module.exports = { build, loadPosts, validate };

// node scripts/seo/blog.js --check  → tüm yazıları (gelecek tarihliler dahil) doğrula
if (require.main === module && process.argv.includes('--check')) {
  const posts = loadPosts({ includeFuture: true });
  const errs = posts.flatMap(validate);
  const slugs = posts.map((p) => p.slug);
  const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dup.length) errs.push(`Tekrarlanan slug: ${dup.join(', ')}`);
  if (errs.length) {
    console.error(errs.join('\n'));
    process.exit(1);
  }
  console.log(`[blog] ${posts.length} yazı doğrulandı.`);
}
