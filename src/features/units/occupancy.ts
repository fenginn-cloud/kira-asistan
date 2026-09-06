import { buildingName, foldSearch } from '@/lib/utils/property';
import type { Contract } from '@/types';
import type { Unit, UnitStatus } from '@/services/repositories/types';

/**
 * Envanterdeki bir dairenin sözleşmelerle birleştirilmiş HÂLİ.
 * effectiveStatus: aktif sözleşme varsa 'occupied', yoksa 'vacant'.
 */
export interface EffectiveUnit {
  id: string; // gerçek unit id ya da 'contract:<id>'
  building: string;
  block: string;
  unitLabel: string;
  effectiveStatus: UnitStatus;
  storedStatus: UnitStatus | null;
  vacantSince: string | null;
  note: string | null;
  hasContract: boolean;
  contractId: string | null;
  synthesized: boolean;
}

/**
 * Yazıma DUYARSIZ kimlik: boşluk/noktalama silinir, Türkçe + büyük/küçük
 * katlanır, sayılardaki baştaki sıfırlar atılır. Böylece "42 Evler 01",
 * "42EVLER 1", "42evler01" hepsi aynı kimliğe iner. Bloklar/daireler için de
 * aynı mantık ("DREAM REZİDANS D 18" == "DREAM REZİDANS D18").
 */
function normId(...parts: (string | null | undefined)[]): string {
  return foldSearch(parts.map((p) => p ?? '').join(' '))
    .replace(/daire|numara/g, '') // "DAİRE 11" == "11" (yazım gürültüsü)
    .replace(/[^a-z0-9]/g, '')
    .replace(/\d+/g, (m) => String(parseInt(m, 10)));
}

/** Bina adını yazıma duyarsız gruplama anahtarı. */
export function buildingKey(name: string): string {
  return foldSearch(name).replace(/[^a-z0-9]/g, '');
}

/** Sözleşmenin konum kimliği. Daire no ayrı alandaysa onu kullan; yoksa
 *  mülk adı zaten daireyi içeriyordur (ör. "42 Evler 01"). Çift saymayı önler. */
function contractId(c: Contract): string {
  const unit = (c.unit ?? '').trim();
  if (unit) return normId(buildingName(c.propertyName), c.block, unit);
  return normId(c.propertyName, c.block);
}

/** Sözleşmede daire no ayrı yoksa mülk adının sonundaki daire etiketini çıkar
 *  (yalnızca sentezlenen dairenin GÖSTERİMİ için; eşleşme normId ile yapılır). */
function unitLabelFromName(propertyName: string): string {
  const m = (propertyName ?? '').trim().match(/([A-Za-zÇĞİÖŞÜçğıöşü]?\d+)\s*$/);
  return m?.[1] ?? '';
}

/**
 * Envanter (units) + aktif sözleşmeleri birleştirir. Yazma yok; okuma-anında
 * türetme. Yeni sözleşme yapılınca daire otomatik "dolu" olur.
 */
export function mergeUnitsWithContracts(units: Unit[], contracts: Contract[]): EffectiveUnit[] {
  const contractByKey = new Map<string, Contract>();
  for (const c of contracts) {
    if (c.status !== 'active') continue;
    contractByKey.set(contractId(c), c);
  }

  const out: EffectiveUnit[] = [];
  const usedKeys = new Set<string>();

  // 1) Kayıtlı envanter daireleri — durum sözleşmeye göre.
  for (const un of units) {
    const k = normId(un.building, un.block, un.unitLabel);
    const c = contractByKey.get(k);
    if (c) usedKeys.add(k);
    out.push({
      id: un.id,
      building: un.building,
      block: un.block,
      unitLabel: un.unitLabel,
      effectiveStatus: c ? 'occupied' : 'vacant',
      storedStatus: un.status,
      vacantSince: un.vacantSince,
      note: un.note,
      hasContract: !!c,
      contractId: c?.id ?? null,
      synthesized: false,
    });
  }

  // 2) Envanterde eşleşmeyen aktif sözleşmeler → otomatik listelenir.
  for (const [k, c] of contractByKey) {
    if (usedKeys.has(k)) continue;
    const unit = (c.unit ?? '').trim() || unitLabelFromName(c.propertyName);
    out.push({
      id: `contract:${c.id}`,
      building: buildingName(c.propertyName),
      block: (c.block ?? '').trim(),
      unitLabel: unit,
      effectiveStatus: 'occupied',
      storedStatus: null,
      vacantSince: null,
      note: null,
      hasContract: true,
      contractId: c.id,
      synthesized: true,
    });
  }

  return out;
}
