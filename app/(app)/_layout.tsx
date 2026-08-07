import { useEffect } from 'react';
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

  // Geniş ekran + yönetici: global telefon-kolonu kısıtını kaldırmak için
  // <html>'e desktop-shell sınıfını ekle (global.css bu sınıfı gözetir).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('desktop-shell', enabled);
    return () => document.documentElement.classList.remove('desktop-shell');
  }, [enabled]);

  if (!user) return <Redirect href="/(auth)/login" />;

  // Yönetici + geniş ekran: tüm ekranları soldaki menü kadar sağa iter ve
  // içeriği rahat bir sütunda ortalar. Menü, akışın dışında sabit (fixed)
  // konumlandığından navigator düzeni bozulmaz.
  const contentStyle = enabled
    ? {
        paddingLeft: sidebarWidth + sidePad,
        paddingRight: sidePad,
        backgroundColor: colors.background,
      }
    : undefined;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="contracts/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="contracts/[id]/index" />
        <Stack.Screen name="contracts/[id]/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="users" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="company" />
        <Stack.Screen name="excel-import" />
      </Stack>
      {enabled ? <DesktopSidebar width={sidebarWidth} /> : null}
    </>
  );
}
