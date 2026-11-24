import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Building,
  ChevronRight,
  ClipboardList,
  Crown,
  FileSpreadsheet,
  LifeBuoy,
  LogOut,
  Settings,
  Users,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useCompany } from '@/features/users/hooks';
import { useContracts } from '@/features/contracts/hooks';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { PLAN_LABELS } from '@/features/subscription/entitlement';
import { useScrollToTop } from '@/lib/scrollToTop';
import { palette } from '@/lib/theme/colors';

const ROLE_LABEL = {
  super_admin: 'Süper Admin',
  admin: 'Yönetici',
  personnel: 'Personel',
} as const;

/**
 * Profil: sade bir menü. Ayrıntılar alt sayfalarda — Planım, Ayarlar (tema,
 * bildirimler, oturumlar), Destek (WhatsApp, e-posta, yasal).
 */
export default function SettingsScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTop<ScrollView>('settings');
  const { user, signOut } = useAuthStore();
  const avatarEmoji = useSettingsStore((s) => s.avatarEmoji);
  const { data: company } = useCompany();
  const { data: contracts = [] } = useContracts();
  const entitlement = useEntitlement();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const max = entitlement.limits.maxContracts;
  const quota =
    max === null
      ? `${contracts.length} sözleşme · Sınırsız`
      : `${contracts.length} / ${max} sözleşme`;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Text className="pt-2 text-2xl font-bold text-foreground">Ayarlar</Text>

        {/* Kişi */}
        <Pressable className="mt-5" onPress={() => router.push('/(app)/profile')}>
          <Card>
            <View className="flex-row items-center gap-3.5">
              <Avatar name={user?.fullName ?? 'K'} size={52} emoji={avatarEmoji} />
              <View className="flex-1">
                <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                  {user?.fullName}
                </Text>
                <Text className="text-sm text-muted" numberOfLines={1}>
                  {user?.email}
                </Text>
                <Text
                  className="mt-0.5 text-xs font-semibold text-primary-700"
                  numberOfLines={1}
                >
                  {user ? ROLE_LABEL[user.role] : ''}
                  {company?.name ? ` · ${company.name}` : ''}
                </Text>
              </View>
              <ChevronRight size={18} color={palette.muted} />
            </View>
          </Card>
        </Pressable>

        {/* Plan — tek satır; ayrıntı Planım sayfasında */}
        {isAdmin ? (
          <ListGroup>
            <ListRow
              first
              icon={Crown}
              title={`${PLAN_LABELS[entitlement.plan]} Plan`}
              subtitle={quota}
              badge={entitlement.isLegacy ? 'Legacy' : undefined}
              onPress={() => router.push('/(app)/plan')}
            />
          </ListGroup>
        ) : null}

        {/* Yönetim */}
        <ListGroup title="Yönetim">
          {isSuperAdmin ? (
            <ListRow
              first
              icon={Building}
              title="Şirket bilgileri"
              subtitle="Ad, logo, para birimi"
              onPress={() => router.push('/(app)/company')}
            />
          ) : null}
          {isAdmin ? (
            <ListRow
              first={!isSuperAdmin}
              icon={Users}
              title="Kullanıcı yönetimi"
              badge={entitlement.limits.team ? undefined : 'Business'}
              onPress={() =>
                router.push(
                  entitlement.limits.team ? '/(app)/users' : '/(app)/paywall?feature=team'
                )
              }
            />
          ) : null}
          {isAdmin ? (
            <ListRow
              icon={FileSpreadsheet}
              title="Excel aktarımı"
              badge={entitlement.limits.excel ? undefined : 'Pro'}
              onPress={() =>
                router.push(
                  entitlement.limits.excel
                    ? '/(app)/excel-import'
                    : '/(app)/paywall?feature=excel'
                )
              }
            />
          ) : null}
          <ListRow
            first={!isAdmin}
            icon={ClipboardList}
            title="Kiracı formları"
            onPress={() => router.push('/(app)/tenant-forms')}
          />
        </ListGroup>

        {/* Ayarlar + Destek */}
        <ListGroup>
          <ListRow
            first
            icon={Settings}
            title="Uygulama ayarları"
            subtitle="Tema, bildirimler, aktif oturumlar"
            onPress={() => router.push('/(app)/app-settings')}
          />
          <ListRow
            icon={LifeBuoy}
            title="Destek"
            subtitle="WhatsApp, e-posta, yasal metinler"
            onPress={() => router.push('/(app)/support')}
          />
        </ListGroup>

        <ListGroup>
          <ListRow
            first
            danger
            icon={LogOut}
            iconColor={palette.danger}
            iconBg="bg-danger-soft"
            title="Çıkış yap"
            onPress={() => {
              signOut();
              router.replace('/(auth)/login');
            }}
          />
        </ListGroup>
      </ScrollView>
    </SafeAreaView>
  );
}
