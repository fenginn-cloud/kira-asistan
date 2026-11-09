/**
 * Elle oran ekleme: node scripts/seo/add-rate.js "30,85" [YYYY-AA]
 * Ay verilmezse dosyadaki son yenileme ayından sonraki ay kullanılır.
 * Mevcut bir ayın üzerine yazmaz; makul aralık dışındaki değerleri reddeder.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', '..', 'data', 'kira-artis-oranlari.json');
const pad = (n) => String(n).padStart(2, '0');

function fail(msg) {
  console.error('[oran] HATA:', msg);
  process.exit(1);
}

const raw = String(process.argv[2] || '').trim().replace('%', '').replace(',', '.');
const rate = Number(raw);
if (!raw || !isFinite(rate) || rate <= 0 || rate >= 200) fail(`Geçersiz oran: "${process.argv[2]}" (ör. 30,85)`);

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const keys = Object.keys(data.oranlar).sort();
let key = String(process.argv[3] || '').trim();
if (!key) {
  const [y, m] = keys[keys.length - 1].split('-').map(Number);
  key = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
}
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) fail(`Geçersiz ay: "${key}" (YYYY-AA olmalı)`);
if (data.oranlar[key] != null) fail(`${key} zaten var (%${data.oranlar[key]}). Üzerine yazılmadı.`);

data.oranlar[key] = Math.round(rate * 100) / 100;
data.oranlar = Object.fromEntries(Object.entries(data.oranlar).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
console.log(`[oran] Eklendi: ${key}=${data.oranlar[key]}`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `added=${key}\n`);
