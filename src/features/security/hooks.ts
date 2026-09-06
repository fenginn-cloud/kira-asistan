import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { getDeviceLabel, getDeviceToken, devicePlatform } from './device';

const KEY = ['device_sessions'] as const;

/** Bu cihazın kalıcı token'ı (bir kez okunur). */
export function useDeviceToken() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void getDeviceToken().then((t) => alive && setToken(t));
    return () => {
      alive = false;
    };
  }, []);
  return token;
}

export function useDeviceSessions() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => repositories.deviceSessions.list(),
    staleTime: 30_000,
  });
}

export function useRevokeDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repositories.deviceSessions.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemoveDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repositories.deviceSessions.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/**
 * Cihaz koruması: oturum açıkken bu cihazı kaydeder, düzenli olarak
 * son-aktifliği günceller ve "iptal edildi mi" kontrol eder. İptal edilmişse
 * (başka cihazdan kapatılmışsa) yerelde çıkış yapar. App layout'ta çağrılır.
 */
export function useDeviceGuard() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      registeredFor.current = null;
      return;
    }
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      const token = await getDeviceToken();
      if (cancelled) return;
      // Bu oturum için bir kez kaydet.
      if (registeredFor.current !== user.id) {
        registeredFor.current = user.id;
        await repositories.deviceSessions
          .register({ deviceToken: token, label: getDeviceLabel(), platform: devicePlatform() })
          .catch(() => {});
      }
      const check = async () => {
        try {
          if (await repositories.deviceSessions.isRevoked(token)) {
            signOut();
          } else {
            void repositories.deviceSessions.touch(token).catch(() => {});
          }
        } catch {
          // yoksay
        }
      };
      await check();
      interval = setInterval(check, 60_000);
    };
    void run();

    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') void run();
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      sub.remove();
    };
  }, [user, signOut]);
}
