import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ReminderWithRefs } from './reminders';
import { reminderNotification } from './content';
import { useSettingsStore } from '@/store/settingsStore';

export type NotifPermission = 'granted' | 'denied' | 'default' | 'unsupported';

const ANDROID_CHANNEL_ID = 'kira-reminders';
const shownIds = new Set<string>();

export function notificationsSupported(): boolean {
  return true;
}

export function configure(): void {
  Notifications.setNotificationHandler({
    // Ön planda (uygulama açıkken) bildirim gösterimi. SES yalnızca:
    //  • yönetici "Kira günü bildirim sesi"ni ayarlardan açtıysa, ya da
    //  • bu bir test bildirimiyse (data.test) çalar.
    // Aksi halde açılışta gelen "vadesi gelen hatırlatmalar" SESSİZ gösterilir —
    // aksi halde borçlusu olan kullanıcı her açılışta ses duyar.
    handleNotification: async (notification) => {
      const data = (notification.request.content.data ?? {}) as { test?: boolean };
      const wantSound =
        data.test === true || useSettingsStore.getState().reminderSound === true;
      return {
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: wantSound,
        shouldSetBadge: false,
      };
    },
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
  await present('Kira Asistan', 'Bildirimler başarıyla çalışıyor ✅', { url: '/', test: true });
}

/** Web Push is web-only; native uses Expo's own push channel (future). */
export async function ensurePushSubscription(): Promise<void> {}

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
