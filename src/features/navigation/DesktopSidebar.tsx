import { Pressable, ScrollView, Text, View } from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import {
  BarChart3,
  Building2,
  FileText,
  Home,
  Plus,
  User,
} from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';
import { useContractGate } from '@/features/subscription/useContractGate';
import { palette } from '@/lib/theme/colors';

type IconType = typeof Home;

interface NavItem {
  key: string;
  label: string;
  href: Href;
  icon: IconType;
  /** Aktif kabul edilecek yol öneki (index dışında). */
  match: (pathname: string) => boolean;
}

const NAV: NavItem[] = [
  {
    key: 'index',
    label: 'Ana Sayfa',
    href: '/',
    icon: Home,
    match: (p) => p === '/',
  },
  {
    key: 'contracts',
    label: 'Sözleşmeler',
    href: '/contracts',
    icon: FileText,
    match: (p) => p.startsWith('/contracts'),
  },
  {
    key: 'properties',
    label: 'Mülkler',
    href: '/properties',
    icon: Building2,
    match: (p) => p.startsWith('/properties'),
  },
  {
    key: 'stats',
    label: 'Analiz',
    href: '/stats',
    icon: BarChart3,
    match: (p) => p.startsWith('/stats'),
  },
  {
    key: 'settings',
    label: 'Profil',
    href: '/settings',
    icon: User,
    match: (p) => p.startsWith('/settings'),
  },
];

/**
 * Geniş ekran (masaüstü/tablet) için kalıcı sol gezinme çubuğu — yalnızca
 * yönetici profillerinde gösterilir. Uygulamanın tasarım dilini korur
 * (surface yüzey, primary vurgu, yumuşak köşeler).
 */
export function DesktopSidebar({ width }: { width: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const gate = useContractGate();

  const roleLabel =
    user?.role === 'super_admin' ? 'Süper Admin' : 'Yönetici';

  return (
    <View
      // Sabit (fixed) sol menü: uygulama akışının dışında durur, bu yüzden
      // gezinme yapısını (navigator) bozmaz. İçerik contentStyle ile itilir.
      style={{
        position: 'fixed' as unknown as 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width,
        zIndex: 50,
      }}
      className="border-r border-border bg-surface"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-5 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Marka */}
        <View className="mb-6 flex-row items-center gap-3 px-2">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary">
            <Text className="text-lg font-black text-white">K</Text>
          </View>
          <View>
            <Text className="text-base font-bold text-foreground">Kira Asistan</Text>
            <Text className="text-xs text-muted">Kira takip paneli</Text>
          </View>
        </View>

        {/* Hızlı eylem */}
        <Pressable
          onPress={() =>
            router.push(
              (gate.allowed ? '/(app)/contracts/new' : '/(app)/paywall') as Href,
            )
          }
          className="mb-5 flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-3 active:opacity-90"
        >
          <Plus size={18} color="#FFFFFF" />
          <Text className="text-sm font-semibold text-white">Yeni Sözleşme</Text>
        </Pressable>

        {/* Gezinme */}
        <View className="gap-1">
          {NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Pressable
                key={item.key}
                onPress={() => router.push(item.href)}
                className={`flex-row items-center gap-3 rounded-2xl px-3 py-3 active:opacity-80 ${
                  active ? 'bg-primary-50' : ''
                }`}
              >
                <Icon
                  size={20}
                  color={active ? palette.primary : palette.muted}
                />
                <Text
                  className={`text-[15px] ${
                    active
                      ? 'font-semibold text-primary-700'
                      : 'font-medium text-foreground'
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Kullanıcı kimliği */}
      <Pressable
        onPress={() => router.push('/(app)/profile' as Href)}
        className="flex-row items-center gap-3 border-t border-border px-5 py-4 active:opacity-80"
      >
        <Avatar name={user?.fullName ?? 'K'} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {user?.fullName ?? 'Kullanıcı'}
          </Text>
          <Text className="text-xs text-muted">{roleLabel}</Text>
        </View>
      </Pressable>
    </View>
  );
}
