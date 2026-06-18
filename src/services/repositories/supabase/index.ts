import { supabase } from '@/lib/supabase/client';
import type { Repositories } from '../types';
import type { Contract } from '@/types';
import {
  contractColumns,
  fromCompany,
  fromContract,
  fromUser,
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

export const supabaseRepositories: Repositories = {
  contracts: {
    async list() {
      const { data, error } = await db()
        .from('contracts')
        .select(contractColumns)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toContract);
    },
    async getById(id) {
      const { data, error } = await db()
        .from('contracts')
        .select(contractColumns)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data ? toContract(data) : null;
    },
    async create(input) {
      const { data, error } = await db()
        .from('contracts')
        .insert(fromContract(input as Partial<Contract>))
        .select(contractColumns)
        .single();
      if (error) throw error;
      return toContract(data);
    },
    async update(id, patch) {
      const { data, error } = await db()
        .from('contracts')
        .update(fromContract(patch))
        .eq('id', id)
        .select(contractColumns)
        .single();
      if (error) throw error;
      return toContract(data);
    },
    async remove(id) {
      const { error } = await db().from('contracts').delete().eq('id', id);
      if (error) throw error;
    },
  },

  payments: {
    async listByContract(contractId) {
      const { data, error } = await db()
        .from('payments')
        .select('*')
        .eq('contract_id', contractId)
        .order('period_month', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toPayment);
    },
    async listAll() {
      const { data, error } = await db().from('payments').select('*');
      if (error) throw error;
      return (data ?? []).map(toPayment);
    },
    async addTransaction(input) {
      const { error: txError } = await db().from('payment_transactions').insert({
        payment_id: input.paymentId,
        amount: input.amount,
        paid_at: input.paidAt,
        method: input.method,
        description: input.description,
        receipt_url: input.receiptUrl,
      });
      if (txError) throw txError;
      // The recalc_payment trigger updates the payment; re-fetch it.
      const { data, error } = await db()
        .from('payments')
        .select('*')
        .eq('id', input.paymentId)
        .single();
      if (error) throw error;
      return toPayment(data);
    },
    async listTransactions(paymentId) {
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
      // Note: creating an auth user requires admin privileges (Edge Function).
      // Here we insert the profile row; pair with an invite flow in production.
      const { data, error } = await db()
        .from('profiles')
        .insert(fromUser(input))
        .select('*')
        .single();
      if (error) throw error;
      return toUser(data);
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
};
