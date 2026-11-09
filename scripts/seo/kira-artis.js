/**
 * Faz 1 — Kira artış hesaplama + aylık oran sayfaları.
 * Veri: data/kira-artis-oranlari.json (anahtar = yenileme ayı, değer = önceki ayın TÜFE 12 aylık ort. %).
 */
const { esc, tl, pct, monthInfo, prevMonthLabel, page, writePage } = require('./lib');

const CALC_PATH = '/kira-artis-hesaplama';
const CALC_SLUG = 'kira-artis-hesaplama';

const ORNEK_KIRALAR = [10000, 20000, 30000];

function exampleTable(rate) {
  return `<div class="tw"><table>
<thead><tr><th>Mevcut kira</th><th>Artış (${pct(rate)})</th><th>Yeni kira (azami)</th></tr></thead>
<tbody>${ORNEK_KIRALAR.map((k) => {
    const inc = Math.round(k * rate) / 100;
    return `<tr><td class="n">${tl(k)}</td><td class="n">${tl(inc)}</td><td class="n"><b>${tl(k + inc)}</b></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function rateTable(entries) {
  return `<div class="tw"><table>
<thead><tr><th>Yenileme ayı</th><th>Esas alınan TÜFE verisi</th><th>Azami artış</th></tr></thead>
<tbody>${entries
    .map(([key, v]) => {
      const mi = monthInfo(key);
      const label = v == null ? mi.label : `<a href="/kira-artis-orani/${mi.slug}">${mi.label}</a>`;
      return `<tr><td>${label}</td><td>${prevMonthLabel(key)}</td><td class="n">${v == null ? '<span class="note">Henüz eklenmedi</span>' : `<b>${pct(v)}</b>`}</td></tr>`;
    })
    .join('')}</tbody></table></div>`;
}

const ORTAK_SSS = [
  {
    q: 'Kira artış oranı yasal olarak nasıl belirlenir?',
    a: 'Türk Borçlar Kanunu 344. madde gereği konut ve çatılı işyeri kiralarında, yenilenen kira dönemindeki artış oranı bir önceki kira yılında TÜİK tarafından açıklanan TÜFE 12 aylık ortalamalara göre değişim oranını geçemez.',
  },
  {
    q: 'Hesaplamada hangi ayın oranı kullanılır?',
    a: 'Kira sözleşmesinin yenilendiği aydan bir önceki ayın TÜFE 12 aylık ortalama değişim oranı esas alınır. Örneğin Kasım ayında yenilenen bir sözleşme için Ekim ayı verisi kullanılır.',
  },
  {
    q: 'Sözleşmede daha yüksek bir artış oranı yazıyorsa ne olur?',
    a: 'Konut ve çatılı işyeri kiralarında sözleşmeye yazılan artış oranı, yasal üst sınır olan TÜFE 12 aylık ortalama değişimini aşamaz. Sınırı aşan kısım için ayrıntılı değerlendirme yapmak üzere bir hukukçuya danışmanız önerilir.',
  },
  {
    q: 'Sözleşmede kira artışıyla ilgili bir madde yoksa ne olur?',
    a: 'Taraflar artış konusunda anlaşmamışsa, yeni kira bedeli TBK 344 gereği bir önceki kira yılının TÜFE 12 aylık ortalama değişimini geçmemek kaydıyla hakim tarafından hakkaniyete göre belirlenir.',
  },
  {
    q: '5 yılı dolduran kira sözleşmelerinde artış nasıl yapılır?',
    a: 'Beş yıldan uzun süreli veya beş yıldan sonra yenilenen sözleşmelerde, yeni kira yılının bedeli hakim tarafından TÜFE oranı, kiralananın durumu ve emsal kira bedelleri dikkate alınarak hakkaniyete göre belirlenir. Bu hesaplayıcı bu durumu kapsamaz.',
  },
  {
    q: 'Kira artış oranı ne zaman açıklanır?',
    a: 'TÜİK enflasyon verilerini her ayın başında açıklar; TÜFE 12 aylık ortalama değişim oranı bu açıklamayla birlikte belli olur. Bu sayfadaki tabloyu yeni veri açıklandıkça güncelliyoruz.',
  },
];

function calcScript(rates, supa) {
  return `(function(){
var R=${JSON.stringify(rates)},SUPA=${JSON.stringify(supa)};
var AY=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
function f2(n){return n.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function parse(s){s=String(s).replace(/[^0-9.,]/g,'');if(s.indexOf(',')>-1){s=s.replace(/\\./g,'').replace(',','.')}else{s=s.replace(/\\./g,'')}var n=parseFloat(s);return isFinite(n)?n:NaN}
var rent=document.getElementById('rent'),mon=document.getElementById('mon'),out=document.getElementById('out'),lb=document.getElementById('leadbox');
function calc(){var k=mon.value,r=R[k],v=parse(rent.value);
 if(!(v>0)){out.innerHTML='<p class="note">Sonucu görmek için mevcut aylık kiranızı girin.</p>';lb.hidden=true;return}
 if(r==null){out.innerHTML='<p class="warn">Bu ayın oranı henüz eklenmedi.</p><p class="note">TÜİK verisi açıklandığında bu tablo güncellenir.</p>';lb.hidden=true;return}
 var inc=Math.round(v*r)/100;
 out.innerHTML='<div class="res"><div class="row"><span>Yasal azami artış oranı</span><span>%'+f2(r)+'</span></div><div class="row"><span>Artış tutarı</span><span>'+f2(inc)+' ₺</span></div><div class="row big"><span>Yeni kira (azami)</span><span>'+f2(v+inc)+' ₺</span></div></div>';
 lb.hidden=!SUPA}
rent.addEventListener('input',calc);mon.addEventListener('change',calc);
rent.addEventListener('blur',function(){var v=parse(rent.value);if(v>0)rent.value=f2(v)});
calc();
var fm=document.getElementById('leadform');if(!fm||!SUPA)return;
fm.addEventListener('submit',function(e){e.preventDefault();var em=fm.email.value.trim(),ok=fm.kvkk.checked,msg=document.getElementById('leadmsg'),b=fm.querySelector('button');
 if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(em)){msg.textContent='Geçerli bir e-posta adresi girin.';return}
 if(!ok){msg.textContent='Devam etmek için KVKK onayını işaretleyin.';return}
 b.disabled=true;msg.textContent='Kaydediliyor…';
 fetch(SUPA.url+'/rest/v1/seo_leads',{method:'POST',headers:{'apikey':SUPA.key,'Authorization':'Bearer '+SUPA.key,'Content-Type':'application/json','Prefer':'return=minimal'},
  body:JSON.stringify({email:em,renewal_month:mon.value,source:'${CALC_SLUG}',kvkk_consent:true})})
 .then(function(r){if(!r.ok)throw 0;var p=mon.value.split('-');msg.textContent='Tamam! '+AY[+p[1]-1]+' '+(+p[0]+1)+' kira artışından önce sana e-posta göndereceğiz.';fm.reset()})
 .catch(function(){msg.textContent='Bir sorun oluştu, lütfen tekrar deneyin.';b.disabled=false});
});
})();`;
}

function calcPage(entries, latest, supa) {
  const ratesObj = Object.fromEntries(entries);
  const options = [...entries]
    .reverse()
    .map(([k]) => `<option value="${k}"${k === latest[0] ? ' selected' : ''}>${monthInfo(k).label}</option>`)
    .join('');
  const last12 = [...entries].reverse().slice(0, 12);
  const known = entries.filter(([, v]) => v != null).reverse();

  const body = `<p class="lead">Mevcut kiranızı ve sözleşmenizin yenileneceği ayı seçin; TBK 344'e göre uygulanabilecek <b>yasal azami kira artışını</b> ve yeni kiranızı anında görün.</p>
<section class="card" aria-label="Kira artış hesaplayıcı">
<div class="grid2">
<div><label for="rent">Mevcut aylık kira (₺)</label><input id="rent" type="text" inputmode="decimal" autocomplete="off" placeholder="Örn. 15.000"></div>
<div><label for="mon">Sözleşme yenileme ayı</label><select id="mon">${options}</select></div>
</div>
<div id="out" aria-live="polite"></div>
<div id="leadbox" class="lead-box" hidden>
<h3 style="margin-top:0">Bir sonraki kira artış tarihini sana hatırlatalım</h3>
<form id="leadform" novalidate>
<label for="email">E-posta adresin</label>
<input id="email" name="email" type="email" autocomplete="email" placeholder="ornek@eposta.com" required>
<label class="chk"><input type="checkbox" name="kvkk" required><span>E-posta adresimin kira artış hatırlatması göndermek amacıyla işlenmesini kabul ediyorum. <a href="/yasal/kvkk" target="_blank" rel="noopener">KVKK Aydınlatma Metni</a></span></label>
<button class="btn" type="submit">Hatırlat</button>
<p id="leadmsg" class="note" aria-live="polite"></p>
</form>
</div>
</section>

<h2>Son 12 Ayın Kira Artış Oranları</h2>
<p>Tablodaki oranlar, ilgili yenileme ayından bir önceki ayın TÜİK TÜFE 12 aylık ortalama değişim oranıdır.</p>
${rateTable(last12)}

<h2>Kira artışı nasıl hesaplanır?</h2>
<p>Konut ve çatılı işyeri kiralarında artış, bir önceki kira yılının <b>TÜFE 12 aylık ortalama değişim oranını</b> geçemez (TBK m. 344). Kullanılacak oran, sözleşmenin yenilendiği aydan bir önceki aya aittir.</p>
<p class="formula">Yeni kira = Mevcut kira × (1 + Oran / 100)</p>
<h3>Örnek: ${latest[0] ? monthInfo(latest[0]).label : ''} yenilemesi (${pct(latest[1])})</h3>
${exampleTable(latest[1])}
<p class="note">Tablodaki tutarlar yasal azami sınırdır; taraflar daha düşük bir artış üzerinde anlaşabilir.</p>

${known.length ? `<h2>Aylara göre kira artış oranları</h2><ul class="links">${known
    .map(([k, v]) => `<li><a href="/kira-artis-orani/${monthInfo(k).slug}">${monthInfo(k).label} kira artış oranı: ${pct(v)}</a></li>`)
    .join('')}</ul>` : ''}

<h2>Ücretsiz kira belgesi şablonları</h2>
<ul class="links">
<li><a href="/sablonlar/kira-sozlesmesi-ornegi">Kira sözleşmesi örneği (Word / PDF)</a></li>
<li><a href="/sablonlar/kira-odeme-ihtarnamesi-ornegi">Kira ödeme ihtarnamesi örneği</a></li>
<li><a href="/sablonlar/">Tüm belge şablonları</a></li>
</ul>
`;

  return page({
    path: CALC_PATH,
    slug: CALC_SLUG,
    title: `Kira Artış Hesaplama ${latest[0].slice(0, 4)} — Yasal Zam Oranı`,
    description: `${monthInfo(latest[0]).label} kira artış oranı ${pct(latest[1])}. Mevcut kiranızı girin, TBK 344'e göre yasal azami artışı ve yeni kiranızı anında hesaplayın.`,
    h1: 'Kira Artış Hesaplama',
    crumbs: [
      { name: 'Ana Sayfa', path: '/' },
      { name: 'Kira Artış Hesaplama', path: CALC_PATH },
    ],
    body,
    faqs: ORTAK_SSS,
    legal: true,
    extraLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Kira Artış Hesaplama',
        url: 'https://kiraasist.fngn.com.tr' + CALC_PATH,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        inLanguage: 'tr',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'TRY' },
      },
    ],
    script: calcScript(ratesObj, supa),
  });
}

function monthPage(key, rate, entries) {
  const mi = monthInfo(key);
  const prev = prevMonthLabel(key);
  const slug = `kira-artis-orani-${mi.slug}`;
  const others = entries.filter(([k, v]) => v != null && k !== key).reverse().slice(0, 6);

  const body = `<p class="lead"><b>${mi.label}</b> ayında yenilenen konut ve çatılı işyeri kira sözleşmelerinde uygulanabilecek <b>yasal azami kira artış oranı ${pct(rate)}</b>'dir. Bu oran, TÜİK'in açıkladığı ${prev} TÜFE 12 aylık ortalama değişim oranıdır.</p>
<div class="card"><div class="res" style="margin:0">
<div class="row big"><span>${mi.label} kira artış oranı</span><span>${pct(rate)}</span></div>
<div class="row"><span>Esas alınan veri</span><span>${prev} TÜFE 12 aylık ort.</span></div>
</div>
<p style="margin:14px 0 0"><a class="btn" href="/kira-artis-hesaplama">Kendi kiranı hesapla →</a></p></div>

<h2>${mi.label} kira artışı hesaplama tablosu</h2>
${exampleTable(rate)}

<h2>${mi.label} kira artışı nasıl hesaplanır?</h2>
<p>Mevcut kiranızı ${pct(rate)} ile çarpıp 100'e bölerek artış tutarını, bunu mevcut kiraya ekleyerek yeni kiranızı bulursunuz.</p>
<p class="formula">Yeni kira = Mevcut kira × (1 + ${rate.toLocaleString('tr-TR')} / 100)</p>
<p>Örneğin 15.000 ₺ kira için artış ${tl(Math.round(15000 * rate) / 100)}, yeni kira en fazla ${tl(15000 + Math.round(15000 * rate) / 100)} olur.</p>

${others.length ? `<h2>Diğer aylar</h2><ul class="links">${others
    .map(([k, v]) => `<li><a href="/kira-artis-orani/${monthInfo(k).slug}">${monthInfo(k).label}: ${pct(v)}</a></li>`)
    .join('')}</ul>` : ''}
<ul class="links" style="margin-top:12px"><li><a href="/kira-artis-hesaplama">Kira artış hesaplama aracı ve tüm aylar</a></li></ul>
`;

  const faqs = [
    {
      q: `${mi.label} kira artış oranı kaç?`,
      a: `${mi.label} ayında yenilenen konut ve çatılı işyeri kira sözleşmeleri için yasal azami kira artış oranı ${pct(rate)}'dir.`,
    },
    {
      q: `${mi.label} kira artışında hangi ayın verisi kullanılır?`,
      a: `${mi.label} yenilemelerinde bir önceki ayın, yani ${prev} ayının TÜFE 12 aylık ortalama değişim oranı esas alınır.`,
    },
    {
      q: `${mi.label}'da 20.000 TL kira ne kadar olur?`,
      a: `20.000 ₺ kiraya ${pct(rate)} artış uygulandığında artış tutarı ${tl(Math.round(20000 * rate) / 100)}, yeni kira en fazla ${tl(20000 + Math.round(20000 * rate) / 100)} olur.`,
    },
    ...ORTAK_SSS.filter((_, i) => [2, 3, 4].includes(i)),
  ];

  return page({
    path: `/kira-artis-orani/${mi.slug}`,
    slug,
    title: `${mi.label} Kira Artış Oranı: ${pct(rate)} — Hesaplama ve Tablo`,
    description: `${mi.label} kira artış oranı ${pct(rate)} (${prev} TÜFE 12 aylık ortalama). Yeni kiranızı hesaplayın, 10-30 bin TL örnek tabloyu inceleyin.`,
    h1: `${mi.label} Kira Artış Oranı: ${pct(rate)}`,
    crumbs: [
      { name: 'Ana Sayfa', path: '/' },
      { name: 'Kira Artış Hesaplama', path: CALC_PATH },
      { name: mi.label, path: `/kira-artis-orani/${mi.slug}` },
    ],
    body,
    faqs,
    legal: true,
  });
}

/** @returns {string[]} üretilen URL path'leri (sitemap için) */
function build(distDir, data, supa) {
  const entries = Object.entries(data.oranlar).sort(([a], [b]) => a.localeCompare(b));
  const known = entries.filter(([, v]) => v != null);
  if (!known.length) throw new Error('kira-artis-oranlari.json: en az bir ay dolu olmalı');
  const latest = known[known.length - 1];

  const paths = [CALC_PATH];
  writePage(distDir, CALC_PATH, calcPage(entries, latest, supa));
  for (const [k, v] of known) {
    const p = `/kira-artis-orani/${monthInfo(k).slug}`;
    writePage(distDir, p, monthPage(k, v, entries));
    paths.push(p);
  }
  return paths;
}

module.exports = { build, esc };
