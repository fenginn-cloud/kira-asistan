import { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments } from '@/features/payments/hooks';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { computeTodayReminders } from './reminders';
import {
  configure,
  ensurePushSubscription,
  getPermission,
  requestPermission,
  showDueReminders,
} from './device';

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
  const entitlement = useEntitlement();
  const advanceReminders = entitlement.limits.advanceReminders;

  const todayReminders = useMemo(
    () => computeTodayReminders({ contracts, payments, prefs, advanceReminders }),
    [contracts, payments, prefs, advanceReminders]
  );

  useEffect(() => {
    configure();
  }, []);

  // Native (Android 13+/iOS): ilk girişte bildirim iznini bir kez iste. Web'de
  // izin kullanıcı jesti gerektirdiğinden (Ayarlar kartı) burada tetiklenmez.
  const askedRef = useRef(false);
  useEffect(() => {
    if (!user || Platform.OS === 'web' || askedRef.current) return;
    askedRef.current = true;
    (async () => {
      // Yalnızca henüz karar verilmemişse (default) sistem dialogu açılır;
      // daha önce izin verildi/reddedildiyse sessiz kalır (yeniden sormaz).
      if ((await getPermission()) === 'default') {
        await requestPermission();
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user || todayReminders.length === 0) return;
    let cancelled = false;
    (async () => {
      if ((await getPermission()) !== 'granted') return;
      if (cancelled) return;
      await ensurePushSubscription();
      if (!cancelled) await showDueReminders(todayReminders);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, todayReminders]);
}
