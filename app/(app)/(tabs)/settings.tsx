import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import {
  Bell,
  Building,
  ChevronRight,
  Crown,
  LogOut,
  Moon,
  FileSpreadsheet,
  ShieldCheck,
  Users,
  Volume2,
} from 'lucide-react-native';
import { playNotificationSound, unlockNotificationSound } from '@/lib/utils/sound';
import { LEGAL_LINKS } from '@/content/legal';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useCompany } from '@/features/users/hooks';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { PLAN_LABELS } from '@/features/subscription/entitlement';
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
  const { notifications, toggleNotification, theme, setTheme, reminderSound, setReminderSound } =
    useSettingsStore();
  const { data: company } = useCompany();
  const entitlement = useEntitlement();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Text className="pt-2 text-2xl font-bold text-foreground">Ayarlar</Text>

        {/* Profile */}
        <Pressable className="mt-5" onPress={() => router.push('/(app)/profile')}>
          <Card>
            <View className="flex-row items-center gap-3">
              <Avatar name={user?.fullName ?? 'K'} />
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">
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

        {/* Subscription plan */}
        {(() => {
          const canUpgrade = !entitlement.isLegacy && entitlement.plan !== 'business';
          const planCard = (
            <Card>
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                  <Crown size={20} color={palette.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    {PLAN_LABELS[entitlement.plan]} Plan
                  </Text>
                  <Text className="text-sm text-muted">
                    {entitlement.isLegacy
                      ? 'Erken kullanıcı — ömür boyu ücretsiz'
                      : entitlement.limits.maxContracts === null
                        ? 'Sınırsız sözleşme'
                        : `${entitlement.limits.maxContracts} sözleşmeye kadar`}
                  </Text>
                </View>
                {entitlement.isLegacy ? (
                  <View className="rounded-full bg-success-soft px-3 py-1">
                    <Text className="text-xs font-semibold text-success">Legacy</Text>
                  </View>
                ) : canUpgrade ? (
                  <View className="flex-row items-center gap-1">
                    <Text className="text-sm font-semibold text-primary-700">Yükselt</Text>
                    <ChevronRight size={18} color={palette.primary} />
                  </View>
                ) : null}
              </View>
            </Card>
          );
          return (
            <View className="mt-3">
              {canUpgrade ? (
                <Pressable onPress={() => router.push('/(app)/paywall')}>{planCard}</Pressable>
              ) : (
                planCard
              )}
            </View>
          );
        })()}

        {/* Company settings (super admin only) */}
        {isSuperAdmin ? (
          <Pressable className="mt-3" onPress={() => router.push('/(app)/company')}>
            <Card>
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                  <Building size={20} color={palette.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    {company?.name ?? 'Şirket Ayarları'}
                  </Text>
                  <Text className="text-sm text-muted">Şirket bilgileri, logo, para birimi</Text>
                </View>
                <ChevronRight size={20} color={palette.muted} />
              </View>
            </Card>
          </Pressable>
        ) : null}

        {/* User management (admins only; team is a Business feature) */}
        {isAdmin ? (
          <Pressable
            onPress={() =>
              router.push(entitlement.limits.team ? '/(app)/users' : '/(app)/paywall')
            }
            className="mt-3"
          >
            <Card>
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                  <Users size={20} color={palette.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Kullanıcı Yönetimi
                  </Text>
                  <Text className="text-sm text-muted">
                    {entitlement.limits.team
                      ? 'Kullanıcı ekle, rol ve durum yönet'
                      : 'Ekip yönetimi Business planına dahildir'}
                  </Text>
                </View>
                {entitlement.limits.team ? (
                  <ChevronRight size={20} color={palette.muted} />
                ) : (
                  <View className="rounded-full bg-primary-50 px-3 py-1">
                    <Text className="text-xs font-semibold text-primary-700">Business</Text>
                  </View>
                )}
              </View>
            </Card>
          </Pressable>
        ) : null}

        {/* Excel import (admins only) */}
        {isAdmin ? (
          <Pressable onPress={() => router.push('/(app)/excel-import')} className="mt-3">
            <Card>
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                  <FileSpreadsheet size={20} color={palette.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Excel Aktarımı
                  </Text>
                  <Text className="text-sm text-muted">
                    Güncel Excel'i yükle, sözleşmeleri otomatik güncelle
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
              <Text className="text-base text-foreground">{row.label}</Text>
              <Switch
                value={notifications[row.key]}
                onValueChange={() => toggleNotification(row.key)}
                trackColor={{ true: palette.primary, false: palette.border }}
              />
            </View>
          ))}
        </Card>

        {/* Custom reminder sound — admin only */}
        {isAdmin ? (
          <View className="mt-3">
            <Card>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-2 pr-3">
                  <Volume2 size={16} color={palette.primary} />
                  <View className="flex-1">
                    <Text className="text-base text-foreground">Kira günü bildirim sesi</Text>
                    <Text className="mt-0.5 text-xs text-muted">
                      Uygulama açıkken kira hatırlatması gelince özel ses çalar.
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

        {/* Legal */}
        <SectionHeader title="Yasal" />
        <Card>
          {LEGAL_LINKS.map((l, idx) => (
            <Pressable
              key={l.slug}
              onPress={() => router.push(`/yasal/${l.slug}` as Href)}
              className={`flex-row items-center gap-3 py-3 ${
                idx > 0 ? 'border-t border-border/60' : ''
              }`}
            >
              <ShieldCheck size={18} color={palette.muted} />
              <Text className="flex-1 text-base text-foreground">{l.title}</Text>
              <ChevronRight size={18} color={palette.muted} />
            </Pressable>
          ))}
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
