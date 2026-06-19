import { useEffect, useMemo } from 'react';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments } from '@/features/payments/hooks';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { computeTodayReminders } from './reminders';
import { configure, getPermission, showDueReminders } from './device';

/**
 * App-level notification manager (mounted once in the authed layout):
 *  - configures the notification handler
 *  - whenever data/preferences change AND permission is granted, shows device
 *    notifications for today's due reminders (de-duped so none repeat).
 *
 * This is the "check on app open" model (spec #9): every time the app opens or
 * data refreshes, due reminders fire as real OS/browser notifications.
 */
export function useNotificationScheduler(): void {
  const user = useAuthStore((s) => s.user);
  const prefs = useSettingsStore((s) => s.notifications);
  const { data: contracts = [] } = useContracts();
  const { data: payments = [] } = useAllPayments();

  const todayReminders = useMemo(
    () => computeTodayReminders({ contracts, payments, prefs }),
    [contracts, payments, prefs]
  );

  useEffect(() => {
    configure();
  }, []);

  useEffect(() => {
    if (!user || todayReminders.length === 0) return;
    let cancelled = false;
    (async () => {
      if ((await getPermission()) !== 'granted') return;
      if (!cancelled) await showDueReminders(todayReminders);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, todayReminders]);
}
