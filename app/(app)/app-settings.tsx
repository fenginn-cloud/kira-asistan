import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BellRing, MonitorSmartphone, Moon } from 'lucide-react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { useSettingsStore } from '@/store/settingsStore';
import type { ThemePreference } from '@/types';
import { palette } from '@/lib/theme/colors';

const THEMES: { key: ThemePreference; label: string }[] = [
  { key: 'light', label: 'Açık' },
  { key: 'dark', label: 'Koyu' },
  { key: 'system', label: 'Sistem' },
];

/** Ayarlar: tema, bildirimler, aktif oturumlar. (Ayarlar → Uygulama ayarları) */
export default function AppSettingsScreen() {
  const router = useRouter();
  const { theme, setTheme } = useSettingsStore();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Uygulama ayarları" />

        <View className="mt-6">
          <View className="mb-2 ml-1 flex-row items-center gap-1.5">
            <Moon size={13} color={palette.muted} />
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
              Görünüm
            </Text>
          </View>
          <View className="flex-row gap-1 rounded-2xl border border-border/60 bg-surface p-1">
            {THEMES.map((t) => {
              const active = theme === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTheme(t.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  className={`h-10 flex-1 items-center justify-center rounded-xl ${
                    active ? 'bg-primary' : ''
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted'}`}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ListGroup title="Bildirimler ve güvenlik">
          <ListRow
            first
            icon={BellRing}
            title="Hatırlatma bildirimleri"
            subtitle="7 / 3 / 1 gün, ödeme günü, gecikme ve ses"
            onPress={() => router.push('/(app)/notification-settings')}
          />
          <ListRow
            icon={MonitorSmartphone}
            title="Aktif oturumlar"
            subtitle="Hesabın açık olduğu cihazlar"
            onPress={() => router.push('/(app)/sessions')}
          />
        </ListGroup>
      </ScrollView>
    </SafeAreaView>
  );
}
