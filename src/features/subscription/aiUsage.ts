import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Günlük AI soru sayacı (istemci tarafı yumuşak limit).
 * Pro planında `aiDailyLimit` (ör. 15) uygulanır; Business sınırsızdır (null).
 * Gün değişince sayaç sıfırlanır. Sunucu tarafı kotayla değiştirilebilir.
 */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface AiUsageState {
  date: string;
  count: number;
  /** Bugünkü kullanım sayısını döndürür (gün değiştiyse 0). */
  usedToday: () => number;
  /** Bir soru daha sorulabilir mi? limit null = sınırsız. */
  canAsk: (limit: number | null) => boolean;
  /** Başarılı bir soruyu say. */
  record: () => void;
}

export const useAiUsageStore = create<AiUsageState>()(
  persist(
    (set, get) => ({
      date: today(),
      count: 0,
      usedToday: () => {
        const s = get();
        return s.date === today() ? s.count : 0;
      },
      canAsk: (limit) => {
        if (limit === null) return true;
        return get().usedToday() < limit;
      },
      record: () => {
        const d = today();
        const s = get();
        set(s.date === d ? { count: s.count + 1 } : { date: d, count: 1 });
      },
    }),
    {
      name: 'kira-ai-usage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
