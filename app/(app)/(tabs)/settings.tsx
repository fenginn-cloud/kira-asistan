import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  Building,
  ChevronRight,
  LogOut,
  Moon,
  Users,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useCompany } from '@/features/users/hooks';
import { NotificationControlCard } from '@/features/notifications/components/NotificationControlCard';
import { useScrollToTop } from '@/lib/scrollToTop';
import type { NotificationPreferences, ThemePreference } from '@/types';
import { palette } from '@/lib/theme/colors';

const NOTIFICATION_ROWS: { key: keyof NotificationPreferences; label: string }[] = [
  { key: 'before_7', label: '7 gün kala' },
  { key: 'before_3', label: '3 gün kala' },
  { key: 'before_1', label: '1 gün kala' },
  { key: 'due_day', label: 'Ödeme günü' },
  { key: 'overdue_1', label: 'Gecikmenin 1. günü' },
  { key: 'overdue_3', label: 'Gecikmenin 3. günü' },
  { key: 'overdue_7', label: 'Gecikmenin 7. günü' },
];

const THEMES: { key: ThemePreference; label: string }[] = [
  { key: 'light', label: 'Açık' },
  { key: 'dark', label: 'Koyu' },
  { key: 'system', label: 'Sistem' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTop<ScrollView>('settings');
  const { user, signOut } = useAuthStore();
  const { notifications, toggleNotification, theme, setTheme } = useSettingsStore();
  const { data: company } = useCompany();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Text className="pt-2 text-2xl font-bold text-[#0B1220]">Ayarlar</Text>

        {/* Profile */}
        <Pressable className="mt-5" onPress={() => router.push('/(app)/profile')}>
          <Card>
            <View className="flex-row items-center gap-3">
              <Avatar name={user?.fullName ?? 'K'} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-[#0B1220]">
                  {user?.fullName}
                </Text>
                <Text className="text-sm text-muted">{user?.email}</Text>
              </View>
              <View className="rounded-full bg-primary-50 px-3 py-1">
                <Text className="text-xs font-semibold text-primary-700">
                  {user?.role === 'admin'
                    ? 'Yönetici'
                    : user?.role === 'super_admin'
                      ? 'Süper Admin'
                      : 'Personel'}
                </Text>
              </View>
            </View>
          </Card>
        </Pressable>

        {/* Company settings (super admin only) */}
        {isSuperAdmin ? (
          <Pressable className="mt-3" onPress={() => router.push('/(app)/company')}>
            <Card>
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                  <Building size={20} color={palette.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-[#0B1220]">
                    {company?.name ?? 'Şirket Ayarları'}
                  </Text>
                  <Text className="text-sm text-muted">Şirket bilgileri, logo, para birimi</Text>
                </View>
                <ChevronRight size={20} color={palette.muted} />
              </View>
            </Card>
          </Pressable>
        ) : null}

        {/* User management (admins only) */}
        {isAdmin ? (
          <Pressable onPress={() => router.push('/(app)/users')} className="mt-3">
            <Card>
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                  <Users size={20} color={palette.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-[#0B1220]">
                    Kullanıcı Yönetimi
                  </Text>
                  <Text className="text-sm text-muted">
                    Kullanıcı ekle, rol ve durum yönet
                  </Text>
                </View>
                <ChevronRight size={20} color={palette.muted} />
              </View>
            </Card>
          </Pressable>
        ) : null}

        {/* Notifications */}
        <SectionHeader title="Bildirim Ayarları" />
        <View className="mb-3">
          <NotificationControlCard />
        </View>
        <Card>
          <View className="mb-1 flex-row items-center gap-2">
            <Bell size={16} color={palette.primary} />
            <Text className="text-sm font-medium text-muted">
              Hatırlatma bildirimleri
            </Text>
          </View>
          {NOTIFICATION_ROWS.map((row, idx) => (
            <View
              key={row.key}
              className={`flex-row items-center justify-between py-3 ${
                idx > 0 ? 'border-t border-border/60' : ''
              }`}
            >
              <Text className="text-base text-[#0B1220]">{row.label}</Text>
              <Switch
                value={notifications[row.key]}
                onValueChange={() => toggleNotification(row.key)}
                trackColor={{ true: palette.primary, false: palette.border }}
              />
            </View>
          ))}
        </Card>

        {/* Theme */}
        <SectionHeader title="Tema" />
        <Card>
          <View className="flex-row items-center gap-2">
            <Moon size={16} color={palette.primary} />
            <Text className="mb-1 text-sm font-medium text-muted">Görünüm</Text>
          </View>
          <View className="mt-3 flex-row gap-2">
            {THEMES.map((t) => {
              const active = theme === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTheme(t.key)}
                  className={`flex-1 items-center rounded-2xl py-3 ${
                    active ? 'bg-primary' : 'bg-background'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      active ? 'text-white' : 'text-muted'
                    }`}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Logout */}
        <Pressable
          onPress={() => {
            signOut();
            router.replace('/(auth)/login');
          }}
          className="mt-6"
        >
          <Card>
            <View className="flex-row items-center justify-center gap-2">
              <LogOut size={18} color={palette.danger} />
              <Text className="text-base font-semibold text-danger">
                Çıkış Yap
              </Text>
            </View>
          </Card>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
