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
