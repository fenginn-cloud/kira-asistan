import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, Crown } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useContracts } from '@/features/contracts/hooks';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { PLAN_LABELS } from '@/features/subscription/entitlement';
import { palette } from '@/lib/theme/colors';

/** Plan ayrıntıları: kota, dahil özellikler, yükseltme. (Ayarlar → plan satırı) */
export default function PlanScreen() {
  const router = useRouter();
  const entitlement = useEntitlement();
  const { data: contracts = [] } = useContracts();
  const count = contracts.length;
  const max = entitlement.limits.maxContracts;
  const pct = max && max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 100;
  const canUpgrade = !entitlement.isLegacy && entitlement.plan !== 'business';

  const features: { label: string; on: boolean }[] = [
    { label: 'Otomatik ödeme hatırlatmaları', on: true },
    {
      label: '7 / 3 / 1 gün önceden hatırlatma',
      on: entitlement.limits.advanceReminders,
    },
    { label: 'Excel ile toplu aktarım', on: entitlement.limits.excel },
    { label: 'Finansal analiz ve raporlar', on: entitlement.limits.stats },
    { label: 'AI asistan', on: entitlement.limits.ai },
    {
      label: `Ekip yönetimi${entitlement.limits.team && entitlement.limits.maxUsers ? ` (${entitlement.limits.maxUsers} kullanıcı)` : ''}`,
      on: entitlement.limits.team,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Planım" />

        <View className="mt-5">
          <Card>
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                <Crown size={20} color={palette.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground">
                  {PLAN_LABELS[entitlement.plan]} Plan
                </Text>
                <Text className="text-xs text-muted">
                  {entitlement.isLegacy
                    ? 'Erken kullanıcı — ömür boyu ücretsiz'
                    : 'Aktif abonelik'}
                </Text>
              </View>
            </View>

            <View className="mt-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Sözleşme kotası</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {max === null ? `${count} · Sınırsız` : `${count} / ${max}`}
                </Text>
              </View>
              <View className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                <View
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </View>
            </View>
          </Card>
        </View>

        <Text className="mb-2 ml-1 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
          Planınıza dahil
        </Text>
        <Card>
          <View className="gap-3">
            {features.map((f) => (
              <View key={f.label} className="flex-row items-center gap-2.5">
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

        {canUpgrade ? (
          <Pressable
            onPress={() => router.push('/(app)/paywall')}
            className="mt-6 h-12 items-center justify-center rounded-2xl bg-primary active:opacity-80"
          >
            <Text className="text-base font-semibold text-white">Planı yükselt</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
