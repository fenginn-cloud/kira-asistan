/**
 * /sablonlar/ hub + /sablonlar/<slug> sayfaları.
 *  - Online doldurma formu (mobil öncelikli); PDF tarayıcıda üretilir, veri sunucuya gitmez.
 *  - Boş şablonlar build'de üretilir: PDF (aynı motor: sablon-pdf.js) + DOCX.
 *  - PDF kütüphaneleri yalnızca kullanıcı formla etkileşince yüklenir (sayfa hafif kalır).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PDFLib = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const { esc, page, writePage } = require('./lib');
const SablonPDF = require('./sablon-pdf');
const SABLONLAR = require('./sablon-icerik');

const HUB = '/sablonlar/';
const FILE_DIR = '/sablonlar/indir/';
const ASSET_DIR = '/sablonlar/assets/';

const fontDir = path.dirname(require.resolve('@expo-google-fonts/plus-jakarta-sans/package.json'));
const FONT_R = path.join(fontDir, '400Regular', 'PlusJakartaSans_400Regular.ttf');
const FONT_B = path.join(fontDir, '700Bold', 'PlusJakartaSans_700Bold.ttf');
const ASSETS = {
  'pdf-lib.min.js': require.resolve('pdf-lib/dist/pdf-lib.min.js'),
  'fontkit.min.js': require.resolve('@pdf-lib/fontkit/dist/fontkit.umd.min.js'),
  'sablon-pdf.js': path.join(__dirname, 'sablon-pdf.js'),
  'r.ttf': FONT_R,
  'b.ttf': FONT_B,
};

/** Asset'leri kopyalar; içerik hash'li URL döndürür (service worker cache-first olduğu için şart). */
function copyAssets(distDir) {
  const dir = path.join(distDir, ASSET_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const urls = {};
  for (const [name, src] of Object.entries(ASSETS)) {
    const buf = fs.readFileSync(src);
    fs.writeFileSync(path.join(dir, name), buf);
    urls[name] = `${ASSET_DIR}${name}?v=${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10)}`;
  }
  return urls;
}

/* ---------- DOCX (boş şablon) ---------- */
const DOTS = '……………………………………';
async function buildDocx(t, file) {
  const font = 'Calibri';
  const run = (text, o = {}) => new TextRun({ text, font, size: 20, ...o });
  const fieldPara = (f) => new Paragraph({ spacing: { after: 80 }, children: [run(`${f.l}: `, { color: '64748B', size: 18 }), run(DOTS)] });
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
  const children = [];
  let sec = 0;
  t.doc.forEach((b, i) => {
    if (b.h && i === 0) {
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [run(b.h, { bold: true, size: 30 })] }));
    } else if (b.h) {
      sec++;
      children.push(new Paragraph({ spacing: { before: 200, after: 80 }, children: [run(`${sec}. ${b.h}`, { bold: true, size: 22, color: '1560E7' })] }));
    } else if (b.cols) {
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [new TableRow({
          children: b.cols.map((c) => new TableCell({
            borders: noBorders,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ spacing: { after: 60 }, children: [run(c.h, { bold: true })] }), ...c.f.map(fieldPara)],
          })),
        })],
      }));
    } else if (b.f) {
      b.f.forEach((f) => children.push(fieldPara(f)));
    } else if (b.p) {
      children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 }, children: [run(b.p.replace(/\{[a-z0-9_]+\}/g, '…………………'))] }));
    } else if (b.li) {
      b.li.forEach((x, n) => children.push(new Paragraph({ spacing: { after: 60 }, children: [run(`${n + 1}. ${x}`, { size: 19 })] })));
    } else if (b.sign) {
      children.push(new Paragraph({ spacing: { before: 240 }, children: [] }));
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [new TableRow({
          children: b.sign.map((sg) => new TableCell({
            borders: noBorders,
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [run(sg.l, { bold: true })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Ad Soyad / İmza', { size: 17, color: '64748B' })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 420 }, children: [run('……………………………')] }),
            ],
          })),
        })],
      }));
    }
  });
  const doc = new Document({
    creator: 'Kira Asistan',
    title: t.name,
    sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
  });
  fs.writeFileSync(file, await Packer.toBuffer(doc));
}

/* ---------- Online form ---------- */
function inputHtml(f) {
  const id = `f_${f.id}`;
  const ph = f.ph ? ` placeholder="${esc(f.ph)}"` : '';
  const span = (f.w || 1) >= 0.99 ? 'full' : (f.w || 1) >= 0.5 ? 'half' : 'third';
  let ctl;
  if (f.t === 'textarea') ctl = `<textarea id="${id}" name="${f.id}" rows="${(f.lines || 1) + 1}"${ph}></textarea>`;
  else if (f.t === 'select') ctl = `<select id="${id}" name="${f.id}"><option value="">Seçin</option>${f.opts.map((o) => `<option>${esc(o)}</option>`).join('')}</select>`;
  else if (f.t === 'date') ctl = `<input id="${id}" name="${f.id}" type="date">`;
  else if (f.t === 'tel') ctl = `<input id="${id}" name="${f.id}" type="tel" autocomplete="tel"${ph}>`;
  else if (f.t === 'number') ctl = `<input id="${id}" name="${f.id}" type="text" inputmode="numeric"${ph}>`;
  else if (f.t === 'money') ctl = `<div class="money"><input id="${id}" name="${f.id}" type="text" inputmode="decimal"${ph}><span>₺</span></div>`;
  else ctl = `<input id="${id}" name="${f.id}" type="text"${ph}>`;
  return `<div class="fi ${span}"><label for="${id}">${esc(f.l)}</label>${ctl}</div>`;
}

function formHtml(t) {
  const vars = Object.fromEntries((t.vars || []).map((v) => [v.id, v]));
  const seen = new Set();
  const sections = [];
  let cur = null;
  const add = (f) => {
    if (seen.has(f.id)) return;
    seen.add(f.id);
    if (!cur) { cur = { h: 'Bilgiler', items: [] }; sections.push(cur); }
    cur.items.push(inputHtml(f));
  };
  t.doc.forEach((b, i) => {
    if (b.h && i > 0) { cur = { h: b.h, items: [] }; sections.push(cur); }
    else if (b.cols) b.cols.forEach((c) => { cur.items.push(`<p class="sub">${esc(c.h)}</p>`); c.f.forEach(add); });
    else if (b.f) b.f.forEach(add);
    else if (b.p) (b.p.match(/\{([a-z0-9_]+)\}/g) || []).forEach((m) => { const v = vars[m.slice(1, -1)]; if (v) add(v); });
  });
  return sections
    .filter((s) => s.items.some((x) => x.startsWith('<div')))
    .map((s, i) => `<fieldset class="fs"><legend><span>${i + 1}</span>${esc(s.h)}</legend><div class="fg">${s.items.join('')}</div></fieldset>`)
    .join('\n');
}

const FORM_CSS = `
.fs{border:1px solid var(--border);border-radius:18px;background:var(--surface);padding:14px 14px 4px;margin:0 0 12px}
.fs legend{display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px;padding:0 6px}
.fs legend span{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--brand);color:#fff;font-size:12px}
.fg{display:grid;grid-template-columns:repeat(6,1fr);gap:0 10px}
.fi{grid-column:span 6;margin-bottom:12px}.fi.half,.fi.third{grid-column:span 3}
@media(min-width:640px){.fi.third{grid-column:span 2}}
.fi label{font-size:12.5px;color:var(--muted);font-weight:600;margin-bottom:4px}
.fi input,.fi select,.fi textarea{width:100%;font:inherit;font-size:16px;padding:11px 12px;border:1.5px solid var(--border);border-radius:12px;background:#fff;color:var(--fg)}
.fi textarea{resize:vertical;min-height:48px}
.fi input:focus,.fi select,.fi textarea:focus{outline:none}.fi input:focus,.fi textarea:focus,.fi select:focus{border-color:var(--brand)}
.money{position:relative}.money span{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--muted);font-weight:700}.money input{padding-right:30px}
.sub{grid-column:span 6;margin:2px 0 8px;font-weight:700;font-size:13px;color:var(--brand)}
.bar{position:sticky;bottom:0;z-index:5;margin:0 -16px;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:rgba(242,244,247,.94);backdrop-filter:blur(8px);border-top:1px solid var(--border);display:flex;align-items:center;gap:10px}
.bar .btn{flex:1;text-align:center;padding:14px 18px}
.bar .pg{font-size:12px;color:var(--muted);min-width:64px;text-align:center;line-height:1.2}
.bar .pg b{display:block;font-size:15px;color:var(--fg)}
.res2{display:none;margin:12px 0}.res2.on{display:block}
.res2 .card{display:grid;gap:10px;text-align:center}
.res2 .row3{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.lnk{background:none;border:0;color:var(--muted);font:inherit;font-size:13px;text-decoration:underline;cursor:pointer;padding:4px}
.priv{font-size:12.5px;color:var(--muted);display:flex;gap:6px;align-items:flex-start;margin:0 0 12px}
.tabs{display:flex;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:4px;margin:0 0 14px}
.tabs a{flex:1;text-align:center;padding:9px 10px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px;color:var(--muted)}
.tabs a.on{background:var(--brand);color:#fff}
.hub{display:grid;gap:12px;padding:0;list-style:none}
@media(min-width:640px){.hub{grid-template-columns:1fr 1fr}}
.hub a{display:block;height:100%;background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:16px;text-decoration:none;color:var(--fg)}
.hub a:hover{border-color:var(--brand)}
.hub b{display:block;font-size:16px;margin-bottom:4px}.hub span{font-size:14px;color:var(--muted)}
.hub i{display:inline-block;margin-top:10px;font-style:normal;font-size:12px;font-weight:700;color:var(--brand);background:var(--brand-50);border-radius:999px;padding:3px 10px}
`;

function formScript(t, assets) {
  const tpl = { name: t.name, doc: t.doc, vars: t.vars };
  return `(function(){
var T=${JSON.stringify(tpl).replace(/</g, '\\u003c')},SLUG=${JSON.stringify(t.slug)},A=${JSON.stringify(assets)};
var fm=document.getElementById('ff'),btn=document.getElementById('gen'),pg=document.getElementById('pg'),res=document.getElementById('res2'),KEY='kira-sablon:'+SLUG,libs=null,url=null,file=null;
var els=[].slice.call(fm.elements).filter(function(e){return e.name});
function vals(){var o={};els.forEach(function(e){o[e.name]=e.value});return o}
function prog(){var n=els.filter(function(e){return e.value.trim()}).length;pg.innerHTML='<b>'+n+'/'+els.length+'</b>alan dolu'}
try{var d=JSON.parse(localStorage.getItem(KEY)||'null');if(d)els.forEach(function(e){if(d[e.name]!=null)e.value=d[e.name]})}catch(_){}
prog();
var tm;fm.addEventListener('input',function(){prog();clearTimeout(tm);tm=setTimeout(function(){try{localStorage.setItem(KEY,JSON.stringify(vals()))}catch(_){}},300);load()});
function script(src){return new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
function bytes(u){return fetch(u).then(function(r){if(!r.ok)throw 0;return r.arrayBuffer()})}
function load(){if(!libs)libs=Promise.all([script(A['pdf-lib.min.js']),script(A['fontkit.min.js']),script(A['sablon-pdf.js']),bytes(A['r.ttf']),bytes(A['b.ttf'])]).then(function(x){return{PDFLib:window.PDFLib,fontkit:window.fontkit,fonts:{r:x[3],b:x[4]}}});libs.catch(function(){libs=null});return libs}
fm.addEventListener('submit',function(e){e.preventDefault();btn.disabled=true;btn.textContent='PDF hazırlanıyor…';
 load().then(function(deps){return SablonPDF.render(deps,T,vals())}).then(function(r){
  if(url)URL.revokeObjectURL(url);var blob=new Blob([r.bytes],{type:'application/pdf'});url=URL.createObjectURL(blob);
  var name=SLUG.replace(/-ornegi$/,'')+'.pdf';try{file=new File([blob],name,{type:'application/pdf'})}catch(_){file=null}
  var dl=document.getElementById('dl2');dl.href=url;dl.download=name;document.getElementById('op2').href=url;
  document.getElementById('sh2').hidden=!(file&&navigator.canShare&&navigator.canShare({files:[file]}));
  res.classList.add('on');document.getElementById('after').classList.add('on');res.scrollIntoView({behavior:'smooth',block:'center'});
 }).catch(function(){alert('PDF oluşturulamadı. Bağlantınızı kontrol edip tekrar deneyin.')}).then(function(){btn.disabled=false;btn.textContent='PDF Oluştur'})});
document.getElementById('sh2').addEventListener('click',function(){if(file)navigator.share({files:[file],title:T.name}).catch(function(){})});
document.getElementById('clr').addEventListener('click',function(){if(!confirm('Formdaki tüm bilgiler silinsin mi?'))return;fm.reset();try{localStorage.removeItem(KEY)}catch(_){}prog();res.classList.remove('on')});
document.querySelectorAll('.blank a').forEach(function(a){a.addEventListener('click',function(){document.getElementById('after').classList.add('on')})});
})();`;
}

/* ---------- Sayfalar ---------- */
function templatePage(t, assets) {
  const p = `/sablonlar/${t.slug}`;
  const regUrl = `/register?utm_source=seo&utm_medium=${t.slug}`;
  const others = SABLONLAR.filter((x) => x.slug !== t.slug);
  const body = `<p class="lead">${esc(t.summary)} Telefonunuzdan doldurun, <b>tek sayfa PDF</b> olarak indirin veya paylaşın.</p>
<div class="tabs" role="navigation"><a class="on" href="#doldur">Online doldur</a><a href="#bos">Boş şablon indir</a></div>

<section id="doldur" aria-label="Online doldurma formu">
<p class="priv">🔒 Bilgileriniz yalnızca bu cihazda işlenir; sunucularımıza gönderilmez.</p>
<form id="ff" novalidate>
${formHtml(t)}
<div class="bar"><div id="pg" class="pg"></div><button id="gen" class="btn" type="submit">PDF Oluştur</button></div>
</form>
<div id="res2" class="res2" aria-live="polite"><div class="card">
<p style="margin:0;font-weight:800;font-size:17px">PDF hazır ✓</p>
<div class="row3"><a id="dl2" class="btn" href="#">PDF’i indir</a><button id="sh2" class="btn alt" type="button" hidden>Paylaş</button><a id="op2" class="btn alt" href="#" target="_blank" rel="noopener">Görüntüle</a></div>
<p class="note" style="margin:0">Yazdırıp iki tarafa imzalatmayı unutmayın.</p>
</div></div>
<p style="text-align:center;margin:4px 0 0"><button id="clr" class="lnk" type="button">Formu temizle</button></p>
</section>

<div id="after" class="after"><div class="cta" style="margin:16px 0 0"><p class="cta-t">Bu kiracıyı Kira Asistan'da takip et</p><p class="cta-d">Kira günleri, ödemeler ve artış tarihleri için otomatik hatırlatma al.</p><a class="btn" href="${regUrl}">Ücretsiz başla →</a></div></div>

<h2 id="bos">Boş şablonu indir</h2>
<p>Elle doldurmak veya Word’de düzenlemek isterseniz boş şablonu indirin.</p>
<div class="dl blank"><a class="btn" href="${FILE_DIR}${t.slug}.docx" download>Word (DOCX)</a><a class="btn alt" href="${FILE_DIR}${t.slug}.pdf" target="_blank" rel="noopener">PDF</a></div>

<h2>${esc(t.name)} ne işe yarar?</h2>
<p>${esc(t.what)}</p>

<h2>Nasıl doldurulur?</h2>
<ol>${t.how.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>

<h2>Dikkat edilmesi gerekenler</h2>
<ul>${t.cautions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>

<h2>İlgili araçlar ve şablonlar</h2>
<ul class="links">
<li><a href="/kira-artis-hesaplama">Kira artış hesaplama — güncel yasal oran</a></li>
${others.map((o) => `<li><a href="/sablonlar/${o.slug}">${esc(o.name)}</a></li>`).join('\n')}
</ul>`;
  return page({
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
    css: FORM_CSS,
    script: formScript(t, assets),
    extraLd: [{
      '@context': 'https://schema.org',
      '@type': 'DigitalDocument',
      name: t.name,
      description: t.summary,
      inLanguage: 'tr',
      encodingFormat: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      isAccessibleForFree: true,
    }],
  });
}

function hubPage() {
  const body = `<p class="lead">Ev sahipleri ve kiracılar için ücretsiz kira belgeleri. Telefondan <b>online doldurun</b>, tek sayfa PDF indirin ya da boş Word/PDF şablonu alın.</p>
<ul class="hub">${SABLONLAR.map((t) => `<li><a href="/sablonlar/${t.slug}"><b>${esc(t.name)}</b><span>${esc(t.summary)}</span><br><i>Online doldur · PDF · Word</i></a></li>`).join('\n')}</ul>
<h2>Kira artışını mı hesaplıyorsunuz?</h2>
<p>Sözleşme yenilemesinde uygulanabilecek yasal azami artışı <a href="/kira-artis-hesaplama">kira artış hesaplama aracımızla</a> saniyeler içinde görün.</p>`;
  return page({
    path: HUB,
    slug: 'sablonlar',
    title: 'Ücretsiz Kira Belgeleri — Online Doldur, PDF İndir',
    description: 'Kira sözleşmesi, tahliye taahhütnamesi, ihtarname, depozito ve daire teslim tutanağı. Telefondan online doldur, PDF veya Word indir.',
    h1: 'Ücretsiz Kira Belgesi Şablonları',
    crumbs: [
      { name: 'Ana Sayfa', path: '/' },
      { name: 'Belge Şablonları', path: HUB },
    ],
    body,
    css: FORM_CSS,
    faqs: [
      { q: 'Bu şablonlar ücretsiz mi?', a: 'Evet. Tüm şablonları üyelik gerekmeden online doldurabilir, PDF veya Word olarak ücretsiz indirebilirsiniz.' },
      { q: 'Online doldurduğum bilgiler kaydediliyor mu?', a: 'Hayır. Bilgiler yalnızca kendi cihazınızda işlenir ve PDF tarayıcınızda oluşturulur; sunucularımıza gönderilmez.' },
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
  const assets = copyAssets(distDir);
  const deps = { PDFLib, fontkit, fonts: { r: fs.readFileSync(FONT_R), b: fs.readFileSync(FONT_B) } };

  const paths = [HUB];
  writePage(distDir, HUB, hubPage());
  for (const t of SABLONLAR) {
    await buildDocx(t, path.join(fileDir, `${t.slug}.docx`));
    const { bytes, scale } = await SablonPDF.render(deps, t, {});
    fs.writeFileSync(path.join(fileDir, `${t.slug}.pdf`), bytes);
    if (scale < 0.75) console.warn(`[seo] ${t.slug}: boş şablon %${Math.round(scale * 100)} ölçeğe küçüldü`);
    writePage(distDir, `/sablonlar/${t.slug}`, templatePage(t, assets));
    paths.push(`/sablonlar/${t.slug}`);
  }
  return paths;
}

module.exports = { build };
