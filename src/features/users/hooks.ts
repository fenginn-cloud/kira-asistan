import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/services';
import { queryKeys } from '@/lib/query';
import type { CreateUserInput } from '@/services/repositories/types';
import type { AppUser } from '@/types';

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => repositories.users.list(),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => repositories.users.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AppUser> }) =>
      repositories.users.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

export function useCompany() {
  return useQuery({
    queryKey: queryKeys.company,
    queryFn: () => repositories.company.getCurrent(),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof repositories.company.update>[0]) =>
      repositories.company.update(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.company }),
  });
}
