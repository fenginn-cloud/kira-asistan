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
    onSuccess: (contract) => {
      qc.invalidateQueries({ queryKey: queryKeys.contracts });
      qc.invalidateQueries({ queryKey: queryKeys.contract(contract.id) });
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
