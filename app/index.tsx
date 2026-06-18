import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const isRestoring = useAuthStore((s) => s.isRestoring);

  // Wait for session restore to avoid bouncing to login on a cold start.
  if (isRestoring) return null;

  return <Redirect href={user ? '/(app)/(tabs)' : '/(auth)/login'} />;
}
