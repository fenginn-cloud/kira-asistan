import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments } from '@/features/payments/hooks';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import {
  NOTIFICATIONS_SUPPORTED,
  configureNotificationHandler,
  ensureAndroidChannel,
  getPermissionStatus,
  scheduleAllReminders,
} from './notificationService';

/**
 * App-level notification manager. Mounted once (in the authed layout):
 *  - configures the handler + Android channel
 *  - reschedules all reminders whenever contracts, payments or prefs change
 *  - routes notification taps to the related contract
 */
export function useNotificationScheduler(): void {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const prefs = useSettingsStore((s) => s.notifications);
  const { data: contracts = [] } = useContracts();
  const { data: payments = [] } = useAllPayments();

  // One-time setup.
  useEffect(() => {
    configureNotificationHandler();
    ensureAndroidChannel();
  }, []);

  // Route taps to the contract detail.
  useEffect(() => {
    if (!NOTIFICATIONS_SUPPORTED) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { contractId?: string }
        | undefined;
      if (data?.contractId) {
        router.push(`/(app)/contracts/${data.contractId}`);
      }
    });
    return () => sub.remove();
  }, [router]);

  // Reschedule whenever the inputs change (only if permission is granted).
  useEffect(() => {
    if (!user || !NOTIFICATIONS_SUPPORTED) return;
    let cancelled = false;
    (async () => {
      const status = await getPermissionStatus();
      if (cancelled || status !== 'granted') return;
      await scheduleAllReminders(contracts, payments, prefs);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, contracts, payments, prefs]);
}
