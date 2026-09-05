import { Tabs } from 'expo-router';
import { BarChart3, Building2, FileText, Home, User } from 'lucide-react-native';
import { palette } from '@/lib/theme/colors';
import { useThemeColors } from '@/lib/theme/useThemeColors';
import { triggerScrollTop } from '@/lib/scrollToTop';
import { useAuthStore } from '@/store/authStore';
import { useDesktopShell } from '@/lib/useDesktopShell';

/** Re-tapping the active tab scrolls that screen back to the top. */
const reTap = (route: string) => ({ navigation }: { navigation: { isFocused: () => boolean } }) => ({
  tabPress: () => {
    if (navigation.isFocused()) triggerScrollTop(route);
  },
});

export default function TabsLayout() {
  const colors = useThemeColors();
  const role = useAuthStore((s) => s.user?.role);
  // Personel sade akış görür: Mülkler ve Analiz (istatistik) gizlenir.
  const isAdmin = role === 'admin' || role === 'super_admin';
  // Geniş ekran + yönetici: gezinme sol menüye taşınır, alt sekme gizlenir.
  const { enabled: desktopShell } = useDesktopShell();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: desktopShell
          ? { display: 'none' }
          : {
              height: 86,
              paddingTop: 8,
              paddingBottom: 28,
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
            },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {/* 1 — Ana Sayfa */}
      <Tabs.Screen
        name="index"
        listeners={reTap('index')}
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      {/* 2 — Sözleşmeler */}
      <Tabs.Screen
        name="contracts"
        listeners={reTap('contracts')}
        options={{
          title: 'Sözleşmeler',
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      {/* 3 — Mülkler (yönetici) */}
      <Tabs.Screen
        name="properties"
        listeners={reTap('properties')}
        options={{
          title: 'Mülkler',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
        }}
      />
      {/* 4 — Analiz (yönetici; teknik route: stats) */}
      <Tabs.Screen
        name="stats"
        listeners={reTap('stats')}
        options={{
          title: 'Analiz',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      {/* 5 — Profil (teknik route: settings) */}
      <Tabs.Screen
        name="settings"
        listeners={reTap('settings')}
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      {/* Bağımsız AI Asistan sekmesi KALDIRILDI — route korunur ama gizli
          (contextual AI özellikleri ekranların içinde yaşamaya devam eder). */}
      <Tabs.Screen name="ai" options={{ href: null }} />
    </Tabs>
  );
}
