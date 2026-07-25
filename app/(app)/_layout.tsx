import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useNotificationScheduler } from '@/features/notifications/useNotificationScheduler';
import { useNotificationNavigation } from '@/features/notifications/useNotificationNavigation';

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  useNotificationScheduler();
  useNotificationNavigation();
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="contracts/new"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="contracts/[id]/index" />
      <Stack.Screen name="contracts/[id]/edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="users" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="company" />
    </Stack>
  );
}
