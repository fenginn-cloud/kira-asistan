import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ReminderWithRefs } from './reminders';
import { reminderNotification } from './content';

export type NotifPermission = 'granted' | 'denied' | 'default' | 'unsupported';

const ANDROID_CHANNEL_ID = 'kira-reminders';
const shownIds = new Set<string>();

export function notificationsSupported(): boolean {
  return true;
}

export function configure(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Kira Hatırlatmaları',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#2563EB',
    }).catch(() => {});
  }
}

export async function getPermission(): Promise<NotifPermission> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'default';
}

export async function requestPermission(): Promise<NotifPermission> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'default';
}

async function present(title: string, body: string, data: Record<string, unknown>) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
  });
}

export async function sendTest(): Promise<void> {
  if ((await getPermission()) !== 'granted') return;
  await present('Kira Asistan', 'Bildirimler başarıyla çalışıyor ✅', { url: '/' });
}

export async function showDueReminders(reminders: ReminderWithRefs[]): Promise<number> {
  if ((await getPermission()) !== 'granted') return 0;
  let shown = 0;
  for (const r of reminders) {
    if (shownIds.has(r.id)) continue;
    const { title, body } = reminderNotification(r);
    await present(title, body, { contractId: r.contractId, url: `/contracts/${r.contractId}` });
    shownIds.add(r.id);
    shown++;
  }
  return shown;
}
