import { repositories } from '@/services';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Contract } from '@/types';
import type { DiffRow, ImportPlan } from './types';

export interface ApplyContext {
  companyId: string;
  assignedUserId: string | null;
  ownerName: string;
  ownerPhone: string;
  uploadedBy: string | null;
  fileName: string;
}

export interface ApplyResult {
  updated: number;
  created: number;
  monthsSettled: number;
  errors: { label: string; error: string }[];
}

function rowLabel(row: DiffRow): string {
  const e = row.extracted;
  return `${[e.propertyName, e.block, e.unit].filter(Boolean).join(' ')} — ${e.tenantName ?? ''}`.trim();
}

async function settleMonths(contractId: string, row: DiffRow, res: ApplyResult): Promise<void> {
  for (const m of row.extracted.months) {
    if (!m.paid) continue; // güvenlik: yalnızca "ödendi" işlenir, asla geri alınmaz
    try {
      await repositories.payments.syncPaidMonth({
        contractId,
        periodMonth: m.periodMonth,
        amountDue: m.amountDue,
        paymentDay: row.extracted.paymentDay ?? 1,
      });
      res.monthsSettled++;
    } catch {
      /* tek ay hatası tüm aktarımı bozmasın */
    }
  }
}

/**
 * Senkron planını uygular. Sözleşme ID'si korunarak UPDATE / yeni INSERT yapılır;
 * ödeme geçmişi bozulmaz; hatalı bir satır diğerlerini engellemez. İdempotenttir
 * (mülk+blok+daire ile eşleştiğinden aynı dosya tekrar yüklense değişiklik üretmez).
 */
export async function applyPlan(plan: ImportPlan, ctx: ApplyContext): Promise<ApplyResult> {
  const res: ApplyResult = { updated: 0, created: 0, monthsSettled: 0, errors: [] };
  const changeLog: { label: string; changes: DiffRow['changes'] }[] = [];

  for (const row of plan.rows) {
    try {
      if (row.kind === 'update' && row.matchedId) {
        const patch: Partial<Contract> = {};
        for (const c of row.changes ?? []) {
          (patch as Record<string, unknown>)[c.field] = c.to;
        }
        if (Object.keys(patch).length) {
          await repositories.contracts.update(row.matchedId, patch);
          res.updated++;
          changeLog.push({ label: rowLabel(row), changes: row.changes });
        }
        await settleMonths(row.matchedId, row, res);
      } else if (row.kind === 'new') {
        const e = row.extracted;
        const created = await repositories.contracts.create({
          companyId: ctx.companyId,
          assignedUserId: ctx.assignedUserId,
          propertyName: e.propertyName!,
          block: e.block,
          unit: e.unit,
          tenantName: e.tenantName!,
          tenantPhone: e.tenantPhone ?? '00000',
          tenantNationalId: null,
          ownerName: ctx.ownerName,
          ownerPhone: ctx.ownerPhone,
          rentAmount: e.rentAmount ?? 0,
          duesAmount: 0,
          depositAmount: e.depositAmount ?? 0,
          commissionAmount: e.commissionAmount ?? 0,
          startDate: e.startDate ?? new Date().toISOString().slice(0, 10),
          endDate: e.endDate,
          paymentDay: e.paymentDay ?? 1,
          notes: e.notes,
          status: 'active',
          documentUrl: null,
          notifyOwner: true,
          notifyTenant: false,
          notifyStaff: true,
        });
        res.created++;
        await settleMonths(created.id, row, res);
      }
    } catch (err) {
      res.errors.push({ label: rowLabel(row), error: err instanceof Error ? err.message : String(err) });
    }
  }

  // İşlem geçmişi (yalnızca Supabase modunda; hatası aktarımı bozmaz).
  try {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('excel_import_logs').insert({
        company_id: ctx.companyId,
        uploaded_by: ctx.uploadedBy,
        file_name: ctx.fileName,
        summary: plan.summary,
        changes: changeLog.slice(0, 500),
      });
    }
  } catch {
    /* log opsiyonel */
  }

  return res;
}
