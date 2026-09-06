import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/services';
import type { UnitStatus, UnitUpsertInput } from '@/services/repositories/types';

const KEY = ['units'] as const;

/** Şirketin daire envanteri (tüm daireler). */
export function useUnits() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => repositories.units.list(),
    staleTime: 60_000,
  });
}

/** Daire ekle/güncelle (çakışma korunur). */
export function useUpsertUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UnitUpsertInput) => repositories.units.upsert(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Daireyi boş/dolu işaretle. */
export function useSetUnitStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      vacantSince,
    }: {
      id: string;
      status: UnitStatus;
      vacantSince?: string | null;
    }) => repositories.units.setStatus(id, status, vacantSince),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Daireyi envanterden sil. */
export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repositories.units.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
