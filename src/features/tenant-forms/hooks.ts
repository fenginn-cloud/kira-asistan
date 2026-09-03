import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query';
import {
  createForm,
  deleteForm,
  getForm,
  linkFormToContract,
  listForms,
  saveReview,
  type CreateFormInput,
  type ReviewInput,
} from '@/services/tenantForms';

export function useTenantForms() {
  return useQuery({
    queryKey: queryKeys.tenantForms,
    queryFn: () => listForms(),
  });
}

export function useTenantForm(id: string) {
  return useQuery({
    queryKey: queryKeys.tenantForm(id),
    queryFn: () => getForm(id),
    enabled: !!id,
  });
}

export function useCreateTenantForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFormInput) => createForm(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tenantForms }),
  });
}

export function useDeleteTenantForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteForm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tenantForms }),
  });
}

export function useLinkTenantForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, contractId }: { id: string; contractId: string | null }) =>
      linkFormToContract(id, contractId),
    onSuccess: (form) => {
      qc.invalidateQueries({ queryKey: queryKeys.tenantForms });
      qc.invalidateQueries({ queryKey: queryKeys.tenantForm(form.id) });
    },
  });
}

export function useSaveReview(formId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewInput) => saveReview(formId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tenantForm(formId) });
      qc.invalidateQueries({ queryKey: queryKeys.tenantForms });
    },
  });
}
