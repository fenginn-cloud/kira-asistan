import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, BellRing, Volume2 } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { playNotificationSound, unlockNotificationSound } from '@/lib/utils/sound';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { NotificationControlCard } from '@/features/notifications/components/NotificationControlCard';
import type { NotificationPreferences } from '@/types';
import { fgColor } from '@/lib/theme/useThemeColors';
import { palette } from '@/lib/theme/colors';

const ADVANCE_ROWS: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  { key: 'before_7', label: '7 gün kala', hint: 'Ödeme gününden bir hafta önce' },
  { key: 'before_3', label: '3 gün kala', hint: 'Ödeme gününe 3 gün kala' },
  { key: 'before_1', label: '1 gün kala', hint: 'Ödemeden bir gün önce' },
  { key: 'due_day', label: 'Ödeme günü', hint: 'Kira ödeme gününde' },
];

const OVERDUE_ROWS: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  { key: 'overdue_1', label: 'Gecikmenin 1. günü', hint: 'Ödeme 1 gün gecikince' },
  { key: 'overdue_3', label: 'Gecikmenin 3. günü', hint: 'Ödeme 3 gün gecikince' },
  { key: 'overdue_7', label: 'Gecikmenin 7. günü', hint: 'Ödeme 1 hafta gecikince' },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notifications, toggleNotification, reminderSound, setReminderSound } = useSettingsStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const Group = ({
    title,
    rows,
  }: {
    title: string;
    rows: { key: keyof NotificationPreferences; label: string; hint: string }[];
  }) => (
    <View className="mt-3">
      <Text className="mb-2 ml-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </Text>
      <Card>
        {rows.map((row, idx) => (
          <View
            key={row.key}
            className={`flex-row items-center justify-between py-3 ${
              idx > 0 ? 'border-t border-border/60' : ''
            }`}
          >
            <View className="flex-1 pr-3">
              <Text className="text-base text-foreground">{row.label}</Text>
              <Text className="mt-0.5 text-xs text-muted">{row.hint}</Text>
            </View>
            <Switch
              value={notifications[row.key]}
              onValueChange={() => toggleNotification(row.key)}
              trackColor={{ true: palette.primary, false: palette.border }}
            />
          </View>
        ))}
      </Card>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface"
          >
            <ArrowLeft size={20} color={fgColor()} />
          </Pressable>
          <Text className="text-2xl font-bold text-foreground">Hatırlatma Bildirimleri</Text>
        </View>
        <View className="mt-1 flex-row items-center gap-2 pl-1">
          <BellRing size={14} color={palette.muted} />
          <Text className="text-sm text-muted">
            Hangi durumlarda hatırlatma almak istediğinizi seçin.
          </Text>
        </View>

        <View className="mt-4">
          <NotificationControlCard />
        </View>

        <Group title="Ödeme Öncesi" rows={ADVANCE_ROWS} />
        <Group title="Gecikme" rows={OVERDUE_ROWS} />

        {/* Bildirim sesi — yönetici tercihi */}
        {isAdmin ? (
          <View className="mt-3">
            <Text className="mb-2 ml-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Ses
            </Text>
            <Card>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-3 pr-3">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary-50">
                    <Volume2 size={18} color={palette.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base text-foreground">Bildirim Sesi</Text>
                    <Text className="mt-0.5 text-xs text-muted">
                      Uygulama açıkken hatırlatma gelince özel ses çalar.
                    </Text>
                  </View>
                </View>
                <Switch
                  value={reminderSound}
                  onValueChange={(on) => {
                    setReminderSound(on);
                    if (on) {
                      unlockNotificationSound();
                      playNotificationSound();
                    }
                  }}
                  trackColor={{ true: palette.primary, false: palette.border }}
                />
              </View>
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
