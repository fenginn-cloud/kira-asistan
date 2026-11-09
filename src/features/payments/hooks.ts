import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/services';
import { queryKeys } from '@/lib/query';
import type { Contract, TenantClaim } from '@/types';
import type { CollectInput } from '@/services/repositories/types';
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

/** Bir ayın tüm tahsilatlarını sil ("ödenmedi"ye döndür). */
export function useResetMonth(contractId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => repositories.payments.resetMonth(paymentId),
    onSuccess: () => invalidatePayments(qc, contractId),
  });
}

export function useContractTransactions(contractId: string) {
  return useQuery({
    queryKey: ['transactions', 'contract', contractId],
    queryFn: () => repositories.payments.listTransactionsByContract(contractId),
    enabled: !!contractId,
  });
}

export type CollectVariables = Omit<CollectInput, 'clientRef'> & {
  contractId: string;
  /** Pencere açıldığında üretilen tekrar-koruma anahtarı. */
  clientRef: string;
};

/**
 * TEK tahsilat yolu — "Alındı", "Tahsilat Gir" ve "Ödeme Ekle" aynı mantığı
 * kullanır: seçilen ay + girilen tutar birebir kaydedilir. Aynı clientRef ile
 * tekrar gelen istek ikinci kayıt oluşturmaz.
 */
export function useCollectPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId: _c, ...input }: CollectVariables) =>
      repositories.payments.collect(input),
    onSuccess: (_d, { contractId }) => invalidatePayments(qc, contractId),
  });
}

/** Tahsilatı geri al (tek kayıt silinir; cari hesap yeniden hesaplanır). */
export function useUndoCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId }: { transactionId: string; contractId: string }) =>
      repositories.payments.deleteTransaction(transactionId),
    onSuccess: (_d, { contractId }) => invalidatePayments(qc, contractId),
  });
}

/** Çakışmasız, tahmin edilemez işlem anahtarı (uuid v4 biçiminde). */
export function newClientRef(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function invalidatePayments(qc: ReturnType<typeof useQueryClient>, contractId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.paymentsByContract(contractId) });
  qc.invalidateQueries({ queryKey: queryKeys.paymentsAll });
  qc.invalidateQueries({ queryKey: ['transactions', 'contract', contractId] });
}
