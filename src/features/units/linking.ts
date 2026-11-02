/**
 * Sözleşme ↔ daire envanteri bağlantısı (kalıcı `unitId`).
 *
 * Kural:
 *   - Sözleşmede daire kimliği yoksa (daire no / ad sonunda etiket) → bağlama yok.
 *   - Envanterde TEK aday → o daireye bağla.
 *   - Aday yok → daireyi envantere ekle (dolu) ve bağla (aynı daire iki kez
 *     oluşturulmaz; upsert bina+blok+etiket çakışmasında mevcut kaydı döndürür).
 *   - Birden fazla aday → otomatik seçim YOK; kullanıcıya seçtirilir.
 */
import { buildingName } from '@/lib/utils/property';
import type { Contract } from '@/types';
import type { Unit, UnitUpsertInput } from '@/services/repositories/types';
import { hasUnitIdentity, locationId, unitKey, unitLabelFromName } from './occupancy';

export type UnitLinkDecision =
  | { kind: 'linked'; unitId: string } // zaten bağlı
  | { kind: 'link'; unitId: string }
  | { kind: 'create'; input: UnitUpsertInput }
  | { kind: 'ambiguous'; candidates: Unit[] }
  | { kind: 'none' };

type Loc = Pick<Contract, 'propertyName' | 'block' | 'unit'> & { unitId?: string | null };

export function unitCandidates(units: Unit[], c: Loc): Unit[] {
  const key = locationId(c.propertyName, c.block, c.unit);
  return units.filter((u) => unitKey(u) === key);
}

export function decideUnitLink(units: Unit[], c: Loc): UnitLinkDecision {
  if (c.unitId && units.some((u) => u.id === c.unitId)) {
    return { kind: 'linked', unitId: c.unitId };
  }
  if (!hasUnitIdentity(c.propertyName, c.unit)) return { kind: 'none' };
  const candidates = unitCandidates(units, c);
  const only = candidates.length === 1 ? candidates[0] : undefined;
  if (only) return { kind: 'link', unitId: only.id };
  if (candidates.length > 1) return { kind: 'ambiguous', candidates };
  const unit = (c.unit ?? '').trim();
  return {
    kind: 'create',
    input: {
      building: buildingName(c.propertyName),
      block: (c.block ?? '').trim(),
      unitLabel: unit || unitLabelFromName(c.propertyName),
      status: 'occupied',
      vacantSince: null,
    },
  };
}
