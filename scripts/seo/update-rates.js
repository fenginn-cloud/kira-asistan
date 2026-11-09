/**
 * Kira artış oranlarını TCMB EVDS'deki TÜFE endeksinden hesaplayıp
 * data/kira-artis-oranlari.json'a YENİ ayları ekler. (Aylık GitHub Actions görevi çalıştırır.)
 *
 *   EVDS_API_KEY=... node scripts/seo/update-rates.js
 *
 * Hesap (TÜİK'in "12 aylık ortalamalara göre değişim" tanımı):
 *   Veri ayı D için oran = (D dahil son 12 ayın endeks ortalaması / ondan önceki 12 ayın ortalaması − 1) × 100
 *   Bu oran, D'nin BİR SONRAKİ ayındaki kira yenilemelerine uygulanır (anahtar = D + 1 ay).
 *
 * Güvenlik: Dosyada zaten olan ayların hesaplanan değeri dosyadakiyle (±0,01) uyuşmazsa
 * (ör. endeks baz yılı değişti, seri kodu yanlış) HİÇBİR ŞEY yazılmaz ve görev hata verir.
 * Mevcut değerlerin üzerine asla yazılmaz.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', '..', 'data', 'kira-artis-oranlari.json');
const KEY = process.env.EVDS_API_KEY;
// TÜFE genel endeksi. TÜİK baz yılı değişirse EVDS seri kodu değişebilir → EVDS_SERIES ile ezilebilir.
const SERIES = process.env.EVDS_SERIES || 'TP.FG.J0';

const pad = (n) => String(n).padStart(2, '0');
const addMonth = (y, m, d) => {
  const t = y * 12 + (m - 1) + d;
  return [Math.floor(t / 12), (t % 12) + 1];
};

async function fetchIndex() {
  const now = new Date();
  const start = `01-01-${now.getUTCFullYear() - 3}`;
  const end = `01-${pad(now.getUTCMonth() + 1)}-${now.getUTCFullYear()}`;
  const url = `https://evds2.tcmb.gov.tr/service/evds/series=${SERIES}&startDate=${start}&endDate=${end}&type=json`;
  const res = await fetch(url, { headers: { key: KEY } });
  if (!res.ok) throw new Error(`EVDS HTTP ${res.status}`);
  const json = await res.json();
  const field = SERIES.replace(/\./g, '_');
  const map = new Map();
  for (const it of json.items || []) {
    const v = parseFloat(it[field]);
    const [y, m] = String(it.Tarih).split('-').map(Number);
    if (isFinite(v) && y && m) map.set(`${y}-${pad(m)}`, v);
  }
  if (map.size < 25) throw new Error(`EVDS'den yeterli veri gelmedi (${map.size} ay)`);
  return map;
}

/** Veri ayı (YYYY-MM) için 12 aylık ortalama değişim; eksik ay varsa null. */
function rateFor(index, key) {
  const [y, m] = key.split('-').map(Number);
  const vals = [];
  for (let i = 0; i < 24; i++) {
    const [yy, mm] = addMonth(y, m, -i);
    const v = index.get(`${yy}-${pad(mm)}`);
    if (v == null) return null;
    vals.push(v);
  }
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  return Math.round((avg(vals.slice(0, 12)) / avg(vals.slice(12)) - 1) * 10000) / 100;
}

(async () => {
  if (!KEY) throw new Error('EVDS_API_KEY tanımlı değil');
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const index = await fetchIndex();

  // Hesaplanabilen tüm yenileme ayları: anahtar = veri ayı + 1
  const computed = {};
  for (const dataKey of index.keys()) {
    const r = rateFor(index, dataKey);
    if (r == null) continue;
    const [y, m] = dataKey.split('-').map(Number);
    const [ry, rm] = addMonth(y, m, 1);
    computed[`${ry}-${pad(rm)}`] = r;
  }

  // Doğrulama: bilinen değerlerle karşılaştır
  let checked = 0;
  for (const [k, v] of Object.entries(data.oranlar)) {
    if (v == null || computed[k] == null) continue;
    checked++;
    if (Math.abs(computed[k] - v) > 0.011) {
      throw new Error(`Doğrulama başarısız: ${k} dosyada ${v}, EVDS'den hesaplanan ${computed[k]}. Seri kodu/baz yılı kontrol edilmeli (EVDS_SERIES).`);
    }
  }
  if (!checked) throw new Error('Doğrulanacak ortak ay yok — güvenli değil, yazılmadı.');

  // Sadece dosyadaki son aydan SONRAKİ yeni ayları ekle
  const last = Object.keys(data.oranlar).sort().pop();
  const added = Object.keys(computed)
    .filter((k) => k > last)
    .sort();
  for (const k of added) data.oranlar[k] = computed[k];

  if (!added.length) {
    console.log(`[oran] Yeni ay yok (son: ${last}). ${checked} ay doğrulandı.`);
    return;
  }
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
  console.log(`[oran] Eklendi: ${added.map((k) => `${k}=${data.oranlar[k]}`).join(', ')}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `added=${added.join(',')}\n`);
})().catch((e) => {
  console.error('[oran] HATA:', e.message);
  process.exit(1);
});
