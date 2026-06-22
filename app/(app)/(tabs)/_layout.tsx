import { Tabs } from 'expo-router';
import { BarChart3, FileText, LayoutGrid, Settings } from 'lucide-react-native';
import { palette } from '@/lib/theme/colors';
import { useThemeColors } from '@/lib/theme/useThemeColors';
import { triggerScrollTop } from '@/lib/scrollToTop';

/** Re-tapping the active tab scrolls that screen back to the top. */
const reTap = (route: string) => ({ navigation }: { navigation: { isFocused: () => boolean } }) => ({
  tabPress: () => {
    if (navigation.isFocused()) triggerScrollTop(route);
  },
});

export default function TabsLayout() {
  const colors = useThemeColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 86,
          paddingTop: 8,
          paddingBottom: 28,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={reTap('index')}
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contracts"
        listeners={reTap('contracts')}
        options={{
          title: 'Sözleşmeler',
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        listeners={reTap('stats')}
        options={{
          title: 'İstatistik',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        listeners={reTap('settings')}
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
