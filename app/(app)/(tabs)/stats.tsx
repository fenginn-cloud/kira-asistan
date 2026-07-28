import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Clock, TrendingUp, Wallet } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { useStats } from '@/features/stats/useStats';
import { useScrollToTop } from '@/lib/scrollToTop';
import { formatCurrency, formatMonth } from '@/lib/utils/format';
import { palette } from '@/lib/theme/colors';

export default function StatsScreen() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const s = useStats(month);
  const scrollRef = useScrollToTop<ScrollView>('stats');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Text className="pt-2 text-2xl font-bold text-foreground">İstatistikler</Text>
        <Text className="mt-0.5 text-sm text-muted">
          {formatMonth(s.activeMonth)} dönemi
        </Text>

        {s.isLoading ? (
          <View className="mt-5 gap-3">
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : (
          <>
            {/* Ay seçici */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-4 -mx-5"
              contentContainerClassName="px-5 gap-2"
            >
              {s.months.map((m) => {
                const active = m.value === s.activeMonth;
                return (
                  <Pressable
                    key={m.value}
                    onPress={() => setMonth(m.value)}
                    className={`rounded-full border px-4 py-2 ${
                      active
                        ? 'border-primary bg-primary'
                        : 'border-border/70 bg-surface'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        active ? 'text-white' : 'text-muted'
                      }`}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Seçili ay özeti */}
            <View className="mt-4 gap-3">
              <View className="flex-row gap-3">
                <StatCard
                  label="Tahakkuk Eden"
                  value={formatCurrency(s.due)}
                  icon={TrendingUp}
                  tone="primary"
                />
                <StatCard
                  label="Tahsil Edilen"
                  value={formatCurrency(s.collected)}
                  icon={CheckCircle2}
                  tone="success"
                />
              </View>
              <View className="flex-row gap-3">
                <StatCard
                  label="Bekleyen"
                  value={formatCurrency(s.pending)}
                  icon={Clock}
                  tone="warning"
                />
                <StatCard
                  label="Geciken"
                  value={formatCurrency(s.overdue)}
                  icon={Wallet}
                  tone="danger"
                />
              </View>
            </View>

            {/* Tahsilat oranı */}
            <SectionHeader title="Tahsilat Oranı" />
            <Card>
              <View className="items-center py-2">
                <DonutChart
                  percentage={s.collectionRate}
                  color={palette.success}
                  label="tahsil"
                />
                <Text className="mt-3 text-center text-sm text-muted">
                  {s.totalContracts} sözleşmenin {s.paidContracts} tanesi ödendi ·{' '}
                  {formatCurrency(s.collected)} / {formatCurrency(s.due)}
                </Text>
              </View>
            </Card>

            {/* Bina bazlı ay detayı */}
            <SectionHeader title="Bina Bazlı Tahsilat" />
            <Card>
              {s.byBuilding.length === 0 ? (
                <Text className="text-sm text-muted">Bu ay için kayıt yok</Text>
              ) : (
                <View className="gap-3">
                  {s.byBuilding.map((b, i) => {
                    const pct = b.due > 0 ? Math.round((b.collected / b.due) * 100) : 0;
                    return (
                      <View
                        key={b.building}
                        className={i > 0 ? 'border-t border-border/60 pt-3' : ''}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text
                            className="flex-1 pr-2 text-sm font-semibold text-foreground"
                            numberOfLines={1}
                          >
                            {b.building}
                            <Text className="text-xs font-normal text-muted">
                              {'  '}
                              {b.paidUnits}/{b.totalUnits} daire
                            </Text>
                          </Text>
                          <Text className="text-sm font-bold text-success">
                            %{pct}
                          </Text>
                        </View>
                        <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
                          <View
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(2, pct)}%` }}
                          />
                        </View>
                        <View className="mt-1.5 flex-row items-center justify-between">
                          <Text className="text-xs text-success">
                            {formatCurrency(b.collected)} tahsil
                          </Text>
                          {b.overdue > 0 ? (
                            <Text className="text-xs text-danger">
                              {formatCurrency(b.overdue)} geciken
                            </Text>
                          ) : b.pending > 0 ? (
                            <Text className="text-xs text-warning">
                              {formatCurrency(b.pending)} bekleyen
                            </Text>
                          ) : (
                            <Text className="text-xs text-muted">Tamamlandı</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>

            {/* Son 6 ay trendi */}
            <SectionHeader title="Son 6 Ay Tahsilat" />
            <Card>
              <BarChart
                data={s.trend}
                color={palette.primary}
                formatValue={formatCurrency}
              />
            </Card>

            {/* Genel bilgiler */}
            <SectionHeader title="Genel" />
            <Card>
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted">Aktif sözleşme</Text>
                  <Text className="text-base font-bold text-foreground">
                    {s.activeContractCount}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between border-t border-border/60 pt-3">
                  <Text className="text-sm text-muted">Beklenen aylık gelir</Text>
                  <Text className="text-base font-bold text-foreground">
                    {formatCurrency(s.expectedMonthlyIncome)}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between border-t border-border/60 pt-3">
                  <Text className="text-sm text-muted">Toplam depozito</Text>
                  <Text className="text-base font-bold text-foreground">
                    {formatCurrency(s.portfolioValue)}
                  </Text>
                </View>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
