import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/services';

const KEY = ['building_units'] as const;

/** Şirketin bina→toplam daire ayarları. */
export function useBuildingUnits() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => repositories.buildingUnits.list(),
    staleTime: 60_000,
  });
}

/** Bir binanın toplam daire sayısını kaydet/güncelle. */
export function useSetBuildingUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ building, total }: { building: string; total: number }) =>
      repositories.buildingUnits.set(building, total),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
