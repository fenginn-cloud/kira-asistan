import { foldSearch } from '@/lib/utils/property';
import type { Contract } from '@/types';

export interface ContractConflicts {
  /** Aynı mülk + blok + daire için AKTİF sözleşme(ler). */
  sameUnit: Contract[];
  /** Aynı kiracı adına sahip sözleşme(ler). */
  sameName: Contract[];
}

/** Mülk + blok + daire kimliği (Türkçe/boşluk duyarsız). */
export function unitKey(
  propertyName: string,
  block: string | null | undefined,
  unit: string | null | undefined
): string {
  return foldSearch([propertyName ?? '', block ?? '', unit ?? ''].join('|'));
}

/** Bir aday sözleşmenin mevcutlarla çakışmalarını bulur. */
export function findContractConflicts(
  existing: Contract[],
  candidate: {
    propertyName: string;
    block: string | null;
    unit: string | null;
    tenantName: string;
  },
  ignoreId?: string
): ContractConflicts {
  const key = unitKey(candidate.propertyName, candidate.block, candidate.unit);
  const name = foldSearch((candidate.tenantName ?? '').trim());
  const hasUnit = !!(candidate.unit && candidate.unit.trim());

  const sameUnit: Contract[] = [];
  const sameName: Contract[] = [];
  for (const c of existing) {
    if (ignoreId && c.id === ignoreId) continue;
    if (
      hasUnit &&
      c.status === 'active' &&
      unitKey(c.propertyName, c.block, c.unit) === key
    ) {
      sameUnit.push(c);
    }
    if (name && foldSearch((c.tenantName ?? '').trim()) === name) {
      sameName.push(c);
    }
  }
  return { sameUnit, sameName };
}

export function hasConflicts(c: ContractConflicts): boolean {
  return c.sameUnit.length > 0 || c.sameName.length > 0;
}

/** Kart etiketi için: "Dream Rezidans B 7 — Turan Paksoy" */
export function contractLabel(c: Contract): string {
  const place = [c.propertyName, c.block, c.unit].filter(Boolean).join(' ');
  return `${place} — ${c.tenantName}`;
}

/**
 * Tüm listede çakışan (aynı daire aktif ya da aynı isim) sözleşmelerin id'leri.
 * "Çakışanlar" filtresi için.
 */
export function conflictingContractIds(contracts: Contract[]): Set<string> {
  const byUnit = new Map<string, Contract[]>();
  const byName = new Map<string, Contract[]>();
  for (const c of contracts) {
    if (c.status === 'active' && c.unit && c.unit.trim()) {
      const k = unitKey(c.propertyName, c.block, c.unit);
      (byUnit.get(k) ?? byUnit.set(k, []).get(k)!).push(c);
    }
    const n = foldSearch((c.tenantName ?? '').trim());
    if (n) (byName.get(n) ?? byName.set(n, []).get(n)!).push(c);
  }
  const ids = new Set<string>();
  for (const group of byUnit.values()) if (group.length > 1) group.forEach((c) => ids.add(c.id));
  for (const group of byName.values()) if (group.length > 1) group.forEach((c) => ids.add(c.id));
  return ids;
}
