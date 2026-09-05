import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import {
  BadgeCheck,
  BellRing,
  Building,
  Check,
  ChevronRight,
  ClipboardList,
  Crown,
  LogOut,
  Mail,
  Moon,
  FileSpreadsheet,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import { LEGAL_LINKS, SUPPORT_EMAIL } from '@/content/legal';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useCompany } from '@/features/users/hooks';
import { useContracts } from '@/features/contracts/hooks';
import { useStats } from '@/features/stats/useStats';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { PLAN_LABELS } from '@/features/subscription/entitlement';
import { useScrollToTop } from '@/lib/scrollToTop';
import { formatCurrency } from '@/lib/utils/format';
import type { ThemePreference } from '@/types';
import { palette } from '@/lib/theme/colors';

const THEMES: { key: ThemePreference; label: string }[] = [
  { key: 'light', label: 'Açık' },
  { key: 'dark', label: 'Koyu' },
  { key: 'system', label: 'Sistem' },
];

/** Bölüm başlığı — küçük, büyük harf, premium his. */
function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 ml-1 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </Text>
  );
}

/** İkon kutulu, tıklanabilir ayar satırı (sağda chevron ya da rozet). */
function NavCard({
  icon: Icon,
  title,
  subtitle,
  badge,
  onPress,
}: {
  icon: typeof Users;
  title: string;
  subtitle: string;
  badge?: string;
  onPress?: () => void;
}) {
  const body = (
    <Card>
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
          <Icon size={20} color={palette.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">{title}</Text>
          <Text className="text-sm text-muted" numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        {badge ? (
          <View className="rounded-full bg-primary-50 px-3 py-1">
            <Text className="text-xs font-semibold text-primary-700">{badge}</Text>
          </View>
        ) : onPress ? (
          <ChevronRight size={20} color={palette.muted} />
        ) : null}
      </View>
    </Card>
  );
  return onPress ? (
    <Pressable className="mt-3" onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    <View className="mt-3">{body}</View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTop<ScrollView>('settings');
  const { user, signOut } = useAuthStore();
  const { theme, setTheme } = useSettingsStore();
  const { data: company } = useCompany();
  const { data: contracts = [] } = useContracts();
  const entitlement = useEntitlement();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const canUpgrade = !entitlement.isLegacy && entitlement.plan !== 'business';

  // Profil başlığındaki 3 metrik + plan kotası yalnızca yönetici için (finansal).
  const stats = useStats();
  const occupancyPct =
    stats.unitTotal > 0 ? Math.round((stats.occupiedTotal / stats.unitTotal) * 100) : null;
  const contractCount = contracts.length;
  const maxContracts = entitlement.limits.maxContracts;
  const quotaPct =
    maxContracts && maxContracts > 0
      ? Math.min(100, Math.round((contractCount / maxContracts) * 100))
      : null;

  const planFeatures: { label: string; on: boolean }[] = [
    { label: 'Otomatik Ödeme Hatırlatmaları', on: true },
    { label: 'Excel & Toplu Aktarım', on: entitlement.limits.excel },
    { label: 'Finansal Analiz & Raporlar', on: entitlement.limits.stats },
    { label: 'Ekip & Kullanıcı Yönetimi', on: entitlement.limits.team },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Text className="pt-2 text-2xl font-bold text-foreground">Profil</Text>

        {/* Profil başlığı (Stitch) — avatar + ad + rol/plan/şirket rozetleri */}
        <Pressable className="mt-5" onPress={() => router.push('/(app)/profile')}>
          <Card>
            <View className="flex-row items-center gap-4">
              <Avatar name={user?.fullName ?? 'K'} size={60} />
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
                  {user?.fullName}
                </Text>
                <Text className="text-sm text-muted" numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
              <ChevronRight size={18} color={palette.muted} />
            </View>
            <View className="mt-3 flex-row items-center gap-1.5">
              <BadgeCheck size={15} color={palette.primary} />
              <Text className="text-xs font-semibold text-primary-700">
                {user?.role === 'admin'
                  ? 'Yönetici (Admin)'
                  : user?.role === 'super_admin'
                    ? 'Süper Admin'
                    : 'Personel'}
              </Text>
              {company?.name ? (
                <Text className="text-xs text-muted" numberOfLines={1}>
                  · {company.name}
                </Text>
              ) : null}
            </View>

            {/* 3 metrik (Stitch) — Aktif Mülk / Doluluk / Aylık Kira. Finansal
                olduğundan yalnızca yöneticide + Pro/Business açıkken gösterilir. */}
            {isAdmin && entitlement.limits.stats ? (
              <View className="mt-4 flex-row border-t border-border/60 pt-3">
                <View className="flex-1 items-center">
                  <Text className="text-lg font-extrabold text-foreground">
                    {stats.occupiedTotal || stats.activeContractCount}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-muted">Aktif Mülk</Text>
                </View>
                <View className="w-px bg-border/60" />
                <View className="flex-1 items-center">
                  <Text className="text-lg font-extrabold text-foreground">
                    {occupancyPct !== null ? `%${occupancyPct}` : '—'}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-muted">Doluluk</Text>
                </View>
                <View className="w-px bg-border/60" />
                <View className="flex-1 items-center">
                  <Text className="text-lg font-extrabold text-foreground" numberOfLines={1}>
                    {formatCurrency(stats.expectedMonthlyIncome)}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-muted">Aylık Kira</Text>
                </View>
              </View>
            ) : null}
          </Card>
        </Pressable>

        {/* HESAP */}
        <SectionLabel>Hesap</SectionLabel>

        {/* Plan kartı (Stitch) — kota çubuğu + özellik listesi */}
        <View className="mt-3">
          <Card>
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                <Crown size={20} color={palette.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground">
                  {PLAN_LABELS[entitlement.plan]} Plan
                </Text>
                <Text className="text-xs text-muted">
                  {entitlement.isLegacy
                    ? 'Erken kullanıcı — ömür boyu ücretsiz'
                    : 'Aktif abonelik'}
                </Text>
              </View>
              {entitlement.isLegacy ? (
                <View className="rounded-full bg-success-soft px-3 py-1">
                  <Text className="text-xs font-semibold text-success">Legacy</Text>
                </View>
              ) : canUpgrade ? (
                <Pressable
                  onPress={() => router.push('/(app)/paywall')}
                  className="rounded-full bg-primary px-3.5 py-1.5 active:opacity-80"
                >
                  <Text className="text-xs font-semibold text-white">Yükselt</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Sözleşme kotası */}
            <View className="mt-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-medium text-muted">Sözleşme Kotası</Text>
                <Text className="text-xs font-semibold text-foreground">
                  {maxContracts === null
                    ? `${contractCount} · Sınırsız`
                    : `${contractCount} / ${maxContracts}`}
                </Text>
              </View>
              <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-background">
                <View
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${quotaPct ?? 100}%` }}
                />
              </View>
            </View>

            {/* Özellik listesi */}
            <View className="mt-4 gap-2 border-t border-border/60 pt-3">
              {planFeatures.map((f) => (
                <View key={f.label} className="flex-row items-center gap-2">
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full ${
                      f.on ? 'bg-success-soft' : 'bg-background'
                    }`}
                  >
                    <Check size={12} color={f.on ? palette.success : palette.muted} />
                  </View>
                  <Text
                    className={`text-sm ${f.on ? 'text-foreground' : 'text-muted line-through'}`}
                  >
                    {f.label}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* Şirket (yalnızca süper admin) */}
        {isSuperAdmin ? (
          <NavCard
            icon={Building}
            title={company?.name ?? 'Şirket Ayarları'}
            subtitle="Şirket bilgileri, logo, para birimi"
            onPress={() => router.push('/(app)/company')}
          />
        ) : null}

        {/* Kullanıcı yönetimi (yönetici; Business özelliği) */}
        {isAdmin ? (
          <NavCard
            icon={Users}
            title="Kullanıcı Yönetimi"
            subtitle={
              entitlement.limits.team
                ? 'Kullanıcı ekle, rol ve durum yönet'
                : 'Ekibinizi ekleyin — Business planına dahil'
            }
            badge={entitlement.limits.team ? undefined : 'Business'}
            onPress={() =>
              router.push(entitlement.limits.team ? '/(app)/users' : '/(app)/paywall?feature=team')
            }
          />
        ) : null}

        {/* Excel aktarımı (yönetici; Pro/Business) */}
        {isAdmin ? (
          <NavCard
            icon={FileSpreadsheet}
            title="Excel Aktarımı"
            subtitle="Tek tıkla tüm sözleşmelerini içeri aktar"
            badge={entitlement.limits.excel ? undefined : 'Pro'}
            onPress={() =>
              router.push(
                entitlement.limits.excel ? '/(app)/excel-import' : '/(app)/paywall?feature=excel'
              )
            }
          />
        ) : null}

        {/* Kiracı bilgi formları (tüm planlar, tüm roller) */}
        <NavCard
          icon={ClipboardList}
          title="Kiracı Formları"
          subtitle="Kiracı adayına doldurması için güvenli bilgi formu gönder"
          onPress={() => router.push('/(app)/tenant-forms')}
        />

        {/* Hatırlatma bildirimleri (ayrı ekran) */}
        <NavCard
          icon={BellRing}
          title="Hatırlatma Bildirimleri"
          subtitle="7 / 3 / 1 gün, ödeme günü, gecikme ve ses"
          onPress={() => router.push('/(app)/notification-settings')}
        />

        {/* UYGULAMA */}
        <SectionLabel>Uygulama</SectionLabel>
        <View className="mt-3">
          <Card>
            <View className="flex-row items-center gap-2">
              <Moon size={16} color={palette.primary} />
              <Text className="mb-1 text-sm font-medium text-muted">Görünüm (Tema)</Text>
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
                      className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted'}`}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>

        {/* DESTEK */}
        <SectionLabel>Destek</SectionLabel>
        <NavCard
          icon={Mail}
          title="Destek / İletişim"
          subtitle={SUPPORT_EMAIL}
          onPress={() =>
            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Kira Asistan destek')}`
            )
          }
        />
        <View className="mt-3">
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
        </View>

        {/* Çıkış */}
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
              <Text className="text-base font-semibold text-danger">Çıkış Yap</Text>
            </View>
          </Card>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
