import { Text, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Crown } from 'lucide-react-native';
import { fgColor } from '@/lib/theme/useThemeColors';
import { Card } from '@/components/ui/Card';
import { palette } from '@/lib/theme/colors';
import { formatCurrency } from '@/lib/utils/format';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { UPGRADE_PLANS } from '@/features/subscription/plans';

export default function PaywallScreen() {
  const router = useRouter();
  const entitlement = useEntitlement();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 pt-2">
        <Pressable onPress={() => router.back()} className="h-10 w-10 justify-center">
          <ArrowLeft size={24} color={fgColor()} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-6 pb-10" showsVerticalScrollIndicator={false}>
        <View className="items-center">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary">
            <Crown size={30} color="#FFFFFF" />
          </View>
          <Text className="mt-4 text-center text-2xl font-bold text-foreground">
            {entitlement.plan === 'free'
              ? '3 sözleşme sınırına ulaştınız'
              : 'Planınızı yükseltin'}
          </Text>
          <Text className="mt-2 text-center text-sm text-muted">
            Portföyünüzü sınırsız yönetin. Size uygun planı seçin.
          </Text>
          {entitlement.plan === 'free' && !entitlement.isLegacy ? (
            <View className="mt-3 rounded-full bg-surface px-3 py-1">
              <Text className="text-xs text-muted">
                Mevcut planınız: Ücretsiz — 3 sözleşmeye kadar
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-6 gap-4">
          {UPGRADE_PLANS.map((p) => {
            const isCurrent = entitlement.plan === p.id;
            return (
              <View
                key={p.id}
                className={p.recommended ? 'rounded-3xl border-2 border-primary' : ''}
              >
                <Card>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-lg font-bold text-foreground">{p.name}</Text>
                        {p.recommended ? (
                          <View className="rounded-full bg-primary-50 px-2 py-0.5">
                            <Text className="text-[11px] font-semibold text-primary-700">
                              Önerilen
                            </Text>
                          </View>
                        ) : null}
                        {isCurrent ? (
                          <View className="rounded-full bg-success-soft px-2 py-0.5">
                            <Text className="text-[11px] font-semibold text-success">
                              Mevcut plan
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="mt-1 text-sm text-muted">{p.tagline}</Text>
                    </View>
                    {p.price ? (
                      <View className="items-end">
                        <Text className="text-lg font-bold text-foreground">
                          {formatCurrency(p.price.yearly)}
                          <Text className="text-sm font-normal text-muted">/yıl</Text>
                        </Text>
                        <Text className="text-xs text-muted">
                          ≈ {formatCurrency(p.price.monthlyEquivalent)}/ay
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View className="mt-3 gap-2">
                    {p.features.map((f) => (
                      <View key={f} className="flex-row items-center gap-2">
                        <Check size={16} color={palette.primary} />
                        <Text className="text-sm text-foreground">{f}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </View>
            );
          })}
        </View>

        <View className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <Text className="text-center text-sm text-muted">
            Fiyatlar yıllık faturalanır. Uygulama içi satın alma yakında etkinleştirilecek;
            şimdiden yükseltmek için bizimle iletişime geçebilirsiniz.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
