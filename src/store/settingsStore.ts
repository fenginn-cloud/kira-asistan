import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationPreferences, ThemePreference } from '@/types';

const defaultNotifications: NotificationPreferences = {
  before_7: true,
  before_3: true,
  before_1: true,
  due_day: true,
  overdue_1: true,
  overdue_3: true,
  overdue_7: false,
};

interface SettingsState {
  theme: ThemePreference;
  notifications: NotificationPreferences;
  setTheme: (theme: ThemePreference) => void;
  toggleNotification: (key: keyof NotificationPreferences) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      notifications: defaultNotifications,
      setTheme: (theme) => set({ theme }),
      toggleNotification: (key) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [key]: !state.notifications[key],
          },
        })),
    }),
    {
      name: 'kira-asistan-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
