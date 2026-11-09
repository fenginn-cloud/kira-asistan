import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/services';
import type { UnitDetails, UnitStatus, UnitUpsertInput } from '@/services/repositories/types';
import { decideUnitLink, type UnitLinkDecision } from './linking';

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

/** Daire detaylarını (m², oda tipi, balkon, teras, demirbaş, not) kaydet. */
export function useUpdateUnitDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, details }: { id: string; details: UnitDetails }) =>
      repositories.units.updateDetails(id, details),
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

/**
 * Sözleşmeyi envanterdeki daireye KALICI olarak bağlar (contract.unitId).
 * Tek aday → bağla; aday yok → daireyi ekle + bağla; birden fazla aday →
 * dokunmaz ve 'ambiguous' döner (arayüz kullanıcıya seçtirir).
 */
export function useLinkContractUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contract,
      unitId,
    }: {
      contract: import('@/types').Contract;
      /** Kullanıcının belirsiz eşleşmede seçtiği daire. */
      unitId?: string;
    }): Promise<UnitLinkDecision['kind']> => {
      const units = await repositories.units.list();
      const decision: UnitLinkDecision = unitId
        ? { kind: 'link', unitId }
        : decideUnitLink(units, contract);
      if (decision.kind === 'link') {
        await repositories.contracts.update(contract.id, { unitId: decision.unitId });
        if (contract.status === 'active') {
          await repositories.units.setStatus(decision.unitId, 'occupied', null);
        }
      } else if (decision.kind === 'create') {
        const unit = await repositories.units.upsert(decision.input);
        await repositories.contracts.update(contract.id, { unitId: unit.id });
      }
      return decision.kind;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}
