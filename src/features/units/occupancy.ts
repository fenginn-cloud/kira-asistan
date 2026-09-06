import { buildingName, foldSearch } from '@/lib/utils/property';
import type { Contract } from '@/types';
import type { Unit, UnitStatus } from '@/services/repositories/types';

/**
 * Envanterdeki bir dairenin sözleşmelerle birleştirilmiş HÂLİ.
 * effectiveStatus: aktif sözleşme varsa 'occupied' (kaynak: contract),
 * yoksa envanterde elle işaretlenen durum (storedStatus).
 */
export interface EffectiveUnit {
  id: string; // gerçek unit id ya da sözleşmeden türetilmiş 'contract:<id>'
  building: string;
  block: string;
  unitLabel: string;
  effectiveStatus: UnitStatus;
  storedStatus: UnitStatus | null; // envanterde kayıt yoksa null (yalnız sözleşmeden)
  vacantSince: string | null;
  note: string | null;
  hasContract: boolean; // aktif sözleşme bu daireyi dolduruyor mu
  contractId: string | null;
  synthesized: boolean; // envanterde yok, yalnız sözleşmeden türedi
}

const key = (building: string, block: string | null, unit: string | null) =>
  `${foldSearch(building)}|${foldSearch((block ?? '').trim())}|${foldSearch((unit ?? '').trim())}`;

/**
 * Envanter (units) + aktif sözleşmeleri birleştirir. Yazma yok; tamamen
 * okuma-anında türetme. Böylece yeni bir sözleşme (ör. D blok 18) yapılınca
 * envanter otomatik "dolu" gösterir; sözleşme yoksa elle işaret geçerli olur.
 */
export function mergeUnitsWithContracts(
  units: Unit[],
  contracts: Contract[]
): EffectiveUnit[] {
  // Aktif sözleşmeleri daire anahtarına göre indeksle (yalnız unit'i olanlar).
  const contractByKey = new Map<string, Contract>();
  for (const c of contracts) {
    if (c.status !== 'active') continue;
    const u = (c.unit ?? '').trim();
    if (!u) continue; // daire no yoksa envantere yerleştirilemez
    contractByKey.set(key(buildingName(c.propertyName), c.block, u), c);
  }

  const out: EffectiveUnit[] = [];
  const seen = new Set<string>();

  // 1) Kayıtlı envanter daireleri (durum sözleşmeyle ezilir).
  for (const un of units) {
    const k = key(un.building, un.block, un.unitLabel);
    seen.add(k);
    const c = contractByKey.get(k);
    out.push({
      id: un.id,
      building: un.building,
      block: un.block,
      unitLabel: un.unitLabel,
      // Durum TAMAMEN sözleşmeye göre: aktif sözleşme varsa dolu, yoksa boş.
      effectiveStatus: c ? 'occupied' : 'vacant',
      storedStatus: un.status,
      vacantSince: un.vacantSince,
      note: un.note,
      hasContract: !!c,
      contractId: c?.id ?? null,
      synthesized: false,
    });
  }

  // 2) Envanterde olmayan ama aktif sözleşmesi olan daireler → otomatik ekle.
  for (const [k, c] of contractByKey) {
    if (seen.has(k)) continue;
    out.push({
      id: `contract:${c.id}`,
      building: buildingName(c.propertyName),
      block: (c.block ?? '').trim(),
      unitLabel: (c.unit ?? '').trim(),
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
