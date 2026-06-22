import '../global.css';

import { useEffect } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'nativewind';
import * as SplashScreen from 'expo-splash-screen';
import { queryClient } from '@/lib/query';
import { ToastProvider } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const restore = useAuthStore((s) => s.restore);
  const theme = useSettingsStore((s) => s.theme);
  const systemScheme = useSystemScheme();
  const { setColorScheme } = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemScheme === 'dark');

  useEffect(() => {
    // Restore any persisted session (Supabase) before hiding the splash.
    restore().finally(() => SplashScreen.hideAsync());
  }, [restore]);

  // Apply the user's theme choice. "system" resolves to the OS scheme.
  // We drive the CSS variables via the `dark` class on <html> (web) and also
  // set NativeWind's scheme (native).
  useEffect(() => {
    const resolved = theme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : theme;
    setColorScheme(resolved);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', resolved === 'dark');
    }
  }, [theme, systemScheme, setColorScheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
