import { foldSearch } from '@/lib/utils/property';

/**
 * Her binadaki TOPLAM daire sayısı (mülk sahibinden). Boş daire = toplam − dolu
 * (aktif sözleşme). Bina adı `buildingName()` çıktısıyla eşleştirilir (Türkçe/
 * aksan duyarsız). Yeni bina eklenince buraya bir satır eklemek yeterli.
 */
export const BUILDING_UNITS: { name: string; total: number }[] = [
  { name: 'Dream Rezidans', total: 100 },
  { name: '42 Evler', total: 34 },
  { name: 'Yürüyüş Yolu', total: 8 },
  { name: 'ÖZ APT', total: 5 },
  { name: 'ELİZE APT', total: 6 },
  { name: 'SERDEN GEÇTİ', total: 2 },
];

const TOTALS = new Map(BUILDING_UNITS.map((b) => [foldSearch(b.name), b.total]));

/** Bina için tanımlı toplam daire sayısı; tanımsızsa null. */
export function buildingTotalUnits(building: string): number | null {
  return TOTALS.get(foldSearch(building)) ?? null;
}
