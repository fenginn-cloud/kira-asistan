/**
 * Faz 2 — /sablonlar/ hub + /sablonlar/<slug> sayfaları; her şablon için
 * build sırasında DOCX (docx) ve PDF (pdfkit, Türkçe için gömülü Plus Jakarta Sans) üretir.
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const { esc, page, writePage } = require('./lib');
const SABLONLAR = require('./sablon-icerik');

const HUB = '/sablonlar/';
const FILE_DIR = '/sablonlar/indir/';
const DOT = '…'.repeat(28);

const fontDir = path.dirname(require.resolve('@expo-google-fonts/plus-jakarta-sans/package.json'));
const FONT_R = path.join(fontDir, '400Regular', 'PlusJakartaSans_400Regular.ttf');
const FONT_B = path.join(fontDir, '700Bold', 'PlusJakartaSans_700Bold.ttf');

/* ---------- HTML önizleme ---------- */
function previewHtml(doc) {
  return doc
    .map((b, i) => {
      if (b.h) return i === 0 ? `<h3>${esc(b.h)}</h3>` : `<h4>${esc(b.h)}</h4>`;
      if (b.p) return `<p>${esc(b.p)}</p>`;
      if (b.f) return b.f.map((l) => `<div class="fl">${l ? esc(l) + ':' : '&nbsp;'}</div>`).join('');
      if (b.li) return `<ol>${b.li.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
      if (b.sign) return `<div class="sg">${b.sign.map((s) => `<div>${esc(s)}<br><small>Ad Soyad / İmza</small></div>`).join('')}</div>`;
      return '';
    })
    .join('\n');
}

/* ---------- PDF ---------- */
function buildPdf(t, file) {
  return new Promise((resolve, reject) => {
    const d = new PDFDocument({ size: 'A4', bufferPages: true, margins: { top: 56, bottom: 56, left: 56, right: 56 }, info: { Title: t.name, Author: 'Kira Asistan' } });
    const out = fs.createWriteStream(file);
    d.pipe(out);
    d.registerFont('R', FONT_R);
    d.registerFont('B', FONT_B);
    const W = d.page.width - 112;
    const ensure = (h) => { if (d.y + h > d.page.height - 56) d.addPage(); };

    t.doc.forEach((b, i) => {
      if (b.h) {
        ensure(40);
        if (i === 0) d.font('B').fontSize(15).text(b.h, { align: 'center' }).moveDown(0.8);
        else d.moveDown(0.5).font('B').fontSize(11).text(b.h).moveDown(0.2);
      } else if (b.p) {
        d.font('R').fontSize(10).text(b.p, { align: 'justify', lineGap: 2 }).moveDown(0.4);
      } else if (b.f) {
        b.f.forEach((l) => {
          ensure(20);
          d.font('R').fontSize(10).text(l ? `${l}: ` : ' ', { continued: false });
          const y = d.y + 1;
          d.save().strokeColor('#94A3B8').dash(1, { space: 2 }).moveTo(56, y).lineTo(56 + W, y).stroke().undash().restore();
          d.moveDown(0.5);
        });
        d.moveDown(0.3);
      } else if (b.li) {
        b.li.forEach((x, n) => { ensure(24); d.font('R').fontSize(10).text(`${n + 1}. ${x}`, { lineGap: 2, indent: 0 }).moveDown(0.2); });
      } else if (b.sign) {
        ensure(80);
        d.moveDown(1.5);
        const y = d.y + 40;
        const colW = W / b.sign.length;
        b.sign.forEach((s, n) => {
          const x = 56 + n * colW;
          d.save().strokeColor('#94A3B8').moveTo(x + 20, y).lineTo(x + colW - 20, y).stroke().restore();
          d.font('B').fontSize(10).text(s, x, y + 6, { width: colW, align: 'center' });
          d.font('R').fontSize(8).fillColor('#64748B').text('Ad Soyad / İmza', x, y + 20, { width: colW, align: 'center' }).fillColor('black');
        });
        d.x = 56; d.y = y + 40;
      }
    });
    // Alt bilgi her sayfaya; alt marjı geçici sıfırla ki yeni sayfa açılmasın.
    const range = d.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      d.switchToPage(i);
      d.page.margins.bottom = 0;
      d.font('R').fontSize(7).fillColor('#94A3B8').text(`kiraasist.fngn.com.tr — Bilgilendirme amaçlı örnek şablondur, hukuki danışmanlık yerine geçmez.  ${i + 1}/${range.count}`, 56, d.page.height - 36, { width: W, align: 'center', lineBreak: false });
    }
    d.end();
    out.on('finish', resolve);
    out.on('error', reject);
  });
}

/* ---------- DOCX ---------- */
async function buildDocx(t, file) {
  const font = 'Calibri';
  const children = [];
  t.doc.forEach((b, i) => {
    if (b.h) {
      children.push(new Paragraph({
        alignment: i === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: i === 0 ? 0 : 240, after: i === 0 ? 240 : 80 },
        children: [new TextRun({ text: b.h, bold: true, size: i === 0 ? 30 : 22, font })],
      }));
    } else if (b.p) {
      children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 }, children: [new TextRun({ text: b.p, size: 21, font })] }));
    } else if (b.f) {
      b.f.forEach((l) => children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: `${l ? l + ': ' : ''}${DOT}`, size: 21, font })] })));
    } else if (b.li) {
      b.li.forEach((x, n) => children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: `${n + 1}. ${x}`, size: 21, font })] })));
    } else if (b.sign) {
      const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
      children.push(new Paragraph({ spacing: { before: 360 }, children: [] }));
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
        rows: [new TableRow({
          children: b.sign.map((s) => new TableCell({
            borders: { top: none, bottom: none, left: none, right: none },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s, bold: true, size: 21, font })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Ad Soyad / İmza', size: 18, color: '64748B', font })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 480 }, children: [new TextRun({ text: '……………………………', size: 21, font })] }),
            ],
          })),
        })],
      }));
    }
  });
  const doc = new Document({ creator: 'Kira Asistan', title: t.name, sections: [{ children }] });
  fs.writeFileSync(file, await Packer.toBuffer(doc));
}

/* ---------- Sayfalar ---------- */
const AFTER_SCRIPT = `document.querySelectorAll('.dl a').forEach(function(a){a.addEventListener('click',function(){var e=document.getElementById('after');if(e)e.classList.add('on')})})`;

function templatePage(t) {
  const p = `/sablonlar/${t.slug}`;
  const regUrl = `/register?utm_source=seo&utm_medium=${t.slug}`;
  const others = SABLONLAR.filter((x) => x.slug !== t.slug);
  const body = `<p class="lead">${esc(t.summary)} Ücretsiz indirin, ihtiyacınıza göre düzenleyin.</p>
<div class="card">
<div class="dl"><a class="btn" href="${FILE_DIR}${t.slug}.docx" download>Word (DOCX) indir</a><a class="btn alt" href="${FILE_DIR}${t.slug}.pdf" download>PDF indir</a></div>
<div id="after" class="after"><div class="cta" style="margin:12px 0 0"><p class="cta-t">Bu kiracıyı Kira Asistan'da takip et</p><p class="cta-d">Kira günleri, ödemeler ve artış tarihleri için otomatik hatırlatma al.</p><a class="btn" href="${regUrl}">Ücretsiz başla →</a></div></div>
</div>

<h2>${esc(t.name)} ne işe yarar?</h2>
<p>${esc(t.what)}</p>

<h2>Nasıl doldurulur?</h2>
<ol>${t.how.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>

<h2>Dikkat edilmesi gerekenler</h2>
<ul>${t.cautions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>

<h2>Şablon önizleme</h2>
<div class="doc" aria-label="Belge önizleme">${previewHtml(t.doc)}</div>

<h2>İlgili araçlar ve şablonlar</h2>
<ul class="links">
<li><a href="/kira-artis-hesaplama">Kira artış hesaplama — güncel yasal oran</a></li>
${others.map((o) => `<li><a href="/sablonlar/${o.slug}">${esc(o.name)}</a></li>`).join('\n')}
</ul>`;
  return {
    path: p,
    html: page({
      path: p,
      slug: t.slug,
      title: t.title,
      description: t.description,
      h1: t.h1,
      crumbs: [
        { name: 'Ana Sayfa', path: '/' },
        { name: 'Belge Şablonları', path: HUB },
        { name: t.name, path: p },
      ],
      body,
      faqs: t.faqs,
      legal: true,
      script: AFTER_SCRIPT,
      extraLd: [{
        '@context': 'https://schema.org',
        '@type': 'DigitalDocument',
        name: t.name,
        description: t.summary,
        inLanguage: 'tr',
        encodingFormat: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        isAccessibleForFree: true,
      }],
    }),
  };
}

function hubPage() {
  const body = `<p class="lead">Ev sahipleri ve kiracılar için ücretsiz kira belgesi şablonları. Word (DOCX) veya PDF olarak indirin, doldurun ve imzalayın.</p>
<ul class="links">${SABLONLAR.map((t) => `<li><a href="/sablonlar/${t.slug}">${esc(t.name)}<br><span class="note" style="font-weight:400">${esc(t.summary)}</span></a></li>`).join('\n')}</ul>
<h2>Kira artışını mı hesaplıyorsunuz?</h2>
<p>Sözleşme yenilemesinde uygulanabilecek yasal azami artışı <a href="/kira-artis-hesaplama">kira artış hesaplama aracımızla</a> saniyeler içinde görün.</p>`;
  return page({
    path: HUB,
    slug: 'sablonlar',
    title: 'Ücretsiz Kira Belgesi Şablonları — Word ve PDF',
    description: 'Kira sözleşmesi, tahliye taahhütnamesi, ihtarname, depozito ve daire teslim tutanağı şablonları. Ücretsiz Word ve PDF indir.',
    h1: 'Ücretsiz Kira Belgesi Şablonları',
    crumbs: [
      { name: 'Ana Sayfa', path: '/' },
      { name: 'Belge Şablonları', path: HUB },
    ],
    body,
    faqs: [
      { q: 'Bu şablonlar ücretsiz mi?', a: 'Evet. Tüm şablonları üyelik gerekmeden Word (DOCX) ve PDF olarak ücretsiz indirebilirsiniz.' },
      { q: 'Şablonları düzenleyebilir miyim?', a: 'Word (DOCX) dosyalarını Microsoft Word, Google Dokümanlar veya LibreOffice ile düzenleyebilirsiniz. PDF sürümü elle doldurmak için uygundur.' },
      { q: 'Şablonlar hukuken geçerli mi?', a: 'Şablonlar genel ihtiyaçlara göre hazırlanmış örneklerdir. Doğru doldurulup imzalandığında yazılı delil niteliği taşır; özel durumlar için bir hukukçuya danışmanız önerilir.' },
      { q: 'Hangi şablon ne zaman kullanılır?', a: 'Kiralama başında kira sözleşmesi, daire teslim tutanağı ve depozito tutanağı; ödeme gecikmesinde ihtarname; çıkış planlandığında tahliye taahhütnamesi kullanılır.' },
      { q: 'Kira ödemelerini nasıl takip edebilirim?', a: 'Kira Asistan ile kiracılarınızın ödeme günlerini, geciken ödemeleri ve artış tarihlerini tek yerden takip edip otomatik hatırlatma alabilirsiniz.' },
    ],
    legal: true,
  });
}

/** @returns {Promise<string[]>} sitemap için path'ler */
async function build(distDir) {
  const fileDir = path.join(distDir, FILE_DIR);
  fs.mkdirSync(fileDir, { recursive: true });
  const paths = [HUB];
  writePage(distDir, HUB, hubPage());
  for (const t of SABLONLAR) {
    await buildDocx(t, path.join(fileDir, `${t.slug}.docx`));
    await buildPdf(t, path.join(fileDir, `${t.slug}.pdf`));
    const { path: p, html } = templatePage(t);
    writePage(distDir, p, html);
    paths.push(p);
  }
  return paths;
}

module.exports = { build };
