import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/services';
import { queryKeys } from '@/lib/query';
import type { PaymentMethod } from '@/types';

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
