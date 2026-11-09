/**
 * Belge şablonlarının içeriği. Hem sayfa metni hem belge gövdesi (PDF/DOCX/online form) buradan üretilir.
 *
 * Belge blokları (doc):
 *   { h: 'Başlık' }                         ilk h = belge başlığı, sonrakiler numaralı bölüm
 *   { f: [alan, ...] }                      alan ızgarası; alan = { id, l (etiket), w (1|.5|.33), t, ph, lines, words, opts }
 *   { cols: [{ h, f:[...] }, { h, f:[...] }] }  yan yana iki grup (taraflar)
 *   { p: 'metin {alan_id} metin' }          paragraf; {id} yer tutucuları vars/f alanlarından doldurulur
 *   { li: ['madde', ...] }                  numaralı liste
 *   { sign: [{ l: 'Kiraya Veren', name: 'kv_ad' }, ...] }
 * Alan tipleri (t): text (varsayılan), date, tel, money, number, textarea, select.
 * vars: yalnızca paragraf içinde geçen alanlar (formda ilgili paragrafın bölümünde gösterilir).
 */
const party = (p, who) => [
  { id: `${p}_ad`, l: 'Adı Soyadı / Unvanı', ph: who === 'kv' ? 'Ayşe Yılmaz' : 'Mehmet Demir' },
  { id: `${p}_tc`, l: 'T.C. Kimlik No / Vergi No', w: 0.5, t: 'number' },
  { id: `${p}_tel`, l: 'Telefon', w: 0.5, t: 'tel', ph: '05xx xxx xx xx' },
  { id: `${p}_adres`, l: who === 'kc' ? 'Tebligat Adresi' : 'Adresi', t: 'textarea', lines: 1 },
];
const partyShort = (p, who) => party(p, who).filter((x) => !x.id.endsWith('_tel'));

module.exports = [
  {
    slug: 'kira-sozlesmesi-ornegi',
    name: 'Kira Sözleşmesi Örneği',
    title: 'Kira Sözleşmesi Örneği 2026 — Online Doldur, PDF İndir',
    description: 'Konut kira sözleşmesi örneğini telefondan online doldur, tek sayfa PDF indir. Boş Word (DOCX) ve PDF şablon da ücretsiz.',
    h1: 'Kira Sözleşmesi Örneği — Online Doldur',
    summary: 'Konut kiralamaları için taraflar, kira bedeli, süre, artış ve depozito maddelerini içeren tek sayfalık sözleşme.',
    what: 'Kira sözleşmesi; kiraya veren ile kiracı arasındaki hak ve yükümlülükleri, kira bedelini, ödeme gününü, süreyi ve özel şartları yazılı hale getirir. Yazılı sözleşme, olası bir anlaşmazlıkta tarafların neyi kabul ettiğini ispatlamanın en kolay yoludur.',
    how: [
      'Taraf bilgilerini (ad soyad, T.C. kimlik no, adres) kimlikteki gibi eksiksiz yazın.',
      'Kiralananın açık adresini, türünü ve varsa demirbaşlarını belirtin.',
      'Aylık kira bedelini ve ödeme gününü girin; tutar PDF’e rakam ve yazıyla otomatik yazılır.',
      'Başlangıç tarihini ve süreyi (genellikle 1 yıl) girin.',
      'Depozito tutarını, aidat ve faturaların kime ait olduğunu belirtin.',
      'PDF’i iki nüsha yazdırın; her iki taraf imzalayıp birer nüsha alsın.',
    ],
    cautions: [
      'Konut ve çatılı işyerinde yıllık kira artışı, bir önceki kira yılının TÜFE 12 aylık ortalama değişimini aşamaz (TBK 344).',
      'Depozito (güvence bedeli) üç aylık kira bedelini aşamaz; para olarak verilirse vadeli bir tasarruf hesabına yatırılır (TBK 342).',
      'Kira ödemelerini banka yoluyla yapmak ve açıklamaya ilgili ayı yazmak ispat kolaylığı sağlar.',
      'Daire teslim tutanağını ve demirbaş listesini sözleşmeye ek yapın.',
    ],
    faqs: [
      { q: 'Kira sözleşmesini online doldurmak güvenli mi?', a: 'Evet. Formdaki bilgiler yalnızca kendi cihazınızda işlenir ve PDF tarayıcınızda oluşturulur; sunucularımıza gönderilmez.' },
      { q: 'Kira sözleşmesi noterde mi yapılmalı?', a: 'Zorunlu değildir; iki tarafın imzaladığı yazılı sözleşme geçerlidir. Bazı taraflar ek güvence için noter onayını tercih edebilir.' },
      { q: 'Kira sözleşmesi kaç nüsha yapılır?', a: 'Genellikle iki nüsha düzenlenir ve her tarafa birer imzalı nüsha verilir. Kefil varsa kefil için de nüsha hazırlanabilir.' },
      { q: 'Kira sözleşmesine hangi ekler konmalı?', a: 'Daire teslim tutanağı, demirbaş listesi ve varsa kefalet bilgileri sözleşmeye ek yapılabilir. Eklerin de taraflarca imzalanması önerilir.' },
      { q: 'Sözleşmede yazan artış oranı yasal sınırdan yüksekse ne olur?', a: 'Konut ve çatılı işyerinde yıllık artış TÜFE 12 aylık ortalama değişimini aşamaz. Güncel oranı kira artış hesaplama aracımızla görebilirsiniz.' },
      { q: 'Bu şablonu işyeri için kullanabilir miyim?', a: 'Şablon konut kiralaması için hazırlanmıştır. İşyeri kiralamalarında farklı maddeler gerekebileceğinden bir hukukçuya danışmanız önerilir.' },
    ],
    vars: [{ id: 'imza_tarihi', l: 'Sözleşme (imza) tarihi', t: 'date' }],
    doc: [
      { h: 'KİRA SÖZLEŞMESİ' },
      { h: 'Taraflar' },
      { cols: [{ h: 'Kiraya Veren', f: party('kv', 'kv') }, { h: 'Kiracı', f: party('kc', 'kc') }] },
      { h: 'Kiralanan' },
      {
        f: [
          { id: 'adres', l: 'Açık Adresi', t: 'textarea', lines: 1, ph: 'Mahalle, sokak, no, daire, ilçe/il' },
          { id: 'cins', l: 'Cinsi', w: 0.5, ph: 'Daire (3+1)' },
          { id: 'amac', l: 'Kullanım Amacı', w: 0.5, ph: 'Mesken' },
          { id: 'demirbas', l: 'Demirbaşlar', ph: 'Kombi, ankastre set, klima…' },
        ],
      },
      { h: 'Kira Bedeli ve Süre' },
      {
        f: [
          { id: 'kira', l: 'Aylık Kira Bedeli', w: 0.5, t: 'money', words: true, ph: '15.000' },
          { id: 'odeme_gunu', l: 'Ödeme Günü (her ayın)', w: 0.25, t: 'number', ph: '5' },
          { id: 'depozito', l: 'Depozito', w: 0.25, t: 'money', ph: '30.000' },
          { id: 'iban', l: 'Ödeme Hesabı (Banka / IBAN)', w: 0.5, ph: 'TR..' },
          { id: 'baslangic', l: 'Başlangıç Tarihi', w: 0.25, t: 'date' },
          { id: 'sure', l: 'Kira Süresi', w: 0.25, ph: '1 yıl' },
        ],
      },
      { h: 'Şartlar' },
      {
        li: [
          'Yenilenen kira dönemlerinde kira bedeli, bir önceki kira yılının TÜİK TÜFE 12 aylık ortalamalara göre değişim oranını geçmemek üzere artırılır.',
          'Depozito, kiralananın hasarsız teslimi ve kiracının borcu bulunmaması halinde kiracıya iade edilir.',
          'Kiracı, kiralananı özenle kullanmak ve komşulara saygı göstermekle yükümlüdür; kiraya verenin yazılı izni olmadan kiralananı başkasına kiralayamaz ve kullanım hakkını devredemez.',
          'Elektrik, su, doğalgaz, internet ve benzeri tüketim giderleri kiracıya aittir; aidat ve ortak giderlerin paylaşımı özel şartlarda belirtilir.',
          'Kiracı, kiralananı sözleşme sona erdiğinde teslim aldığı şekilde iade eder; olağan kullanımdan doğan yıpranmalardan sorumlu değildir.',
          'Taraflar, bu sözleşmede yazılı adreslerine yapılacak bildirimlerin geçerli olacağını kabul eder.',
        ],
      },
      { h: 'Özel Şartlar' },
      { f: [{ id: 'ozel', l: 'Özel şartlar (aidat, evcil hayvan, tadilat vb.)', t: 'textarea', lines: 2, ph: 'Aidat kiracıya aittir. Evcil hayvan beslenemez.' }] },
      { p: 'İşbu sözleşme taraflarca okunarak {imza_tarihi} tarihinde iki nüsha olarak imza altına alınmıştır.' },
      { sign: [{ l: 'Kiraya Veren', name: 'kv_ad' }, { l: 'Kiracı', name: 'kc_ad' }] },
    ],
  },
  {
    slug: 'tahliye-taahhutnamesi-ornegi',
    name: 'Tahliye Taahhütnamesi Örneği',
    title: 'Tahliye Taahhütnamesi Örneği — Online Doldur, PDF İndir',
    description: 'Tahliye taahhütnamesini telefondan online doldur, PDF indir. Geçerlilik şartları, doldurma rehberi; boş Word ve PDF şablon.',
    h1: 'Tahliye Taahhütnamesi Örneği — Online Doldur',
    summary: 'Kiracının kiralananı belirli bir tarihte boşaltacağını yazılı olarak üstlendiği belge.',
    what: 'Tahliye taahhütnamesi, kiracının kiralananı belirli bir tarihte boşaltacağını yazılı olarak taahhüt ettiği belgedir. Kiracı belirtilen tarihte çıkmazsa kiraya veren, taahhüde dayanarak tahliye için yasal yollara başvurabilir.',
    how: [
      'Kiraya veren ve kiracının kimlik bilgilerini eksiksiz yazın.',
      'Kiralananın açık adresini sözleşmedeki gibi yazın.',
      'Boşaltma tarihini ve taahhüdün düzenlendiği tarihi seçin.',
      'PDF’i yazdırıp kiracıya imzalatın.',
    ],
    cautions: [
      'Taahhüt, kiralananın kiracıya tesliminden SONRA yazılı olarak verilmelidir; teslimden önce (örneğin sözleşmeyle aynı anda) alınan taahhüt geçersizdir (TBK 352).',
      'Düzenleme tarihi ile tahliye tarihi açık ve okunaklı yazılmalıdır.',
      'Taahhüt edilen tarihte boşaltılmazsa, bu tarihten itibaren bir ay içinde icra takibi veya dava yoluna başvurulmalıdır.',
      'İmzanın kiracıya ait olduğundan emin olun; tereddüt varsa noterde düzenlemek ispatı kolaylaştırır.',
    ],
    faqs: [
      { q: 'Tahliye taahhütnamesi ne zaman imzalatılmalı?', a: 'Kiralanan kiracıya teslim edildikten sonra imzalatılmalıdır. Teslimden önce, örneğin kira sözleşmesiyle birlikte alınan taahhüt geçersiz sayılır.' },
      { q: 'Tahliye taahhütnamesinin noterde yapılması zorunlu mu?', a: 'Zorunlu değildir; yazılı ve kiracı tarafından imzalanmış olması yeterlidir. Noter onayı, imzaya itiraz riskine karşı ispatı kolaylaştırır.' },
      { q: 'Kiracı taahhüt ettiği tarihte çıkmazsa ne yapılır?', a: 'Kiraya veren, tahliye tarihinden itibaren bir ay içinde icra takibi başlatabilir veya dava açabilir. Süreç için bir avukata danışmanız önerilir.' },
      { q: 'Boş tarihli tahliye taahhütnamesi geçerli mi?', a: 'Tarihlerin sonradan doldurulduğu iddiası uyuşmazlık konusu olabilir. Taahhütnameyi düzenleme ve tahliye tarihleri yazılı olarak imzalatmak en güvenli yoldur.' },
      { q: 'Online doldurduğum bilgiler kaydediliyor mu?', a: 'Hayır. Bilgiler yalnızca kendi cihazınızda işlenir ve PDF tarayıcınızda oluşturulur; sunucularımıza gönderilmez.' },
    ],
    vars: [
      { id: 'tahliye_tarihi', l: 'Tahliye (boşaltma) tarihi', t: 'date' },
      { id: 'duzenleme_tarihi', l: 'Düzenleme tarihi', t: 'date' },
    ],
    doc: [
      { h: 'TAHLİYE TAAHHÜTNAMESİ' },
      { h: 'Taraflar' },
      { cols: [{ h: 'Kiraya Veren', f: partyShort('kv', 'kv') }, { h: 'Taahhüt Eden Kiracı', f: partyShort('kc', 'kc') }] },
      { h: 'Kiralanan' },
      { f: [{ id: 'adres', l: 'Açık Adresi', t: 'textarea', lines: 1 }, { id: 'sozlesme_tarihi', l: 'Kira Sözleşmesi Tarihi', w: 0.5, t: 'date' }] },
      { h: 'Taahhüt' },
      { p: 'Yukarıda adresi yazılı ve kiracısı bulunduğum taşınmazı {tahliye_tarihi} tarihinde, hiçbir ihtar ve ihbara gerek kalmaksızın, boş ve hasarsız olarak kiraya verene teslim edeceğimi; bu tarihte tahliye etmediğim takdirde hakkımda yasal yollara başvurulabileceğini kabul ve taahhüt ederim.' },
      { p: 'Düzenleme tarihi: {duzenleme_tarihi}' },
      { sign: [{ l: 'Taahhüt Eden Kiracı', name: 'kc_ad' }] },
    ],
  },
  {
    slug: 'kira-odeme-ihtarnamesi-ornegi',
    name: 'Kira Ödeme İhtarnamesi Örneği',
    title: 'Kira Ödeme İhtarnamesi Örneği — Online Doldur, PDF',
    description: 'Ödenmeyen kira için ihtarnameyi telefondan online doldur, PDF indir. 30 gün süre, noter tebliği ve doldurma rehberi.',
    h1: 'Kira Ödeme İhtarnamesi Örneği — Online Doldur',
    summary: 'Ödenmeyen kira bedelleri için kiracıya süre veren ve sonuçlarını bildiren yazılı ihtar.',
    what: 'Kira ödeme ihtarnamesi, kiracının ödemediği kira bedellerini belirterek ödeme için süre veren ve süre içinde ödenmezse sözleşmenin feshedileceğini bildiren yazılı ihtardır. Genellikle noter aracılığıyla gönderilir.',
    how: [
      'Kiraya veren (ihtar eden) ve kiracı (muhatap) bilgilerini yazın.',
      'Kiralananın adresini ve kira sözleşmesinin tarihini belirtin.',
      'Ödenmeyen ayları ve tutarlarını, toplam borcu yazın.',
      'Ödemenin yapılacağı banka hesabını (IBAN) belirtin.',
      'PDF’i notere götürerek kiracıya tebliğ ettirin.',
    ],
    cautions: [
      'Konut ve çatılı işyeri kiralarında kiracıya ödeme için en az 30 günlük süre verilmelidir (TBK 315).',
      'Sürenin başlangıcı ihtarnamenin kiracıya tebliğ tarihidir; tebliğ belgesini saklayın.',
      'Borç tutarlarını ay ay ve doğru yazın; hatalı tutar uyuşmazlığa yol açabilir.',
      'Tahliye ve alacak takibi için bir avukattan destek almanız önerilir.',
    ],
    faqs: [
      { q: 'Kira ihtarnamesi noterden mi gönderilmeli?', a: 'Noter aracılığıyla gönderilmesi, tebliğin ve içeriğin ispatı açısından en güvenli yoldur ve uygulamada yaygın olarak tercih edilir.' },
      { q: 'İhtarnamede kiracıya ne kadar süre verilmeli?', a: 'Konut ve çatılı işyeri kiralarında ödeme için en az 30 günlük süre verilmelidir. Bu süre ihtarnamenin kiracıya tebliğinden itibaren başlar.' },
      { q: 'Kiracı süre içinde ödemezse ne olur?', a: 'Kiraya veren sözleşmeyi feshedebilir ve tahliye ile alacak için yasal yollara başvurabilir. Süreç için bir avukata danışmanız önerilir.' },
      { q: 'Birden fazla ayın kirası için tek ihtarname gönderilebilir mi?', a: 'Evet. Ödenmeyen tüm aylar ve tutarları tek ihtarnamede ayrı ayrı belirtilebilir.' },
      { q: 'Ödenmeyen kiraları nasıl takip edebilirim?', a: 'Kira Asistan, her kiracının ödeme günlerini ve geciken ödemelerini otomatik takip eder; ihtarname öncesinde hangi ayların ödenmediğini net görürsünüz.' },
    ],
    vars: [
      { id: 'sozlesme_tarihi', l: 'Kira sözleşmesi tarihi', t: 'date' },
      { id: 'tarih', l: 'İhtarname tarihi', t: 'date' },
    ],
    doc: [
      { h: 'İHTARNAME' },
      { h: 'Taraflar' },
      { cols: [{ h: 'İhtar Eden (Kiraya Veren)', f: partyShort('kv', 'kv') }, { h: 'Muhatap (Kiracı)', f: partyShort('kc', 'kc') }] },
      { h: 'Konu' },
      { p: 'Ödenmeyen kira bedellerinin ödenmesi ihtarıdır.' },
      { h: 'Açıklamalar' },
      { p: '1. Muhatap, {sozlesme_tarihi} tarihli kira sözleşmesi ile aşağıdaki adreste bulunan taşınmazda kiracıdır.' },
      { f: [{ id: 'adres', l: 'Kiralananın Adresi', t: 'textarea', lines: 1 }] },
      { p: '2. Muhatabın aşağıda belirtilen aylara ait kira bedellerini ödemediği tespit edilmiştir:' },
      {
        f: [
          { id: 'aylar', l: 'Ödenmeyen aylar ve tutarlar', t: 'textarea', lines: 2, ph: 'Ekim 2026 – 15.000 ₺\nKasım 2026 – 15.000 ₺' },
          { id: 'toplam', l: 'Toplam Borç', w: 0.5, t: 'money', words: true },
          { id: 'iban', l: 'Ödeme Hesabı (Banka / IBAN)', w: 0.5 },
        ],
      },
      { p: '3. İşbu ihtarnamenin tebliğinden itibaren 30 (otuz) gün içinde yukarıda belirtilen kira borcunun belirtilen hesaba ödenmesini; aksi halde kira sözleşmesinin feshedileceğini ve tahliye ile alacak için yasal yollara başvurulacağını ihtar ederim.' },
      { p: 'Sayın Noter; üç nüsha olarak düzenlenen işbu ihtarnamenin bir nüshasının muhataba tebliğini, bir nüshasının dairenizde saklanmasını ve tebliğ şerhli bir nüshasının tarafıma verilmesini rica ederim. Tarih: {tarih}' },
      { sign: [{ l: 'İhtar Eden', name: 'kv_ad' }] },
    ],
  },
  {
    slug: 'depozito-teslim-iade-tutanagi',
    name: 'Depozito Teslim ve İade Tutanağı',
    title: 'Depozito Teslim ve İade Tutanağı — Online Doldur',
    description: 'Depozito teslim ve iade tutanağını telefondan online doldur, PDF indir. Kesintiler, yasal sınırlar ve boş Word/PDF şablon.',
    h1: 'Depozito Teslim ve İade Tutanağı — Online Doldur',
    summary: 'Depozitonun alındığını ve iade edildiğini, varsa kesintileriyle birlikte kayıt altına alan tutanak.',
    what: 'Depozito tutanağı, kiracının kiraya verene ödediği güvence bedelinin tutarını, teslim şeklini ve tarihini; sözleşme bitiminde de iade edilen tutarı ve varsa kesintileri kayıt altına alır. Böylece depozito konusundaki anlaşmazlıkların önüne geçilir.',
    how: [
      'Teslim bölümünü depozito ödendiği gün doldurun ve iki tarafa imzalatın.',
      'Depozitonun vadeli hesaba mı yatırıldığını, başka şekilde mi verildiğini belirtin.',
      'Sözleşme bittiğinde iade bölümünü doldurun; kesinti varsa nedenini ve tutarını yazın.',
      'İade bölümünü de iki tarafa imzalatın.',
    ],
    cautions: [
      'Konut ve çatılı işyerlerinde depozito üç aylık kira bedelini aşamaz (TBK 342).',
      'Para olarak verilen depozito, kiraya verenin onayı olmadan çekilemeyecek şekilde vadeli bir tasarruf hesabına yatırılır (TBK 342).',
      'Kesintileri daire teslim tutanağındaki tespitlere dayandırın; fotoğraf ve fatura saklayın.',
      'Olağan kullanımdan kaynaklanan yıpranmalar için kesinti yapılması uyuşmazlık konusu olabilir.',
    ],
    faqs: [
      { q: 'Depozito en fazla ne kadar olabilir?', a: 'Konut ve çatılı işyeri kiralarında depozito üç aylık kira bedelini aşamaz.' },
      { q: 'Depozito nakit olarak verilebilir mi?', a: 'Para olarak verilen depozitonun, kiraya verenin onayı olmadan çekilemeyecek şekilde bir bankada vadeli tasarruf hesabına yatırılması gerekir.' },
      { q: 'Depozitodan hangi durumlarda kesinti yapılabilir?', a: 'Genellikle ödenmemiş kira veya giderler ve kiracının kusurundan kaynaklanan hasarlar için kesinti yapılır. Kesintiler tutanakta gerekçesiyle yazılmalıdır.' },
      { q: 'Depozito ne zaman iade edilmeli?', a: 'Kiralanan teslim edilip borç ve hasar durumu netleştiğinde iade edilir. İade tarihini sözleşmede veya tutanakta belirtmek uyuşmazlığı önler.' },
      { q: 'Tutanağı sadece teslim bölümüyle kullanabilir miyim?', a: 'Evet. Teslimde yalnızca teslim bölümünü doldurup imzalatın; çıkışta aynı belgenin iade bölümünü doldurabilir veya yeni bir tutanak oluşturabilirsiniz.' },
    ],
    vars: [],
    doc: [
      { h: 'DEPOZİTO TESLİM VE İADE TUTANAĞI' },
      { h: 'Taraflar ve Kiralanan' },
      {
        f: [
          { id: 'kv_ad', l: 'Kiraya Veren', w: 0.5 },
          { id: 'kc_ad', l: 'Kiracı', w: 0.5 },
          { id: 'adres', l: 'Kiralananın Adresi', w: 0.67 },
          { id: 'sozlesme_tarihi', l: 'Kira Sözleşmesi Tarihi', w: 0.33, t: 'date' },
        ],
      },
      { h: 'Depozito Teslimi' },
      {
        f: [
          { id: 'depozito', l: 'Depozito Tutarı', w: 0.67, t: 'money', words: true },
          { id: 'teslim_tarihi', l: 'Teslim Tarihi', w: 0.33, t: 'date' },
          { id: 'teslim_sekli', l: 'Teslim Şekli', w: 0.5, t: 'select', opts: ['Vadeli tasarruf hesabı', 'Banka havalesi', 'Nakit', 'Diğer'] },
          { id: 'hesap', l: 'Banka / Hesap Bilgisi', w: 0.5 },
        ],
      },
      { p: 'Yukarıda belirtilen depozito tutarı kiraya veren tarafından teslim alınmıştır.' },
      { sign: [{ l: 'Kiraya Veren', name: 'kv_ad' }, { l: 'Kiracı', name: 'kc_ad' }] },
      { h: 'Depozito İadesi (sözleşme bitiminde doldurulur)' },
      {
        f: [
          { id: 'iade_teslim', l: 'Kiralananın Teslim Tarihi', w: 0.33, t: 'date' },
          { id: 'kesinti_toplam', l: 'Toplam Kesinti', w: 0.33, t: 'money' },
          { id: 'iade_tutar', l: 'İade Edilen Tutar', w: 0.33, t: 'money' },
          { id: 'kesintiler', l: 'Kesintiler (neden / tutar)', t: 'textarea', lines: 2, ph: 'Kırık banyo dolabı – 2.500 ₺' },
          { id: 'iade_sekli', l: 'İade Şekli ve Tarihi', w: 1 },
        ],
      },
      { p: 'Kiracı, yukarıda belirtilen tutarı teslim aldığını; taraflar, depozito konusunda birbirlerinden başka talepleri bulunmadığını kabul eder.' },
      { sign: [{ l: 'Kiraya Veren', name: 'kv_ad' }, { l: 'Kiracı', name: 'kc_ad' }] },
    ],
  },
  {
    slug: 'daire-teslim-tutanagi',
    name: 'Daire Teslim Tutanağı',
    title: 'Daire Teslim Tutanağı Örneği — Online Doldur, PDF',
    description: 'Daire teslim tutanağını telefondan oda oda online doldur, PDF indir. Sayaçlar, anahtarlar, demirbaşlar; boş Word ve PDF şablon.',
    h1: 'Daire Teslim Tutanağı — Online Doldur',
    summary: 'Dairenin, demirbaşların ve sayaç değerlerinin teslim anındaki durumunu oda oda kayıt altına alan tutanak.',
    what: 'Daire teslim tutanağı, kiralananın kiracıya teslim edildiği (ve sözleşme bitiminde geri alındığı) andaki durumunu; duvarlar, zemin, kapı-pencere, tesisat, demirbaşlar ve sayaç değerleri bazında kayıt altına alır. Depozito iadesinde ve hasar tartışmalarında temel delildir.',
    how: [
      'Teslim günü daireyi iki taraf birlikte gezin; telefonda formu oda oda doldurun.',
      'Her bölümün durumunu kısaca yazın (“sağlam”, “salon duvarında 10 cm çizik”), hasarları fotoğraflayın.',
      'Elektrik, su ve doğalgaz sayaçlarının endekslerini yazın.',
      'Teslim edilen anahtar sayısını ve demirbaşları listeleyin.',
      'PDF’i iki taraf imzalasın; çıkışta aynı formla yeniden doldurup karşılaştırın.',
    ],
    cautions: [
      'Fotoğrafları tarihli olarak saklayın ve tutanağa ek yapın.',
      'Genel ifadeler yerine somut tespit yazın: “salon duvarında 10 cm çizik” gibi.',
      'Sayaç endekslerini fotoğraflayın; son faturaların kime ait olduğunu belirtin.',
      'Tutanağı kira sözleşmesinin eki olarak saklayın.',
    ],
    faqs: [
      { q: 'Daire teslim tutanağı zorunlu mu?', a: 'Yasal bir zorunluluk değildir; ancak çıkışta hasar ve depozito tartışmalarında en önemli delil olduğundan her kiralamada düzenlenmesi önerilir.' },
      { q: 'Tutanak ne zaman düzenlenir?', a: 'Kiracı daireye girerken (teslim) ve çıkarken (iade) olmak üzere iki kez düzenlenir. Böylece iki durum karşılaştırılabilir.' },
      { q: 'Tutanağa fotoğraf eklemek gerekir mi?', a: 'Zorunlu değildir ama tavsiye edilir. Tarihli fotoğraflar, yazılı tespitleri güçlendirir.' },
      { q: 'Sayaç bilgileri neden yazılır?', a: 'Teslim anındaki endeksler, tüketim faturalarının hangi döneminin kime ait olduğunu belirlemeye yarar.' },
      { q: 'Tutanağı telefondan doldurup orada imzalatabilir miyim?', a: 'Formu telefondan doldurup PDF’i oluşturabilir, ardından yazdırıp imzalatabilirsiniz. PDF’i WhatsApp veya e-postayla karşı tarafa da gönderebilirsiniz.' },
    ],
    vars: [],
    doc: [
      { h: 'DAİRE TESLİM TUTANAĞI' },
      { h: 'Genel Bilgiler' },
      {
        f: [
          { id: 'tur', l: 'Teslim Türü', w: 0.5, t: 'select', opts: ['Giriş — kiracıya teslim', 'Çıkış — kiraya verene iade'] },
          { id: 'tarih', l: 'Tarih', w: 0.5, t: 'date' },
          { id: 'adres', l: 'Kiralananın Adresi' },
          { id: 'kv_ad', l: 'Kiraya Veren', w: 0.5 },
          { id: 'kc_ad', l: 'Kiracı', w: 0.5 },
        ],
      },
      { h: 'Oda Oda Durum' },
      {
        f: [
          ['giris', 'Giriş / Antre'], ['salon', 'Salon'], ['mutfak', 'Mutfak (dolap, tezgâh, ankastre)'], ['banyo', 'Banyo / WC'],
          ['yatak1', 'Yatak Odası 1'], ['yatak2', 'Yatak Odası 2'], ['balkon', 'Balkon'], ['kapi', 'Kapılar ve Pencereler'],
          ['zemin', 'Zemin ve Duvarlar'], ['elektrik', 'Elektrik ve Prizler'], ['kombi', 'Kombi / Petekler'], ['diger', 'Diğer'],
        ].map(([id, l]) => ({ id, l, w: 0.5, ph: 'Sağlam' })),
      },
      { h: 'Sayaçlar ve Anahtarlar' },
      {
        f: [
          { id: 'elektrik_endeks', l: 'Elektrik Endeksi', w: 0.33, t: 'number' },
          { id: 'su_endeks', l: 'Su Endeksi', w: 0.33, t: 'number' },
          { id: 'gaz_endeks', l: 'Doğalgaz Endeksi', w: 0.33, t: 'number' },
          { id: 'anahtar', l: 'Anahtar Sayısı', w: 0.33, t: 'number' },
          { id: 'demirbas', l: 'Demirbaşlar', w: 0.67, ph: 'Kombi, ankastre set, klima…' },
          { id: 'notlar', l: 'Notlar', t: 'textarea', lines: 2 },
        ],
      },
      { p: 'Taraflar, kiralananın yukarıda belirtilen durumda teslim edildiğini / teslim alındığını kabul eder.' },
      { sign: [{ l: 'Kiraya Veren', name: 'kv_ad' }, { l: 'Kiracı', name: 'kc_ad' }] },
    ],
  },
];
