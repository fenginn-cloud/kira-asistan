import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

interface ReminderState {
  /** The day the `done` set belongs to; reset when the day changes. */
  day: string;
  done: string[];
  isDone: (id: string) => boolean;
  markDone: (id: string) => void;
  undo: (id: string) => void;
}

/**
 * Tracks which reminders the user has marked "Tamamlandı" today.
 * Persisted so it survives reloads; auto-resets at midnight.
 */
export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      day: todayKey(),
      done: [],
      isDone: (id) => {
        const today = todayKey();
        if (get().day !== today) {
          set({ day: today, done: [] });
          return false;
        }
        return get().done.includes(id);
      },
      markDone: (id) => {
        const today = todayKey();
        const base = get().day === today ? get().done : [];
        set({ day: today, done: [...new Set([...base, id])] });
      },
      undo: (id) =>
        set((s) => ({ done: s.done.filter((x) => x !== id) })),
    }),
    {
      name: 'kira-asistan-reminders',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
