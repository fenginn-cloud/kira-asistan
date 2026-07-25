import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter, type Href } from 'expo-router';

/**
 * Bir push bildirimine tıklandığında service worker'ın gönderdiği
 * { type: 'notification-navigate', url } mesajını yakalar ve uygulama içinde
 * ilgili mülke/sözleşmeye yönlendirir (tam sayfa yenileme olmadan).
 */
export function useNotificationNavigation() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === 'notification-navigate' && typeof data.url === 'string') {
        try {
          router.push(data.url as Href);
        } catch {
          if (typeof window !== 'undefined') window.location.assign(data.url);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [router]);
}
