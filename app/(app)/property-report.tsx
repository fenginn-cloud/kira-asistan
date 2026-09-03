import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Lock,
  Percent,
  Wallet,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePropertyReport } from '@/features/stats/usePropertyReport';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { formatCurrency } from '@/lib/utils/format';
import { fgColor } from '@/lib/theme/useThemeColors';
import { palette } from '@/lib/theme/colors';

export default function PropertyReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const building = (params.name ?? '').toString();
  const entitlement = useEntitlement();
  const allowed = entitlement.limits.stats;

  const report = usePropertyReport(building, allowed);
  const [index, setIndex] = useState(0); // 0 = en yeni ay

  const months = report?.months ?? [];
  const active = months[index];

  // ↑ hooks her render'da çağrılmalı; erken return'ler bundan sonra.
  const historyRows = useMemo(() => months.slice(0, 12), [months]);

  // Free plan: kilitli tanıtım (hesap yapılmaz).
  if (!allowed) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <Header building={building} onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary">
            <BarChart3 size={36} color="#FFFFFF" />
          </View>
          <View className="mt-5 flex-row items-center gap-2">
            <Lock size={16} color="#9CA3AF" />
            <Text className="text-lg font-bold text-foreground">Gelişmiş Raporlar</Text>
          </View>
          <Text className="mt-2 text-center text-sm text-muted">
            Aylık tahsilat, doluluk, kiralama ve komisyon performansınızı görüntülemek için
            Pro veya Business plana geçin.
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/paywall?feature=reports')}
            className="mt-6 rounded-2xl bg-primary px-6 py-3 active:opacity-80"
          >
            <Text className="text-base font-semibold text-white">Planları Gör</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Header building={building} onBack={() => router.back()} />
      <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
        {!active ? (
          <EmptyState
            icon={Building2}
            title="Kayıt bulunamadı"
            description="Bu mülke ait sözleşme/ödeme kaydı yok."
          />
        ) : (
          <>
            {/* Ay geçişi: ← önceki | Ay | sonraki → */}
            <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-border bg-surface p-2">
              <NavBtn
                icon={ChevronLeft}
                disabled={index >= months.length - 1}
                onPress={() => setIndex((i) => Math.min(months.length - 1, i + 1))}
              />
              <Text className="text-base font-bold text-foreground">{active.long}</Text>
              <NavBtn
                icon={ChevronRight}
                disabled={index <= 0}
                onPress={() => setIndex((i) => Math.max(0, i - 1))}
              />
            </View>

            {/* Doluluk özet kartı */}
            <SectionHeader title="Doluluk" />
            <Card>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-extrabold text-foreground">
                    {active.occupied} / {active.totalUnits}
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted">daire dolu</Text>
                </View>
                <View className="items-end">
                  <Text className="text-2xl font-extrabold text-primary-700">
                    %{Math.round(active.occupancyRate)}
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted">doluluk</Text>
                </View>
                <View className="items-end">
                  <Text className="text-2xl font-extrabold text-warning">{active.vacant}</Text>
                  <Text className="mt-0.5 text-xs text-muted">boş daire</Text>
                </View>
              </View>
              {!report?.hasUnitTotal ? (
                <Pressable
                  onPress={() => router.push('/(app)/building-units')}
                  className="mt-3 border-t border-border/60 pt-2.5 active:opacity-70"
                >
                  <Text className="text-center text-xs font-medium text-primary-700">
                    Toplam daire sayısı tanımlı değil — düzenle
                  </Text>
                </Pressable>
              ) : null}
            </Card>

            {/* Performans kartları */}
            <SectionHeader title="Performans" />
            <View className="gap-3">
              <View className="flex-row gap-3">
                <StatCard
                  label="Tahsil Edilen"
                  value={formatCurrency(active.collected)}
                  icon={CheckCircle2}
                  tone="success"
                />
                <StatCard
                  label="Beklenen Tahsilat"
                  value={formatCurrency(active.expected)}
                  icon={Wallet}
                  tone="primary"
                />
              </View>
              <View className="flex-row gap-3">
                <StatCard
                  label="Tahsilat Oranı"
                  value={`%${Math.round(active.collectionRate)}`}
                  icon={Percent}
                  tone="warning"
                />
                <StatCard
                  label="Yeni Kiralama"
                  value={`${active.newRentals}`}
                  icon={KeyRound}
                  tone="primary"
                />
              </View>
              <StatCard
                label="Komisyon"
                value={formatCurrency(active.commission)}
                icon={Building2}
                tone="success"
              />
            </View>

            {/* Aylık geçmiş performans */}
            <SectionHeader title="Aylık Performans" />
            <Card>
              {historyRows.map((m, i) => {
                const selected = m.key === active.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setIndex(months.findIndex((x) => x.key === m.key))}
                    className={`flex-row items-center justify-between py-3 ${
                      i > 0 ? 'border-t border-border/60' : ''
                    } ${selected ? '' : 'active:opacity-70'}`}
                  >
                    <View className="flex-1 pr-2">
                      <Text
                        className={`text-sm font-semibold ${
                          selected ? 'text-primary-700' : 'text-foreground'
                        }`}
                        numberOfLines={1}
                      >
                        {m.long}
                      </Text>
                      <Text className="mt-0.5 text-xs text-muted">
                        {m.newRentals} yeni kiralama · komisyon {formatCurrency(m.commission)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                        {formatCurrency(m.collected)}
                      </Text>
                      <Text
                        className={`mt-0.5 text-xs font-semibold ${
                          m.collectionRate >= 95
                            ? 'text-success'
                            : m.collectionRate >= 80
                              ? 'text-warning'
                              : 'text-danger'
                        }`}
                      >
                        %{Math.round(m.collectionRate)} tahsilat
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ building, onBack }: { building: string; onBack: () => void }) {
  return (
    <View className="flex-row items-center gap-3 px-5 pb-1 pt-2">
      <Pressable
        onPress={onBack}
        className="h-9 w-9 items-center justify-center rounded-full bg-surface"
      >
        <ArrowLeft size={20} color={fgColor()} />
      </Pressable>
      <View className="flex-1">
        <Text className="text-xl font-bold text-foreground" numberOfLines={1}>
          {building || 'Mülk'}
        </Text>
        <Text className="text-xs text-muted">Performans Raporu</Text>
      </View>
    </View>
  );
}

function NavBtn({
  icon: Icon,
  disabled,
  onPress,
}: {
  icon: typeof ChevronLeft;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      className={`h-10 w-10 items-center justify-center rounded-xl ${
        disabled ? 'opacity-30' : 'active:opacity-70'
      }`}
    >
      <Icon size={22} color={palette.primary} />
    </Pressable>
  );
}
