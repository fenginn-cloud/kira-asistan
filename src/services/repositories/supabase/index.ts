import { supabase } from '@/lib/supabase/client';
import type { Repositories } from '../types';
import type { Contract, Payment } from '@/types';
import { addMonths, format, parseISO } from 'date-fns';
import { derivePaymentStatus } from '@/lib/utils/payments';
import {
  amountForMonth,
  dueDateFor,
  isVirtualPaymentId,
  parseVirtualPaymentId,
  trackingStartMonth,
  withExpectedPayments,
  withExpectedPaymentsAll,
} from '@/lib/ledger/accrual';
import { normalizeBlock } from '@/lib/utils/block';
import {
  contractColumns,
  contractLifecycleColumns,
  fromCompany,
  fromContract,
  fromUser,
  toClaim,
  toCompany,
  toContract,
  toPayment,
  toTransaction,
  toUser,
} from './mappers';

/** Asserts the client exists (this impl is only used when configured). */
function db() {
  if (!supabase) throw new Error('Supabase yapılandırılmamış');
  return supabase;
}

/** Stored status can lag; recompute it live from amounts + due date. */
function normalizeStatus(p: Payment): Payment {
  return { ...p, status: derivePaymentStatus(p) };
}

async function currentCompanyId(): Promise<string> {
  const { data: auth } = await db().auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error('Oturum bulunamadı');
  const { data, error } = await db()
    .from('profiles')
    .select('company_id')
    .eq('id', uid)
    .single();
  if (error) throw error;
  return data.company_id as string;
}

/**
 * Sanal (henüz kaydı olmayan) ay için satırı oluşturur ve gerçek id döner.
 * Gerçek id verilirse olduğu gibi döner.
 */
async function materializePayment(paymentId: string): Promise<string> {
  const v = parseVirtualPaymentId(paymentId);
  if (!v) return paymentId;
  const contract = await supabaseRepositories.contracts.getById(v.contractId);
  if (!contract) throw new Error('Sözleşme bulunamadı');
  const { error: upErr } = await db()
    .from('payments')
    .upsert(
      {
        contract_id: contract.id,
        period_month: v.periodMonth,
        due_date: dueDateFor(v.periodMonth, contract.paymentDay),
        amount_due: amountForMonth(contract, v.periodMonth),
        amount_paid: 0,
        status: 'pending',
      },
      { onConflict: 'contract_id,period_month', ignoreDuplicates: true }
    );
  if (upErr) throw upErr;
  const { data, error } = await db()
    .from('payments')
    .select('id')
    .eq('contract_id', contract.id)
    .eq('period_month', v.periodMonth)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Bu ay için tahakkuk oluşturulamadı (sözleşme aralığı dışında)');
  return data.id as string;
}

/**
 * Migration 0023 uygulanmadan önce de okuma çalışsın: yeni kolonlar yoksa
 * (42703) eski kolon listesiyle tekrar dener.
 */
let lifecycleColumns: boolean | null = null;
async function withContractColumns<T>(
  run: (cols: string) => PromiseLike<{ data: T; error: any }>
): Promise<T> {
  if (lifecycleColumns !== false) {
    const res = await run(`${contractColumns}, ${contractLifecycleColumns}`);
    if (!res.error) {
      lifecycleColumns = true;
      return res.data;
    }
    if (res.error?.code !== '42703') throw res.error;
    lifecycleColumns = false;
  }
  const res = await run(contractColumns);
  if (res.error) throw res.error;
  return res.data;
}

export const supabaseRepositories: Repositories = {
  contracts: {
    async list() {
      const data = await withContractColumns((cols) =>
        db().from('contracts').select(cols).order('created_at', { ascending: false })
      );
      return ((data as any[]) ?? []).map(toContract);
    },
    async getById(id) {
      const data = await withContractColumns((cols) =>
        db().from('contracts').select(cols).eq('id', id).maybeSingle()
      );
      return data ? toContract(data) : null;
    },
    async create(input) {
      const { data, error } = await db()
        .from('contracts')
        .insert(fromContract(input as Partial<Contract>))
        .select(lifecycleColumns === false ? contractColumns : `${contractColumns}, ${contractLifecycleColumns}`)
        .single();
      if (error) {
        // Server-side plan limit (migration 0012). Surface a typed, friendly
        // error the UI can catch to route to the paywall.
        if (
          error.message?.includes('contract_limit_reached') ||
          (error as { hint?: string }).hint?.includes('3 sözleşme')
        ) {
          throw new Error('CONTRACT_LIMIT_REACHED');
        }
        throw error;
      }
      return toContract(data);
    },
    async update(id, patch) {
      const { data, error } = await db()
        .from('contracts')
        .update(fromContract(patch))
        .eq('id', id)
        .select(lifecycleColumns === false ? contractColumns : `${contractColumns}, ${contractLifecycleColumns}`)
        .single();
      if (error) throw error;
      return toContract(data);
    },
    async remove(id) {
      const { error } = await db().from('contracts').delete().eq('id', id);
      if (error) throw error;
    },
    async getPublicToken(id) {
      // Defensive: the column may not exist until migration 0007 is applied.
      try {
        const { data, error } = await db()
          .from('contracts')
          .select('public_token')
          .eq('id', id)
          .maybeSingle();
        if (error) return null;
        return (data as { public_token?: string } | null)?.public_token ?? null;
      } catch {
        return null;
      }
    },
    async applyRentChange(id, input) {
      const { error } = await db().rpc('apply_rent_change', {
        p_contract: id,
        p_effective: input.effectiveMonth,
        p_rent: input.rentAmount,
        p_dues: input.duesAmount,
      });
      if (error) throw error;
    },
    async terminate(id, input) {
      const { error } = await db().rpc('terminate_contract', {
        p_contract: id,
        p_exit: input.exitDate,
        p_deposit_returned: input.depositReturned,
        p_deposit_deduction: input.depositDeduction,
        p_note: input.depositNote,
      });
      if (error) throw error;
    },
  },

  payments: {
    async listByContract(contractId) {
      const [{ data, error }, contract] = await Promise.all([
        db()
          .from('payments')
          .select('*')
          .eq('contract_id', contractId)
          .order('period_month', { ascending: false }),
        supabaseRepositories.contracts.getById(contractId),
      ]);
      if (error) throw error;
      const stored = (data ?? []).map(toPayment).map(normalizeStatus);
      // Görüntüleme veritabanına YAZMAZ: eksik beklenen aylar sanal döner.
      const all = contract ? withExpectedPayments(contract, stored) : stored;
      return all.sort((a, b) => b.periodMonth.localeCompare(a.periodMonth));
    },
    async listAll() {
      const [{ data, error }, contracts] = await Promise.all([
        db().from('payments').select('*'),
        supabaseRepositories.contracts.list(),
      ]);
      if (error) throw error;
      const stored = (data ?? []).map(toPayment).map(normalizeStatus);
      return withExpectedPaymentsAll(contracts, stored);
    },
    async collect(input) {
      if (!(input.amount > 0)) throw new Error('Tutar sıfırdan büyük olmalı');
      const paymentId = await materializePayment(input.paymentId);
      const { data, error } = await db()
        .from('payment_transactions')
        .insert({
          payment_id: paymentId,
          amount: input.amount,
          paid_at: input.paidAt,
          method: input.method,
          description: input.description,
          receipt_url: input.receiptUrl,
          client_ref: input.clientRef,
        })
        .select('id')
        .single();
      if (error) {
        // Aynı işlem ikinci kez geldi (çift tıklama / ağ tekrarı) → mevcut kayıt.
        if ((error as { code?: string }).code === '23505') {
          const { data: existing, error: e2 } = await db()
            .from('payment_transactions')
            .select('id')
            .eq('client_ref', input.clientRef)
            .single();
          if (e2) throw e2;
          return { transactionId: existing.id as string };
        }
        throw error;
      }
      return { transactionId: data.id as string };
    },
    async listTransactions(paymentId) {
      if (isVirtualPaymentId(paymentId)) return [];
      const { data, error } = await db()
        .from('payment_transactions')
        .select('*')
        .eq('payment_id', paymentId)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toTransaction);
    },
    async listTransactionsByContract(contractId) {
      const { data, error } = await db()
        .from('payment_transactions')
        .select('*, payments!inner(contract_id)')
        .eq('payments.contract_id', contractId)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toTransaction);
    },
    async deleteTransaction(id) {
      // The recalc_payment trigger updates the affected payment after delete.
      const { error } = await db()
        .from('payment_transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    async syncPaidMonth({ contractId, periodMonth, amountDue, paymentDay }) {
      const y = Number(periodMonth.slice(0, 4));
      const mo = Number(periodMonth.slice(5, 7)); // 1-based
      const dim = new Date(y, mo, 0).getDate();
      const day = Math.min(Math.max(paymentDay || 1, 1), dim);
      const dueDate = `${periodMonth.slice(0, 7)}-${String(day).padStart(2, '0')}`;

      // Ay satırını oluştur (varsa dokunma — geçmiş korunur).
      await db()
        .from('payments')
        .upsert(
          {
            contract_id: contractId,
            period_month: periodMonth,
            due_date: dueDate,
            amount_due: amountDue,
            amount_paid: 0,
            status: 'pending',
          },
          { onConflict: 'contract_id,period_month', ignoreDuplicates: true }
        );

      const { data: pay, error: getErr } = await db()
        .from('payments')
        .select('id, amount_due, amount_paid')
        .eq('contract_id', contractId)
        .eq('period_month', periodMonth)
        .single();
      if (getErr) throw getErr;

      const remaining = Number(pay.amount_due) - Number(pay.amount_paid);
      if (remaining <= 0) return; // zaten ödenmiş — dokunma

      const { error: txErr } = await db().from('payment_transactions').insert({
        payment_id: pay.id,
        amount: remaining,
        paid_at: new Date().toISOString().slice(0, 10),
        method: null,
        description: 'Excel senkron: ödendi',
        receipt_url: null,
      });
      if (txErr) throw txErr;
    },
    async resetMonth(paymentId) {
      if (isVirtualPaymentId(paymentId)) return; // zaten tahsilatsız
      // Tahsilatlar silinir; recalc_payment tetikleyicisi amount_paid/status'u
      // kendisi sıfırlar (elle amount_paid yazılmaz → tetikleyiciyle çelişmez).
      const { error } = await db()
        .from('payment_transactions')
        .delete()
        .eq('payment_id', paymentId);
      if (error) throw error;
      const { error: updErr } = await db()
        .from('payments')
        .update({ amount_paid: 0, paid_at: null })
        .eq('id', paymentId);
      if (updErr) throw updErr;
    },
    async addOpeningBalance(contract, amount) {
      if (!(amount > 0)) return;
      const period = format(
        addMonths(parseISO(trackingStartMonth(contract)), -1),
        'yyyy-MM-dd'
      );
      const { error } = await db().from('payments').upsert(
        {
          contract_id: contract.id,
          period_month: period,
          due_date: period,
          amount_due: amount,
          amount_paid: 0,
          status: 'overdue',
          kind: 'opening',
          note: 'Başlangıç bakiyesi (takip öncesinden devreden)',
        },
        { onConflict: 'contract_id,period_month', ignoreDuplicates: true }
      );
      if (error) throw error;
    },
  },

  claims: {
    async listPending() {
      const { data, error } = await db()
        .from('tenant_payment_claims')
        .select('*, contracts!inner(tenant_name, property_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toClaim);
    },
    async approve(claim, contract) {
      const period = claim.periodMonth.slice(0, 10);
      const monthKey = period.slice(0, 7);
      // Ensure the charge row for that month exists.
      const d = new Date(period);
      const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const day = Math.min(contract.paymentDay, dim);
      const dueDate = `${monthKey}-${String(day).padStart(2, '0')}`;
      await db()
        .from('payments')
        .upsert(
          {
            contract_id: contract.id,
            period_month: period,
            due_date: dueDate,
            amount_due: contract.rentAmount + contract.duesAmount,
            amount_paid: 0,
            status: 'pending',
          },
          { onConflict: 'contract_id,period_month', ignoreDuplicates: true }
        );
      const { data: pay, error: payErr } = await db()
        .from('payments')
        .select('id')
        .eq('contract_id', contract.id)
        .eq('period_month', period)
        .single();
      if (payErr) throw payErr;

      const { error: txErr } = await db().from('payment_transactions').insert({
        payment_id: pay.id,
        amount: claim.amount,
        paid_at: new Date().toISOString().slice(0, 10),
        method: 'transfer',
        description: 'Kiracı bildirimi (onaylandı)',
        receipt_url: claim.receiptUrl,
      });
      if (txErr) throw txErr;

      const { error: updErr } = await db()
        .from('tenant_payment_claims')
        .update({ status: 'approved', resolved_at: new Date().toISOString() })
        .eq('id', claim.id);
      if (updErr) throw updErr;
    },
    async reject(id) {
      const { error } = await db()
        .from('tenant_payment_claims')
        .update({ status: 'rejected', resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
  },

  users: {
    async list() {
      const { data, error } = await db()
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(toUser);
    },
    async create(input) {
      // The access token expires (~1h); a stale one makes the Edge Function
      // reply "Oturum geçersiz". Refresh before calling so this doesn't happen.
      let { data: sess } = await db().auth.getSession();
      if (!sess.session) {
        const refreshed = await db().auth.refreshSession();
        sess = refreshed.data;
      }
      if (!sess.session) {
        throw new Error('Oturumunuz sona ermiş. Çıkış yapıp tekrar giriş yapın.');
      }

      // Creating an auth user needs the service role, so this goes through the
      // `create-user` Edge Function (which verifies the caller is admin).
      const { data, error } = await db().functions.invoke('create-user', {
        body: {
          email: input.email,
          password: input.password,
          fullName: input.fullName,
          role: input.role,
        },
      });
      if (error) {
        // Edge Functions return error details in the response body.
        let message = error.message;
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.json === 'function') {
            const parsed = await ctx.json();
            if (parsed?.error) message = parsed.error;
          }
        } catch {
          // keep the original message
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      return toUser({
        id: data.id,
        company_id: data.companyId,
        email: data.email,
        full_name: data.fullName,
        role: data.role,
        is_active: true,
        phone: null,
        avatar_url: null,
        last_login_at: null,
        created_at: new Date().toISOString(),
      });
    },
    async update(id, patch) {
      const { data, error } = await db()
        .from('profiles')
        .update(fromUser(patch))
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return toUser(data);
    },
  },

  company: {
    async getCurrent() {
      const companyId = await currentCompanyId();
      const { data, error } = await db()
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      if (error) throw error;
      return toCompany(data);
    },
    async update(patch) {
      const companyId = await currentCompanyId();
      const { data, error } = await db()
        .from('companies')
        .update(fromCompany(patch))
        .eq('id', companyId)
        .select('*')
        .single();
      if (error) throw error;
      return toCompany(data);
    },
  },

  buildingUnits: {
    async list() {
      const { data, error } = await db()
        .from('building_units')
        .select('building, total_units');
      if (error) {
        // Tablo henüz yoksa (migration 0011 uygulanmadıysa) sessizce boş dön.
        if ((error as { code?: string }).code === '42P01') return [];
        throw error;
      }
      return (data ?? []).map((r) => ({ building: r.building as string, total: Number(r.total_units) }));
    },
    async set(building, total) {
      const company_id = await currentCompanyId();
      const { error } = await db()
        .from('building_units')
        .upsert(
          { company_id, building, total_units: total, updated_at: new Date().toISOString() },
          { onConflict: 'company_id,building' }
        );
      if (error) throw error;
    },
  },

  units: {
    async list() {
      const { data, error } = await db()
        .from('units')
        .select(
          'id, building, block, unit_label, status, vacant_since, note, area_m2, layout, balcony, terrace, fixtures'
        )
        .order('building', { ascending: true })
        .order('block', { ascending: true })
        .order('unit_label', { ascending: true });
      if (error) {
        // Tablo henüz yoksa (migration 0019 uygulanmadıysa) sessizce boş dön.
        if ((error as { code?: string }).code === '42P01') return [];
        throw error;
      }
      return (data ?? []).map((r) => ({
        id: r.id as string,
        building: r.building as string,
        block: (r.block as string) ?? '',
        unitLabel: r.unit_label as string,
        status: (r.status as 'occupied' | 'vacant') ?? 'vacant',
        vacantSince: (r.vacant_since as string | null) ?? null,
        note: (r.note as string | null) ?? null,
        areaM2: (r.area_m2 as number | null) ?? null,
        layout: (r.layout as string | null) ?? null,
        balcony: (r.balcony as boolean | null) ?? false,
        terrace: (r.terrace as boolean | null) ?? false,
        fixtures: (r.fixtures as string[] | null) ?? [],
      }));
    },
    async upsert(input) {
      const company_id = await currentCompanyId();
      const row = {
        company_id,
        building: input.building,
        block: normalizeBlock(input.block),
        unit_label: input.unitLabel,
        status: input.status ?? 'vacant',
        vacant_since: input.vacantSince ?? null,
        note: input.note ?? null,
        updated_at: new Date().toISOString(),
      };
      // Çakışma olursa mevcut kayıt korunur (ignoreDuplicates) — "isimler
      // çakışıyorsa kalsın". Ardından güncel satırı çekip döneriz.
      const { error } = await db()
        .from('units')
        .upsert(row, { onConflict: 'company_id,building,block,unit_label', ignoreDuplicates: true });
      if (error) throw error;
      const { data, error: selErr } = await db()
        .from('units')
        .select(
          'id, building, block, unit_label, status, vacant_since, note, area_m2, layout, balcony, terrace, fixtures'
        )
        .eq('company_id', company_id)
        .eq('building', row.building)
        .eq('block', row.block)
        .eq('unit_label', row.unit_label)
        .single();
      if (selErr) throw selErr;
      return {
        id: data.id as string,
        building: data.building as string,
        block: (data.block as string) ?? '',
        unitLabel: data.unit_label as string,
        status: (data.status as 'occupied' | 'vacant') ?? 'vacant',
        vacantSince: (data.vacant_since as string | null) ?? null,
        note: (data.note as string | null) ?? null,
        areaM2: (data.area_m2 as number | null) ?? null,
        layout: (data.layout as string | null) ?? null,
        balcony: (data.balcony as boolean | null) ?? false,
        terrace: (data.terrace as boolean | null) ?? false,
        fixtures: (data.fixtures as string[] | null) ?? [],
      };
    },
    async updateDetails(id, details) {
      const { error } = await db()
        .from('units')
        .update({
          area_m2: details.areaM2,
          layout: details.layout,
          balcony: details.balcony,
          terrace: details.terrace,
          fixtures: details.fixtures,
          note: details.note,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    async setStatus(id, status, vacantSince) {
      const { error } = await db()
        .from('units')
        .update({
          status,
          vacant_since: status === 'vacant' ? vacantSince ?? new Date().toISOString().slice(0, 10) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await db().from('units').delete().eq('id', id);
      if (error) throw error;
    },
  },

  deviceSessions: {
    async list() {
      const { data: auth } = await db().auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return [];
      const { data, error } = await db()
        .from('device_sessions')
        .select('id, device_token, label, platform, last_active, revoked')
        .eq('user_id', uid)
        .order('last_active', { ascending: false });
      if (error) {
        if ((error as { code?: string }).code === '42P01') return []; // tablo yoksa
        throw error;
      }
      return (data ?? []).map((r) => ({
        id: r.id as string,
        deviceToken: r.device_token as string,
        label: r.label as string,
        platform: (r.platform as string | null) ?? null,
        lastActive: r.last_active as string,
        revoked: !!r.revoked,
      }));
    },
    async register(input) {
      const { data: auth } = await db().auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { error } = await db().from('device_sessions').upsert(
        {
          user_id: uid,
          device_token: input.deviceToken,
          label: input.label,
          platform: input.platform,
          last_active: new Date().toISOString(),
          revoked: false,
        },
        { onConflict: 'user_id,device_token' }
      );
      if (error && (error as { code?: string }).code !== '42P01') throw error;
    },
    async touch(deviceToken) {
      const { data: auth } = await db().auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      await db()
        .from('device_sessions')
        .update({ last_active: new Date().toISOString() })
        .eq('user_id', uid)
        .eq('device_token', deviceToken);
    },
    async isRevoked(deviceToken) {
      const { data: auth } = await db().auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return false;
      const { data, error } = await db()
        .from('device_sessions')
        .select('revoked')
        .eq('user_id', uid)
        .eq('device_token', deviceToken)
        .maybeSingle();
      if (error) return false;
      return !!data?.revoked;
    },
    async revoke(id) {
      const { error } = await db()
        .from('device_sessions')
        .update({ revoked: true })
        .eq('id', id);
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await db().from('device_sessions').delete().eq('id', id);
      if (error) throw error;
    },
  },
};
