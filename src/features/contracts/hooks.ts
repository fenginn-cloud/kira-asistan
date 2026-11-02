import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/services';
import { queryKeys } from '@/lib/query';
import type { Contract } from '@/types';
import type { RentChangeInput, TerminateInput } from '@/services/repositories/types';
import { decideUnitLink } from '@/features/units/linking';

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

function invalidateContractAndPayments(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: queryKeys.contracts });
  qc.invalidateQueries({ queryKey: queryKeys.contract(id) });
  qc.invalidateQueries({ queryKey: queryKeys.paymentsByContract(id) });
  qc.invalidateQueries({ queryKey: queryKeys.paymentsAll });
}

/** Kira artışı / düzeltmesi: seçilen aydan itibaren yeni tutar. */
export function useApplyRentChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RentChangeInput }) =>
      repositories.contracts.applyRentChange(id, input),
    onSuccess: (_d, { id }) => invalidateContractAndPayments(qc, id),
  });
}

/**
 * Sözleşmeyi uzat: yeni bitiş tarihi (+ isteğe bağlı kira artışı). Sözleşme
 * aktif kalır; takip yeni bitişe kadar kesintisiz sürer.
 */
export function useExtendContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      endDate,
      autoRenew,
      rentChange,
    }: {
      id: string;
      endDate: string | null;
      autoRenew: boolean;
      rentChange?: RentChangeInput | null;
    }) => {
      await repositories.contracts.update(id, { endDate, autoRenew, status: 'active' });
      if (rentChange) await repositories.contracts.applyRentChange(id, rentChange);
    },
    onSuccess: (_d, { id }) => invalidateContractAndPayments(qc, id),
  });
}

/** Kiracı çıkışı: sonlandır + depozito; istenirse daireyi boş işaretle. */
export function useTerminateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contract,
      input,
      markUnitVacant,
    }: {
      contract: Contract;
      input: TerminateInput;
      markUnitVacant: boolean;
    }) => {
      await repositories.contracts.terminate(contract.id, input);
      if (markUnitVacant && contract.unitId) {
        await repositories.units.setStatus(contract.unitId, 'vacant', input.exitDate);
      }
    },
    onSuccess: (_d, { contract }) => {
      invalidateContractAndPayments(qc, contract.id);
      qc.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

/**
 * Yeni sözleşme kaydı + (varsa) başlangıç bakiyesi + daire envanterine bağlama.
 * Daire belirsizse bağlanmaz; envanter ekranı kullanıcıya seçtirir.
 */
export function useCreateContractFull() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      openingBalance,
    }: {
      input: Omit<Contract, 'id' | 'createdAt'>;
      openingBalance: number;
    }) => {
      const created = await repositories.contracts.create(input);
      if (openingBalance > 0) {
        await repositories.payments.addOpeningBalance(created, openingBalance);
      }
      let unitLink: string = 'none';
      try {
        const units = await repositories.units.list();
        const d = decideUnitLink(units, created);
        unitLink = d.kind;
        if (d.kind === 'link') {
          await repositories.contracts.update(created.id, { unitId: d.unitId });
          await repositories.units.setStatus(d.unitId, 'occupied', null);
        } else if (d.kind === 'create') {
          const unit = await repositories.units.upsert(d.input);
          await repositories.contracts.update(created.id, { unitId: unit.id });
        }
      } catch {
        // Envanter bağlantısı ana kaydı engellemez (ör. personel yetkisi yok).
        unitLink = 'failed';
      }
      return { created, unitLink };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.contracts });
      qc.invalidateQueries({ queryKey: queryKeys.paymentsAll });
      qc.invalidateQueries({ queryKey: ['units'] });
    },
  });
}
