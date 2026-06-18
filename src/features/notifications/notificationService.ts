/**
 * Notification service — Phase 3 (local, on-device reminders).
 *
 * Schedules local notifications from each active contract's open payment and
 * the user's NotificationPreferences. Cancel-and-reschedule keeps the OS queue
 * in sync whenever data or preferences change.
 *
 * Phase 4 (push): the same scheduling surface can instead enqueue rows in
 * Supabase; an Edge Function + cron sends Expo Push messages. No UI changes.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { addDays, isAfter, parseISO, set } from 'date-fns';
import type {
  Contract,
  NotificationPreferences,
  NotificationTrigger,
  Payment,
} from '@/types';
import { formatCurrency } from '@/lib/utils/format';
import { remainingDebt } from '@/lib/utils/payments';
import { TRIGGER_OFFSET, openPaymentFor } from './reminders';

/** Local notifications are unavailable on web. */
export const NOTIFICATIONS_SUPPORTED = Platform.OS !== 'web';

const ANDROID_CHANNEL_ID = 'kira-reminders';
const REMINDER_HOUR = 10; // fire reminders at 10:00 local time

let handlerConfigured = false;

export function configureNotificationHandler(): void {
  if (handlerConfigured || !NOTIFICATIONS_SUPPORTED) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Kira Hatırlatmaları',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#2563EB',
  });
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getPermissionStatus(): Promise<PermissionStatus> {
  if (!NOTIFICATIONS_SUPPORTED) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionStatus;
}

export async function requestPermissions(): Promise<boolean> {
  if (!NOTIFICATIONS_SUPPORTED) return false;
  await ensureAndroidChannel();
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const BODY: Record<NotificationTrigger, (loc: string, debt: string) => string> = {
  before_7: (l) => `${l} için kira ödemesine 7 gün kaldı.`,
  before_3: (l) => `${l} için kira ödemesine 3 gün kaldı.`,
  before_1: (l) => `${l} için kira ödemesine 1 gün kaldı.`,
  due_day: (l) => `${l} için bugün kira ödeme günü.`,
  overdue_1: (l, d) => `${l} ödemesi 1 gün gecikti. Güncel borç: ${d}`,
  overdue_3: (l, d) => `${l} ödemesi 3 gün gecikti. Güncel borç: ${d}`,
  overdue_7: (l, d) => `${l} ödemesi 7 gün gecikti. Güncel borç: ${d}`,
};

function fireDateFor(payment: Payment, trigger: NotificationTrigger): Date {
  // daysUntil === TRIGGER_OFFSET[trigger] on the fire day, so fire = due - offset.
  const day = addDays(parseISO(payment.dueDate), -TRIGGER_OFFSET[trigger]);
  return set(day, { hours: REMINDER_HOUR, minutes: 0, seconds: 0, milliseconds: 0 });
}

function locationOf(c: Contract): string {
  return [c.propertyName, c.block, c.unit].filter(Boolean).join(' ');
}

/**
 * Reconcile the OS notification queue with the current data.
 * Returns the number of reminders scheduled.
 */
export async function scheduleAllReminders(
  contracts: Contract[],
  payments: Payment[],
  prefs: NotificationPreferences,
  now: Date = new Date()
): Promise<number> {
  if (!NOTIFICATIONS_SUPPORTED) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();
  let scheduled = 0;

  for (const contract of contracts) {
    if (contract.status !== 'active' || !contract.notifyStaff) continue;

    const open = openPaymentFor(payments.filter((p) => p.contractId === contract.id));
    if (!open) continue;

    const loc = locationOf(contract);
    const debt = formatCurrency(remainingDebt(open));

    for (const trigger of Object.keys(TRIGGER_OFFSET) as NotificationTrigger[]) {
      if (!prefs[trigger]) continue;

      const fire = fireDateFor(open, trigger);
      if (!isAfter(fire, now)) continue; // skip past fire dates

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Kira Asistan',
          body: BODY[trigger](loc, debt),
          data: { contractId: contract.id, trigger },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fire,
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
        },
      });
      scheduled++;
    }
  }

  return scheduled;
}

export async function cancelAllReminders(): Promise<void> {
  if (!NOTIFICATIONS_SUPPORTED) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledCount(): Promise<number> {
  if (!NOTIFICATIONS_SUPPORTED) return 0;
  const list = await Notifications.getAllScheduledNotificationsAsync();
  return list.length;
}

/** Fires a notification in ~2s so the user can confirm the channel works. */
export async function sendTestNotification(): Promise<void> {
  if (!NOTIFICATIONS_SUPPORTED) return;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Kira Asistan',
      body: 'Bildirimler başarıyla çalışıyor ✅',
      data: { test: true },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
  });
}
