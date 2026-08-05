import { View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useNotificationScheduler } from '@/features/notifications/useNotificationScheduler';
import { useNotificationNavigation } from '@/features/notifications/useNotificationNavigation';
import { useDesktopShell } from '@/lib/useDesktopShell';
import { DesktopSidebar } from '@/features/navigation/DesktopSidebar';
import { useThemeColors } from '@/lib/theme/useThemeColors';

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const { enabled, sidebarWidth, sidePad } = useDesktopShell();
  const colors = useThemeColors();
  useNotificationScheduler();
  useNotificationNavigation();
  if (!user) return <Redirect href="/(auth)/login" />;

  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="contracts/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="contracts/[id]/index" />
      <Stack.Screen name="contracts/[id]/edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="users" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="company" />
    </Stack>
  );

  // Mobil / personel: eski düzen (alt sekmeler) aynen korunur.
  if (!enabled) return stack;

  // Yönetici + geniş ekran: kalıcı sol menü + ortalanmış içerik sütunu.
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
      <DesktopSidebar width={sidebarWidth} />
      <View style={{ flex: 1, paddingHorizontal: sidePad }}>{stack}</View>
    </View>
  );
}
