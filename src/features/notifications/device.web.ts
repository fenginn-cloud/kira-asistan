import type { ReminderWithRefs } from './reminders';
import { reminderNotification } from './content';

export type NotifPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function notificationsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

export async function getPermission(): Promise<NotifPermission> {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission as NotifPermission;
}

export async function requestPermission(): Promise<NotifPermission> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    const p = await Notification.requestPermission();
    return p as NotifPermission;
  } catch {
    return 'denied';
  }
}

async function present(
  title: string,
  body: string,
  tag: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data,
    });
  } catch {
    // Fallback when no active service worker (page must be open).
    try {
      // eslint-disable-next-line no-new
      new Notification(title, { body, icon: '/icon-192.png', tag });
    } catch {
      /* ignore */
    }
  }
}

export async function sendTest(): Promise<void> {
  if ((await getPermission()) !== 'granted') return;
  await present('Kira Asistan', 'Bildirimler başarıyla çalışıyor ✅', 'kira-test', {
    url: '/',
  });
}

/**
 * Show device notifications for today's due reminders, once each (de-duped
 * permanently by reminder id, so the same reminder is never repeated).
 * Returns how many new notifications were shown.
 */
export async function showDueReminders(reminders: ReminderWithRefs[]): Promise<number> {
  if ((await getPermission()) !== 'granted') return 0;
  let shown = 0;
  for (const r of reminders) {
    const key = `kira-notif:${r.id}`;
    try {
      if (localStorage.getItem(key)) continue;
    } catch {
      /* storage unavailable */
    }
    const { title, body } = reminderNotification(r);
    await present(title, body, r.id, {
      contractId: r.contractId,
      url: `/contracts/${r.contractId}`,
    });
    try {
      localStorage.setItem(key, String(Date.now()));
    } catch {
      /* ignore */
    }
    shown++;
  }
  return shown;
}

/** No-op on web (the page-open effect drives checks). */
export function configure(): void {}
