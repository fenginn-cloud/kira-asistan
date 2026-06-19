import type { ReminderWithRefs } from './reminders';
import { reminderNotification } from './content';
import { supabase } from '@/lib/supabase/client';
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from '@/lib/vapid';

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

/** Re-nudge the same reminder at most once per this window (ms). */
const REPEAT_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Show device notifications for today's due reminders. A reminder is repeated
 * every 2 hours (until the payment is added and it leaves the due set) so the
 * user keeps getting nudged to open the app and record the payment.
 * Returns how many notifications were shown this run.
 */
export async function showDueReminders(reminders: ReminderWithRefs[]): Promise<number> {
  if ((await getPermission()) !== 'granted') return 0;
  let shown = 0;
  const now = Date.now();
  for (const r of reminders) {
    const key = `kira-notif:${r.id}`;
    try {
      const last = localStorage.getItem(key);
      if (last && now - Number(last) < REPEAT_WINDOW_MS) continue; // shown within 2h
    } catch {
      /* storage unavailable */
    }
    const { title, body } = reminderNotification(r);
    await present(title, body, r.id, {
      contractId: r.contractId,
      url: `/contracts/${r.contractId}`,
    });
    try {
      localStorage.setItem(key, String(now));
    } catch {
      /* ignore */
    }
    shown++;
  }
  return shown;
}

/** No-op on web (the page-open effect drives checks). */
export function configure(): void {}

/**
 * Subscribe to Web Push and store the subscription in Supabase so the
 * `send-reminders` Edge Function can deliver reminders while the app is closed.
 * Safe to call repeatedly.
 */
export async function ensurePushSubscription(): Promise<void> {
  if (!notificationsSupported() || !supabase) return;
  if ((await getPermission()) !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }
    const json = sub.toJSON();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid || !json.keys) return;
    await supabase.from('push_subscriptions').upsert(
      {
        user_id: uid,
        endpoint: sub.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: 'endpoint' }
    );
  } catch {
    /* push not available — local notifications still work */
  }
}
