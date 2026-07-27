import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Briefcase, FileText, TrendingUp, Wallet } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { useStats } from '@/features/stats/useStats';
import { useScrollToTop } from '@/lib/scrollToTop';
import { formatCurrency } from '@/lib/utils/format';
import { palette } from '@/lib/theme/colors';

export default function StatsScreen() {
  const s = useStats();
  const scrollRef = useScrollToTop<ScrollView>('stats');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Text className="pt-2 text-2xl font-bold text-foreground">İstatistikler</Text>

        {s.isLoading ? (
          <View className="mt-5 gap-3">
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : (
          <>
            <View className="mt-5 gap-3">
              <View className="flex-row gap-3">
                <StatCard
                  label="Toplam Portföy"
                  value={formatCurrency(s.portfolioValue)}
                  icon={Briefcase}
                  tone="primary"
                />
                <StatCard
                  label="Aylık Kira Geliri"
                  value={formatCurrency(s.monthlyRentIncome)}
                  icon={TrendingUp}
                  tone="success"
                />
              </View>
              <View className="flex-row gap-3">
                <StatCard
                  label="Bekleyen Tahsilat"
                  value={formatCurrency(s.pendingCollection)}
                  icon={Wallet}
                  tone="warning"
                />
                <StatCard
                  label="Geciken Tahsilat"
                  value={formatCurrency(s.overdueCollectionTotal)}
                  icon={FileText}
                  tone="danger"
                />
              </View>
            </View>

            <SectionHeader title="Bina Bazlı Tahsilat" />
            <Card>
              {s.byBuilding.length === 0 ? (
                <Text className="text-sm text-muted">Kayıt yok</Text>
              ) : (
                <View className="gap-3">
                  {s.byBuilding.map((b, i) => {
                    const max = s.byBuilding[0]?.collected || 1;
                    const pct = Math.max(2, Math.round((b.collected / max) * 100));
                    return (
                      <View key={b.building} className={i > 0 ? 'border-t border-border/60 pt-3' : ''}>
                        <View className="flex-row items-center justify-between">
                          <Text className="flex-1 pr-2 text-sm font-semibold text-foreground" numberOfLines={1}>
                            {b.building}
                            <Text className="text-xs font-normal text-muted">  ({b.contracts})</Text>
                          </Text>
                          <Text className="text-sm font-bold text-success">
                            {formatCurrency(b.collected)}
                          </Text>
                        </View>
                        <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
                          <View
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>

            <SectionHeader title="Aylık Tahsilat" />
            <Card>
              <BarChart
                data={s.monthlyCollection}
                color={palette.primary}
                formatValue={formatCurrency}
              />
            </Card>

            <SectionHeader title="Geciken Tahsilatlar" />
            <Card>
              <BarChart
                data={s.overdueCollection}
                color={palette.danger}
                formatValue={formatCurrency}
              />
            </Card>

            <SectionHeader title="Tahsilat Başarı Oranı" />
            <Card>
              <View className="items-center py-2">
                <DonutChart
                  percentage={s.successRate}
                  color={palette.success}
                  label="başarı"
                />
                <Text className="mt-3 text-center text-sm text-muted">
                  Tahakkuk eden tutarın {Math.round(s.successRate)}%'i tahsil edildi.
                </Text>
              </View>
            </Card>

            <SectionHeader title="Aktif Sözleşmeler" />
            <Card>
              <View className="flex-row items-center justify-between">
                <Text className="text-base text-muted">Toplam aktif sözleşme</Text>
                <Text className="text-3xl font-bold text-primary-700">
                  {s.activeContractCount}
                </Text>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
