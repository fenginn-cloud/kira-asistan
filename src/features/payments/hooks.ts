import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/services';
import { queryKeys } from '@/lib/query';
import type { Contract, PaymentMethod, TenantClaim } from '@/types';
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
