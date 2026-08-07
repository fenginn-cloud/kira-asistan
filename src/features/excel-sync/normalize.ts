import { foldSearch } from '@/lib/utils/property';

/** Sözleşme alanı (kanonik). */
export type CanonField =
  | 'tenantName'
  | 'tenantPhone'
  | 'rentAmount'
  | 'depositAmount'
  | 'startDate'
  | 'endDate'
  | 'paymentDay'
  | 'block'
  | 'unit'
  | 'propertyName'
  | 'notes';

/** Başlık eş-anlamlıları (foldSearch ile karşılaştırılır: Türkçe/aksan/harf duyarsız). */
const SYNONYMS: Record<CanonField, string[]> = {
  tenantName: ['kiraci', 'kiraci adi', 'kiraci ad soyad', 'ad soyad', 'isim', 'adi soyadi'],
  tenantPhone: ['telefon', 'telefon no', 'cep telefonu', 'gsm', 'tel', 'cep'],
  rentAmount: ['kira', 'kirasi', 'kira bedeli', 'aylik kira', 'kira tutari', 'ucret'],
  depositAmount: ['depozito', 'depozit', 'teminat'],
  startDate: ['giris', 'giris tarihi', 'baslangic', 'baslangic tarihi', 'sozlesme baslangic'],
  endDate: ['cikis', 'cikis tarihi', 'bitis', 'bitis tarihi', 'sozlesme bitis'],
  paymentDay: ['odeme gunu', 'odeme vadesi', 'vade', 'odeme tarihi', 'gun'],
  block: ['blok', 'block'],
  unit: ['daire', 'daire no', 'no', 'bagimsiz bolum', 'kapi no'],
  propertyName: ['bina', 'mulk', 'gayrimenkul', 'bina adi', 'mulk adi', 'adres', 'site'],
  notes: ['not', 'notlar', 'aciklama', 'aciklamalar'],
};

const MONTHS_TR = [
  'ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran',
  'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik',
];

/** Başlığı kanonik alana eşle. Emin değilse null (rastgele eşleştirme yok). */
export function matchHeader(header: string): CanonField | null {
  const h = foldSearch(header).trim();
  if (!h) return null;
  // Tam eşleşme öncelikli
  for (const [field, syns] of Object.entries(SYNONYMS) as [CanonField, string[]][]) {
    if (syns.includes(h)) return field;
  }
  // İçerik eşleşmesi (ör. "kiraci ad soyad (tc)")
  for (const [field, syns] of Object.entries(SYNONYMS) as [CanonField, string[]][]) {
    if (syns.some((s) => h === s || h.startsWith(s + ' ') || h.includes(' ' + s))) return field;
  }
  return null;
}

/** Başlık bir ay sütunu mu? 0-11 (Ocak=0) döner, değilse null. */
export function matchMonth(header: string): number | null {
  const h = foldSearch(header).trim();
  const i = MONTHS_TR.indexOf(h);
  return i >= 0 ? i : null;
}

/** Ödendi/ödenmedi metin ipuçları (renk yoksa metinden). */
export function paidFromText(v: string): boolean | null {
  const t = foldSearch(v);
  if (!t) return null;
  if (t.includes('odendi') || t === 'ok' || t === 'var') return true;
  if (t.includes('alinmadi') || t.includes('odenmedi') || t === 'yok') return false;
  return null;
}

/** Excel hücre dolgu rengi → ödendi/ödenmedi/o-ay-yok. */
export function paidFromFill(rgbUpper: string | undefined, isTheme1: boolean, hasNumber: boolean): 'paid' | 'unpaid' | 'na' {
  const GRAYS = ['7F7F7F', 'D0CECE', 'A6A6A6', 'BFBFBF', '808080'];
  if (isTheme1 || (rgbUpper && GRAYS.includes(rgbUpper))) return 'na';
  if (!hasNumber) return 'na';
  const GREENS = ['92D050', 'E2F0D9', 'C6EFCE', '00B050'];
  if (rgbUpper && GREENS.includes(rgbUpper)) return 'paid';
  return 'unpaid';
}
