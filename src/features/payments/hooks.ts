import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/services';
import { queryKeys } from '@/lib/query';
import type { Contract, Payment, PaymentMethod, TenantClaim } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export function usePaymentsByContract(contractId: string) {
  return useQuery({
    queryKey: queryKeys.paymentsByContract(contractId),
    queryFn: () => repositories.payments.listByContract(contractId),
    enabled: !!contractId,
  });
}

export function useAllPayments() {
  return useQuery({
    queryKey: queryKeys.paymentsAll,
    queryFn: () => repositories.payments.listAll(),
  });
}

export function useEnsureRecentPayments(contractId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contract: import('@/types').Contract) =>
      repositories.payments.ensureRecentPayments(contract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentsByContract(contractId) });
      qc.invalidateQueries({ queryKey: queryKeys.paymentsAll });
    },
  });
}

const CLAIMS_KEY = ['claims', 'pending'] as const;

/** Tenant-reported payments awaiting approval. */
export function usePendingClaims() {
  return useQuery({
    queryKey: CLAIMS_KEY,
    queryFn: () => repositories.claims.listPending(),
    enabled: isSupabaseConfigured,
    retry: false,
  });
}

export function useApproveClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ claim, contract }: { claim: TenantClaim; contract: Contract }) =>
      repositories.claims.approve(claim, contract),
    onSuccess: (_data, { claim }) => {
      qc.invalidateQueries({ queryKey: CLAIMS_KEY });
      qc.invalidateQueries({ queryKey: queryKeys.paymentsAll });
      qc.invalidateQueries({ queryKey: queryKeys.paymentsByContract(claim.contractId) });
      qc.invalidateQueries({ queryKey: ['transactions', 'contract', claim.contractId] });
    },
  });
}

export function useRejectClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repositories.claims.reject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLAIMS_KEY }),
  });
}

export function useDeleteTransaction(contractId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repositories.payments.deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentsByContract(contractId) });
      qc.invalidateQueries({ queryKey: queryKeys.paymentsAll });
      qc.invalidateQueries({ queryKey: ['transactions', 'contract', contractId] });
    },
  });
}

/** One-tap "Alındı": mark current month received + notify the team. */
export function useMarkReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contract, note }: { contract: Contract; note: string | null }) =>
      repositories.payments.markCurrentMonthReceived(contract, note),
    onSuccess: (_data, { contract }) => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentsAll });
      qc.invalidateQueries({ queryKey: queryKeys.paymentsByContract(contract.id) });
      qc.invalidateQueries({ queryKey: ['transactions', 'contract', contract.id] });
    },
  });
}

/** One-tap "Alındı" on the dashboard: settle the exact payment shown. */
export function useSettlePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payment, note }: { payment: Payment; note: string | null }) =>
      repositories.payments.settlePayment(payment.id, note),
    onSuccess: (_data, { payment }) => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentsAll });
      qc.invalidateQueries({ queryKey: queryKeys.paymentsByContract(payment.contractId) });
      qc.invalidateQueries({ queryKey: ['transactions', 'contract', payment.contractId] });
    },
  });
}

export function useSetMonthlyPaid(contractId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, amountPaid }: { paymentId: string; amountPaid: number }) =>
      repositories.payments.setMonthlyPaid(paymentId, amountPaid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentsByContract(contractId) });
      qc.invalidateQueries({ queryKey: queryKeys.paymentsAll });
      qc.invalidateQueries({ queryKey: ['transactions', 'contract', contractId] });
    },
  });
}

export function useContractTransactions(contractId: string) {
  return useQuery({
    queryKey: ['transactions', 'contract', contractId],
    queryFn: () => repositories.payments.listTransactionsByContract(contractId),
    enabled: !!contractId,
  });
}

export function useAddTransaction(contractId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      paymentId: string;
      amount: number;
      paidAt: string;
      method: PaymentMethod | null;
      description: string | null;
      receiptUrl: string | null;
    }) => repositories.payments.addTransaction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentsByContract(contractId) });
      qc.invalidateQueries({ queryKey: queryKeys.paymentsAll });
      qc.invalidateQueries({ queryKey: ['transactions', 'contract', contractId] });
    },
  });
}
