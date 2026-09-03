import type { Contract } from '@/types';
import { foldSearch } from '@/lib/utils/property';
import { parsePhone } from './parse';
import type {
  DiffRow,
  ExtractedContract,
  FieldChange,
  ImportPlan,
} from './types';

const unitKey = (propertyName: string | null, block: string | null, unit: string | null) =>
  `${foldSearch(propertyName ?? '')}|${foldSearch(block ?? '')}|${foldSearch(unit ?? '')}`;

/** Güncellenebilir alanlar + Türkçe etiket + karşılaştırma. */
const FIELDS: {
  key: keyof ExtractedContract;
  label: string;
  norm?: (v: unknown) => unknown;
}[] = [
  { key: 'tenantName', label: 'Kiracı' },
  { key: 'tenantPhone', label: 'Telefon', norm: (v) => parsePhone(v) },
  { key: 'rentAmount', label: 'Kira Bedeli' },
  { key: 'depositAmount', label: 'Depozito' },
  { key: 'commissionAmount', label: 'Komisyon' },
  { key: 'startDate', label: 'Başlangıç Tarihi' },
  { key: 'endDate', label: 'Bitiş Tarihi' },
  { key: 'paymentDay', label: 'Ödeme Günü' },
  { key: 'notes', label: 'Not' },
];

function diffFields(ex: ExtractedContract, cur: Contract): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const f of FIELDS) {
    const raw = ex[f.key] as unknown;
    if (raw == null || raw === '') continue; // boş hücre mevcut veriyi silmez
    const nv = f.norm ? f.norm(raw) : raw;
    if (nv == null) continue;
    const curRaw = (cur as unknown as Record<string, unknown>)[f.key];
    const cv = f.norm ? f.norm(curRaw) : curRaw;
    if (String(cv ?? '') !== String(nv ?? '')) {
      changes.push({ field: f.key, label: f.label, from: cv ?? null, to: nv });
    }
  }
  return changes;
}

/**
 * Excel'den çıkarılan sözleşmeleri mevcut sistemle eşleştir ve fark planı üret.
 * Eşleştirme önceliği: (1) mülk+blok+daire, (2) telefon, (3) kiracı+mülk.
 * Hiçbir kayıt SİLİNMEZ; Excel'de olmayanlar sadece raporlanır.
 */
export function buildPlan(extracted: ExtractedContract[], existing: Contract[]): ImportPlan {
  const byUnit = new Map<string, Contract[]>();
  const byPhone = new Map<string, Contract[]>();
  const byTenantProp = new Map<string, Contract[]>();
  const push = (m: Map<string, Contract[]>, k: string, c: Contract) => {
    const a = m.get(k); if (a) a.push(c); else m.set(k, [c]);
  };
  for (const c of existing) {
    push(byUnit, unitKey(c.propertyName, c.block, c.unit), c);
    const ph = parsePhone(c.tenantPhone);
    if (ph) push(byPhone, ph, c);
    push(byTenantProp, `${foldSearch(c.tenantName)}|${foldSearch(c.propertyName)}`, c);
  }

  const matchedIds = new Set<string>();
  const rows: DiffRow[] = [];

  for (const ex of extracted) {
    if (ex.vacant || !ex.tenantName) {
      // Kiracısız/boş daire — senkrona dahil değil (rapor amaçlı review değil, atla).
      continue;
    }
    let candidates: Contract[] | undefined;
    let reason: DiffRow['matchReason'];

    const uk = unitKey(ex.propertyName, ex.block, ex.unit);
    if (ex.propertyName && (byUnit.get(uk)?.length)) { candidates = byUnit.get(uk); reason = 'unit'; }
    else {
      const ph = parsePhone(ex.tenantPhone);
      if (ph && byPhone.get(ph)?.length) { candidates = byPhone.get(ph); reason = 'phone'; }
      else {
        const tk = `${foldSearch(ex.tenantName)}|${foldSearch(ex.propertyName ?? '')}`;
        if (ex.propertyName && byTenantProp.get(tk)?.length) { candidates = byTenantProp.get(tk); reason = 'tenant+property'; }
      }
    }

    if (candidates && candidates.length > 1) {
      rows.push({ kind: 'review', extracted: ex, reviewReasons: ['ambiguous-match'],
        reviewDetail: `Aynı ölçütle ${candidates.length} sözleşme eşleşti — elle kontrol gerekir.` });
      continue;
    }

    if (candidates && candidates.length === 1) {
      const cur = candidates[0]!;
      matchedIds.add(cur.id);
      const changes = diffFields(ex, cur);
      rows.push(changes.length
        ? { kind: 'update', extracted: ex, matchedId: cur.id, matchReason: reason, changes }
        : { kind: 'unchanged', extracted: ex, matchedId: cur.id, matchReason: reason });
      continue;
    }

    // Eşleşme yok → yeni sözleşme. Zorunlu alanlar var mı?
    const missing: string[] = [];
    if (!ex.propertyName) missing.push('mülk');
    if (!ex.tenantName) missing.push('kiracı');
    if (ex.rentAmount == null) missing.push('kira');
    if (missing.length) {
      rows.push({ kind: 'review', extracted: ex, reviewReasons: ['missing-required'],
        reviewDetail: `Yeni sözleşme için eksik: ${missing.join(', ')}.` });
    } else {
      rows.push({ kind: 'new', extracted: ex });
    }
  }

  const notInExcel = existing
    .filter((c) => !matchedIds.has(c.id))
    .map((c) => ({ id: c.id, label: [c.propertyName, c.block, c.unit].filter(Boolean).join(' ') + ` — ${c.tenantName}` }));

  const summary = {
    total: rows.length,
    new: rows.filter((r) => r.kind === 'new').length,
    update: rows.filter((r) => r.kind === 'update').length,
    unchanged: rows.filter((r) => r.kind === 'unchanged').length,
    review: rows.filter((r) => r.kind === 'review').length,
  };
  return { rows, summary, notInExcel };
}
