import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StatusFilter =
  | 'all'
  | 'active'
  | 'passive'
  | 'debtor'
  | 'creditor'
  | 'paid_month'
  | 'partial_month'
  | 'unpaid_month'
  | 'overdue'
  | 'expiring';

export type SortKey =
  | 'date_desc'
  | 'date_asc'
  | 'name_asc'
  | 'name_desc'
  | 'rent_desc'
  | 'rent_asc'
  | 'debt_desc'
  | 'debt_asc'
  | 'over_desc';

interface ContractsViewState {
  status: StatusFilter;
  /** Property name filter, or 'all'. */
  property: string;
  sort: SortKey;
  setStatus: (s: StatusFilter) => void;
  setProperty: (p: string) => void;
  setSort: (s: SortKey) => void;
}

/** Persisted so the last filter + sort survive reloads / re-opening the app. */
export const useContractsViewStore = create<ContractsViewState>()(
  persist(
    (set) => ({
      status: 'all',
      property: 'all',
      sort: 'name_asc',
      setStatus: (status) => set({ status }),
      setProperty: (property) => set({ property }),
      setSort: (sort) => set({ sort }),
    }),
    {
      name: 'kira-asistan-contracts-view',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Eski kurulumlarda varsayılan "Yeni → Eski" idi; onu alfabetik sıraya
      // taşı (kullanıcı bilerek başka bir sıralama seçtiyse ona dokunma).
      migrate: (persisted, fromVersion) => {
        const s = persisted as Partial<ContractsViewState> | undefined;
        if (s && fromVersion < 1 && s.sort === 'date_desc') {
          return { ...s, sort: 'name_asc' } as ContractsViewState;
        }
        return s as ContractsViewState;
      },
    }
  )
);

export const SORT_LABELS: Record<SortKey, string> = {
  date_desc: 'Yeni → Eski',
  date_asc: 'Eski → Yeni',
  name_asc: 'Mülk A → Z',
  name_desc: 'Mülk Z → A',
  rent_desc: 'Kira Yüksek → Düşük',
  rent_asc: 'Kira Düşük → Yüksek',
  debt_desc: 'Borç Yüksek → Düşük',
  debt_asc: 'Borç Düşük → Yüksek',
  over_desc: 'Fazla Ödeme Çok → Az',
};
