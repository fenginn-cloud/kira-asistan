import { useState } from 'react';
import { Text, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Crown, Minus } from 'lucide-react-native';
import { fgColor } from '@/lib/theme/useThemeColors';
import { Card } from '@/components/ui/Card';
import { palette } from '@/lib/theme/colors';
import { formatCurrency } from '@/lib/utils/format';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { UPGRADE_PLANS, FEATURE_MATRIX, type FeatureRow } from '@/features/subscription/plans';

function Cell({ value }: { value: FeatureRow['free'] }) {
  if (value === true) return <Check size={16} color={palette.primary} />;
  if (value === false) return <Minus size={16} color="#9CA3AF" />;
  return <Text className="text-xs font-medium text-foreground">{value}</Text>;
}

export default function PaywallScreen() {
  const router = useRouter();
  const entitlement = useEntitlement();
  const [showTable, setShowTable] = useState(false);

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

        {/* Tüm özellikleri gör — karşılaştırma tablosu */}
        <Pressable
          onPress={() => setShowTable((v) => !v)}
          className="mt-6 flex-row items-center justify-center gap-1 py-2"
        >
          <Text className="text-sm font-semibold text-primary-700">
            {showTable ? 'Karşılaştırmayı gizle' : 'Tüm özellikleri gör'}
          </Text>
          {showTable ? (
            <ChevronUp size={18} color={palette.primary} />
          ) : (
            <ChevronDown size={18} color={palette.primary} />
          )}
        </Pressable>

        {showTable ? (
          <Card>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Başlık satırı */}
                <View className="flex-row border-b border-border pb-2">
                  <Text className="w-48 text-xs font-semibold text-muted">Özellik</Text>
                  <Text className="w-20 text-center text-xs font-semibold text-muted">Free</Text>
                  <Text className="w-20 text-center text-xs font-semibold text-muted">Pro</Text>
                  <Text className="w-24 text-center text-xs font-semibold text-primary-700">
                    Business
                  </Text>
                </View>
                {FEATURE_MATRIX.map((row) => (
                  <View
                    key={row.label}
                    className="flex-row items-center border-b border-border/50 py-2"
                  >
                    <Text className="w-48 pr-2 text-xs text-foreground">{row.label}</Text>
                    <View className="w-20 items-center">
                      <Cell value={row.free} />
                    </View>
                    <View className="w-20 items-center">
                      <Cell value={row.pro} />
                    </View>
                    <View className="w-24 items-center">
                      <Cell value={row.business} />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Card>
        ) : null}

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
