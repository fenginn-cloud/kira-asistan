import * as XLSX from 'xlsx';

/** Boş/anlamsız hücre mi. */
export function isBlank(v: unknown): boolean {
  return v == null || String(v).trim() === '';
}

/**
 * Telefonu +90 standart formatına getir: "+90 5XX XXX XX XX".
 * 5321234567 / 05321234567 / +905321234567 / "0 532 123 45 67" hepsi aynı olur.
 * Geçersiz/eksik → null (senkronda mevcut telefonu SİLMEZ).
 */
export function parsePhone(raw: unknown): string | null {
  if (isBlank(raw)) return null;
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('90')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  if (d.length !== 10 || d[0] !== '5') return null; // TR cep değil
  return `+90 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
}

/**
 * Para değerini sayıya çevir. TR ve EN formatlarını ayırır:
 * 25000 / "25.000" / "25.000,00" / "25,000.00" / "25.000 TL" / "₺18,000.00".
 * Belirsiz → null.
 */
export function parseMoney(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw) : null;
  if (isBlank(raw)) return null;
  let s = String(raw).replace(/[^\d.,-]/g, '').trim();
  if (!s || s === '-') return null;
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    // Son ayraç ondalıktır.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    if (/,\d{1,2}$/.test(s)) s = s.replace(',', '.'); // 25000,50 → ondalık
    else s = s.replace(/,/g, ''); // 25,000 → binlik
  } else if (hasDot) {
    if (/\.\d{3}(?:\.\d{3})*$/.test(s)) s = s.replace(/\./g, ''); // 25.000 / 1.234.567 → binlik
    // aksi halde .dd ondalık kabul (18000.00) — olduğu gibi bırak
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Tarihi ISO'ya (YYYY-MM-DD) çevir. Desteklenen:
 * - Excel serial (number) → XLSX.SSF
 * - 2026-08-01 (ISO)
 * - 01.08.2026 (TR gün.ay.yıl)  → nokta ayraç = gün.ay
 * - 8/1/26   (US ay/gün/yıl)     → slash ayraç = ay/gün
 * Geçersiz/aralık dışı → null.
 */
export function parseDate(raw: unknown): string | null {
  if (isBlank(raw)) return null;
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw);
    if (d && d.y) return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
    return null;
  }
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${pad(+iso[2]!)}-${pad(+iso[3]!)}`;
  const m = s.match(/^(\d{1,2})([.\/])(\d{1,2})\2(\d{2,4})$/);
  if (m) {
    const a = +m[1]!;
    const sep = m[2]!;
    const b = +m[3]!;
    let y = m[4]!;
    if (y.length === 2) y = '20' + y;
    let day: number;
    let mon: number;
    if (sep === '.') { day = a; mon = b; } // TR gün.ay
    else if (a > 12) { day = a; mon = b; } // 15/7 gibi → gün/ay
    else { mon = a; day = b; } // US ay/gün
    if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
    return `${y}-${pad(mon)}-${pad(day)}`;
  }
  return null;
}

/** "HER AY 20" / "HER AY 15 / 20" / "Ayın 10'u" → gün (1-31). İlk sayı. Yoksa null. */
export function parsePaymentDay(raw: unknown): number | null {
  if (isBlank(raw)) return null;
  const m = String(raw).match(/(\d{1,2})/);
  if (!m) return null;
  const d = parseInt(m[1]!, 10);
  return d >= 1 && d <= 31 ? d : null;
}
