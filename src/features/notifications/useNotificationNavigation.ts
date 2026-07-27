import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { playNotificationSound, unlockNotificationSound } from '@/lib/utils/sound';
import { useSettingsStore } from '@/store/settingsStore';

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
      if (!data) return;
      // Uygulama açıkken kira günü hatırlatması geldi → yalnızca yönetici bu
      // sesi ayarlardan açtıysa özel bildirim sesini çal.
      if (data.type === 'notification-sound') {
        if (data.kind === 'reminder' && useSettingsStore.getState().reminderSound) {
          playNotificationSound();
        }
        return;
      }
      if (data.type === 'notification-navigate' && typeof data.url === 'string') {
        try {
          router.push(data.url as Href);
        } catch {
          if (typeof window !== 'undefined') window.location.assign(data.url);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);

    // Tarayıcı otomatik ses çalmayı ilk kullanıcı etkileşimine kadar engeller.
    // İlk dokunuş/tıklamada sesi sessizce hazırla (kilidini aç).
    const unlock = () => unlockNotificationSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener('message', handler);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [router]);
}
