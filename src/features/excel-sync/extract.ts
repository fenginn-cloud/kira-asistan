import * as XLSX from 'xlsx';
import { foldSearch } from '@/lib/utils/property';
import {
  matchHeader,
  matchMonth,
  paidFromFill,
  paidFromText,
  type CanonField,
} from './normalize';
import { isBlank, parseDate, parseMoney, parsePaymentDay, parsePhone } from './parse';
import type { ExtractedContract } from './types';

type Row = unknown[];

/** Mülk adını normalize et: "42EVLER 01" → "42 Evler 01", boşlukları toparla. */
function normProperty(s: string): string {
  return s
    .replace(/(\d)([A-Za-zÇĞİÖŞÜçğıöşü])/g, '$1 $2')
    .replace(/([A-Za-zÇĞİÖŞÜçğıöşü])(\d)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sayfa adından mülk temeli (blok/daire sütunlu sayfalar için). */
function sheetProperty(name: string): string {
  const f = foldSearch(name);
  if (f.includes('dream')) return 'Dream Rezidans';
  if (f.includes('42') || f.includes('evler')) return '42 Evler';
  if (f.includes('yuruyus')) return 'Yürüyüş Yolu';
  return normProperty(name.trim());
}

const cellVal = (ws: XLSX.WorkSheet, r: number, c: number) =>
  ws[XLSX.utils.encode_cell({ r, c })];

/** Başlık satırını bul: en çok tanınan sütun içeren ilk satır (ilk 8 satırda). */
function findHeaderRow(rows: Row[]): number {
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const row = rows[i] ?? [];
    let score = 0;
    for (const cell of row) {
      const s = String(cell ?? '').trim();
      if (!s) continue;
      if (matchHeader(s)) score++;
      else if (matchMonth(s) != null) score += 0.5;
    }
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return bestScore >= 2 ? best : -1;
}

interface ColMap {
  fields: Partial<Record<CanonField, number>>;
  months: { col: number; monthIndex: number }[];
  /** Komisyon sütun(lar)ı — toplanır (aylık komisyon sütunları olabilir). */
  commissionCols: number[];
}

function buildColMap(headerRow: Row): ColMap {
  const fields: Partial<Record<CanonField, number>> = {};
  const months: { col: number; monthIndex: number }[] = [];
  const commissionCols: number[] = [];
  headerRow.forEach((cell, c) => {
    const s = String(cell ?? '').trim();
    if (!s) return;
    // Komisyon TUTARI (Türkçe İ ve "KOMSİYON" yazım hatası dahil). "Komisyon
    // Oranı" / "%" gibi oran sütunlarını dışarıda bırak (tutara katılmasın).
    const fs = foldSearch(s);
    if (/kom[siı]?[siı]yon/.test(fs) && !/oran|%/.test(fs)) { commissionCols.push(c); return; }
    const f = matchHeader(s);
    if (f && fields[f] == null) { fields[f] = c; return; }
    const mi = matchMonth(s);
    if (mi != null) months.push({ col: c, monthIndex: mi });
  });
  return { fields, months, commissionCols };
}

/**
 * Blok/daire/ödeme-günü sütunlarını hücre DEĞERLERİNDEN doğrula ve gerekiyorsa
 * yeniden eşle. Bu sayfalarda başlıklar kayık olabiliyor (ör. DREAM: "DAİRE NO"
 * başlığı ödeme-günü sütununun üzerinde, gerçek daire değerleri yan sütunda).
 * Değer-temelli tespit, kayık başlığı geçersiz kılar.
 */
function refineByValues(rows: Row[], hr: number, map: ColMap): void {
  const sampleRows = rows.slice(hr + 1, hr + 25);
  const ncols = Math.max(0, ...sampleRows.map((r) => r.length));
  const ratio = (c: number, re: RegExp) => {
    let hit = 0, tot = 0;
    for (const r of sampleRows) {
      const v = String(r[c] ?? '').trim();
      if (!v) continue;
      tot++;
      if (re.test(foldSearch(v)) || re.test(v)) hit++;
    }
    return tot ? hit / tot : 0;
  };
  const patterns: { field: CanonField; re: RegExp }[] = [
    { field: 'block', re: /blok/i },
    { field: 'unit', re: /^da[iİ]re\s*\d|^d\.?\s*\d/i },
    { field: 'paymentDay', re: /her\s*r?ay|pe[sş]in|senet|ayin/i },
  ];
  const monthCols = new Set(map.months.map((m) => m.col));
  const commissionSet = new Set(map.commissionCols);
  for (const { field, re } of patterns) {
    const cur = map.fields[field];
    // Başlıkla eşlenen sütun değerlere uyuyorsa dokunma.
    if (cur != null && ratio(cur, re) >= 0.4) continue;
    // Aksi halde değerlere göre en iyi sütunu bul (başka alana/aya atanmamış).
    const others = new Set(
      (Object.entries(map.fields) as [CanonField, number][])
        .filter(([f]) => f !== field)
        .map(([, c]) => c)
    );
    let best = -1, bestR = 0.4;
    for (let c = 0; c < ncols; c++) {
      if (others.has(c) || monthCols.has(c) || commissionSet.has(c)) continue;
      const rr = ratio(c, re);
      if (rr > bestR) { bestR = rr; best = c; }
    }
    if (best >= 0) map.fields[field] = best;
    else if (cur != null && ratio(cur, re) < 0.4) delete map.fields[field]; // kayık başlığı temizle
  }
}

function monthsOf(
  ws: XLSX.WorkSheet,
  r: number,
  cols: { col: number; monthIndex: number }[],
  year: number
): ExtractedContract['months'] {
  const out: ExtractedContract['months'] = [];
  for (const { col, monthIndex } of cols) {
    const cell = cellVal(ws, r, col);
    const hasNum = !!cell && typeof cell.v === 'number';
    const fg = (cell?.s as any)?.fgColor;
    const rgb: string | undefined = fg?.rgb ? String(fg.rgb).toUpperCase() : undefined;
    const cls = paidFromFill(rgb, fg?.theme === 1, hasNum);
    const textPaid = cell?.w ? paidFromText(String(cell.w)) : null;
    let paid: boolean;
    if (textPaid != null) paid = textPaid;
    else if (cls === 'paid') paid = true;
    else if (cls === 'unpaid') paid = false;
    else continue; // 'na' → o ay yok
    const due = parseMoney(cell?.v ?? cell?.w) ?? 0;
    if (due <= 0 && !textPaid) continue;
    out.push({ periodMonth: `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`, amountDue: due, paid });
  }
  return out;
}

/**
 * Bir çalışma kitabından tüm sözleşmeleri çıkarır (genel + bize-özel).
 * Başlıklı sayfalar sütun-eşleştirmeyle, başlıksız EGE gibi sabit-düzen sayfalar
 * konum tespitiyle okunur. Renkli aylar ödendi/ödenmedi olarak gelir.
 */
export function extractWorkbook(
  wb: XLSX.WorkBook,
  opts: { year?: number } = {}
): ExtractedContract[] {
  const year = opts.year ?? new Date().getFullYear();
  const out: ExtractedContract[] = [];

  for (const sheetName of wb.SheetNames) {
    if (foldSearch(sheetName).includes('toplu')) continue; // konsolide özet — atla
    if (foldSearch(sheetName).includes('gider')) continue; // giderler
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: false, defval: '' });
    const hr = findHeaderRow(rows);
    if (hr < 0) { extractFixed(ws, rows, sheetName, year, out); continue; }

    const colMap = buildColMap(rows[hr] ?? []);
    refineByValues(rows, hr, colMap);
    const { fields, months, commissionCols } = colMap;
    const base = sheetProperty(sheetName);
    const hasUnit = fields.unit != null;
    const hasProp = fields.propertyName != null;

    let lastBlock: string | null = null; // dikey birleştirilmiş blok hücrelerini taşı
    for (let r = hr + 1; r < rows.length; r++) {
      const row = rows[r] ?? [];
      const get = (f: CanonField) => (fields[f] != null ? row[fields[f]!] : undefined);
      const tenant = String(get('tenantName') ?? '').trim();
      const propCell = String(get('propertyName') ?? '').trim();
      const unitCell = String(get('unit') ?? '').trim();
      const blockCell = String(get('block') ?? '').trim();
      if (blockCell) lastBlock = blockCell;

      let propertyName: string | null;
      let block: string | null = blockCell || lastBlock;
      let unit: string | null = unitCell || null;
      if (hasProp && propCell) { propertyName = normProperty(propCell); }
      else if (hasUnit && unitCell) { propertyName = base; }
      else { propertyName = null; }

      const monthsList = monthsOf(ws, r, months, year);
      const rent = parseMoney(get('rentAmount')) ??
        (monthsList.length ? monthsList[monthsList.length - 1]!.amountDue : null);
      const commission = commissionCols.reduce((sum, c) => sum + (parseMoney(row[c]) ?? 0), 0) || null;
      const phone = parsePhone(get('tenantPhone'));
      const vacant = !tenant || /^(bo[şs]|hazir|temizlenecek|tadilat|geci[cç])/i.test(foldSearch(tenant));
      // Sözleşme satırı sayılması için: kiracı VE (mülk veya telefon) olmalı.
      // Aksi halde muhasebe/toplam/not satırıdır → sessizce atla ("incelenecek" değil).
      if (!tenant) continue;
      if (!propertyName && !phone) continue;

      out.push({
        source: { sheet: sheetName, row: r + 1 },
        propertyName,
        block,
        unit,
        tenantName: tenant || null,
        tenantPhone: phone,
        rentAmount: rent,
        depositAmount: parseMoney(get('depositAmount')),
        commissionAmount: commission,
        startDate: parseDate(get('startDate')),
        endDate: parseDate(get('endDate')),
        paymentDay: parsePaymentDay(get('paymentDay')),
        notes: (() => { const n = String(get('notes') ?? '').trim(); return n || null; })(),
        months: monthsList,
        vacant,
      });
    }
  }
  return out;
}

/**
 * Başlıksız, sabit-düzen sayfa (ör. EGE İREM BİZİM APART.): kolon sırası bilinir.
 * [#, acente, BİNA, KİRACI, TELEFON, SÜRE, GİRİŞ, ÇIKIŞ, ...aylar..., ..., NOT]
 */
function extractFixed(
  ws: XLSX.WorkSheet,
  rows: Row[],
  sheetName: string,
  year: number,
  out: ExtractedContract[]
): void {
  // Sadece "BİNA" 3. sütunda mülk adı, 4. sütunda kiracı olan düzeni destekle.
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const prop = String(row[2] ?? '').trim();
    const tenant = String(row[3] ?? '').trim();
    const phone = row[4];
    if (!prop || !tenant) continue;
    if (isBlank(phone) && isBlank(row[6])) continue; // ne telefon ne tarih → başlık/toplam
    out.push({
      source: { sheet: sheetName, row: r + 1 },
      propertyName: normProperty(prop),
      block: null,
      unit: null,
      tenantName: tenant,
      tenantPhone: parsePhone(phone),
      rentAmount: null,
      depositAmount: null,
      commissionAmount: null,
      startDate: parseDate(row[6]),
      endDate: parseDate(row[7]),
      paymentDay: null,
      notes: null,
      months: [],
      vacant: false,
    });
  }
}
