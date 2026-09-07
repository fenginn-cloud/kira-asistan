import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { LandingPage } from '@/features/landing/LandingPage';

/** Kurulu PWA (ana ekrana eklenmiş, standalone) mı? Tarayıcı sekmesi değil. */
function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const isRestoring = useAuthStore((s) => s.isRestoring);

  // Web tarayıcı ana domaini: herkese açık ürün/landing sayfası (oturum açık
  // olsa da kalır; başlıktaki buton "Uygulamaya Git" olur). Kurulu PWA ve native
  // (mobil uygulama) ise doğrudan uygulamaya/girişe yönlenir.
  if (Platform.OS === 'web' && !isStandalonePWA()) return <LandingPage />;

  if (isRestoring) return null;
  return <Redirect href={user ? '/(app)/(tabs)' : '/(auth)/login'} />;
}
