import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/services';
import { queryKeys } from '@/lib/query';
import type { Contract } from '@/types';

export function useContracts() {
  return useQuery({
    queryKey: queryKeys.contracts,
    queryFn: () => repositories.contracts.list(),
  });
}

export function useContract(id: string) {
  return useQuery({
    queryKey: queryKeys.contract(id),
    queryFn: () => repositories.contracts.getById(id),
    enabled: !!id,
  });
}

/** Tenant-link token; degrades to null if migration 0007 isn't applied yet. */
export function useContractToken(id: string) {
  return useQuery({
    queryKey: [...queryKeys.contract(id), 'token'],
    queryFn: () => repositories.contracts.getPublicToken(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Contract, 'id' | 'createdAt'>) =>
      repositories.contracts.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.contracts }),
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Contract> }) =>
      repositories.contracts.update(id, patch),
    // İyimser güncelleme: patch'i hem detay hem liste cache'ine hemen uygula ki
    // (ör. "Pasife Al") arayüz beklemeden yansısın. Hata olursa geri alınır,
    // her durumda sonunda sunucudan tazelenir.
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.contract(id) });
      await qc.cancelQueries({ queryKey: queryKeys.contracts });
      const prevDetail = qc.getQueryData<Contract>(queryKeys.contract(id));
      const prevList = qc.getQueryData<Contract[]>(queryKeys.contracts);
      if (prevDetail) {
        qc.setQueryData<Contract>(queryKeys.contract(id), { ...prevDetail, ...patch });
      }
      if (prevList) {
        qc.setQueryData<Contract[]>(
          queryKeys.contracts,
          prevList.map((c) => (c.id === id ? { ...c, ...patch } : c))
        );
      }
      return { prevDetail, prevList };
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.prevDetail) qc.setQueryData(queryKeys.contract(id), ctx.prevDetail);
      if (ctx?.prevList) qc.setQueryData(queryKeys.contracts, ctx.prevList);
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.contracts });
      qc.invalidateQueries({ queryKey: queryKeys.contract(id) });
    },
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repositories.contracts.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.contracts }),
  });
}
