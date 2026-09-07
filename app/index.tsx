import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { LandingPage } from '@/features/landing/LandingPage';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const isRestoring = useAuthStore((s) => s.isRestoring);

  // Web ana domain: herkese açık ürün/landing sayfası (oturum açık olsa da
  // kalır; başlıktaki buton "Uygulamaya Git" olur). Native (mobil uygulama)
  // ise doğrudan uygulamaya/girişe yönlenir.
  if (Platform.OS === 'web') return <LandingPage />;

  if (isRestoring) return null;
  return <Redirect href={user ? '/(app)/(tabs)' : '/(auth)/login'} />;
}
