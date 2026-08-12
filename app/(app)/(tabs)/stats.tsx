import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { BarChart } from '@/components/charts/BarChart';
import { useStats } from '@/features/stats/useStats';
import { useScrollToTop } from '@/lib/scrollToTop';
import { formatCurrency } from '@/lib/utils/format';
import { palette } from '@/lib/theme/colors';

// Mavi hero üzerinde iyi okunan canlı tonlar.
const SEG = { collected: '#4ADE80', pending: '#FCD34D', overdue: '#F87171' };

function SegmentedBar({
  collected,
  pending,
  overdue,
  total,
}: {
  collected: number;
  pending: number;
  overdue: number;
  total: number;
}) {
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);
  return (
    <View className="h-2.5 flex-row overflow-hidden rounded-full bg-white/25">
      <View style={{ width: `${pct(collected)}%`, backgroundColor: SEG.collected }} />
      <View style={{ width: `${pct(pending)}%`, backgroundColor: SEG.pending }} />
      <View style={{ width: `${pct(overdue)}%`, backgroundColor: SEG.overdue }} />
    </View>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ backgroundColor: color }} className="h-2 w-2 rounded-full" />;
}

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

        {s.isLoading ? (
          <View className="mt-5 gap-3">
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : (
          <>
            {/* Ay seçici (Nisan → bu ay) */}
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
                      active ? 'border-primary bg-primary' : 'border-border/70 bg-surface'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        active ? 'text-white' : 'text-muted'
                      }`}
                    >
                      {m.short}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* HERO — seçili ayın tahsilat karnesi */}
            <View className="mt-4 overflow-hidden rounded-card bg-primary-600 p-5 shadow-sm shadow-black/10">
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-sm font-medium text-white/70">
                    {s.activeMonthLong}
                  </Text>
                  <Text className="mt-0.5 text-xs text-white/60">Tahsilat oranı</Text>
                </View>
                {s.momDeltaPct !== null ? (
                  <View className="flex-row items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
                    {s.momDeltaPct >= 0 ? (
                      <TrendingUp size={13} color="#4ADE80" />
                    ) : (
                      <TrendingDown size={13} color="#F87171" />
                    )}
                    <Text className="text-xs font-semibold text-white">
                      {s.momDeltaPct >= 0 ? '+' : ''}
                      {Math.round(s.momDeltaPct)}%
                    </Text>
                    <Text className="text-[10px] text-white/60">geçen aya göre</Text>
                  </View>
                ) : null}
              </View>

              <View className="mt-3 flex-row items-end justify-between">
                <Text className="text-5xl font-extrabold text-white">
                  {Math.round(s.collectionRate)}
                  <Text className="text-2xl font-bold text-white/70">%</Text>
                </Text>
                <View className="items-end pb-1">
                  <Text className="text-base font-bold text-white">
                    {formatCurrency(s.collected)}
                  </Text>
                  <Text className="text-xs text-white/60">
                    / {formatCurrency(s.due)} tahakkuk
                  </Text>
                </View>
              </View>

              <View className="mt-4">
                <SegmentedBar
                  collected={s.collected}
                  pending={s.pending}
                  overdue={s.overdue}
                  total={s.due}
                />
              </View>

              <View className="mt-3 flex-row justify-between">
                <View className="flex-row items-center gap-1.5">
                  <Dot color={SEG.collected} />
                  <Text className="text-xs text-white/80">
                    Tahsil {formatCurrency(s.collected)}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Dot color={SEG.pending} />
                  <Text className="text-xs text-white/80">
                    Bekleyen {formatCurrency(s.pending)}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Dot color={SEG.overdue} />
                  <Text className="text-xs text-white/80">
                    Geciken {formatCurrency(s.overdue)}
                  </Text>
                </View>
              </View>

              <View className="mt-4 border-t border-white/15 pt-3">
                <Text className="text-center text-xs text-white/70">
                  {s.totalContracts} sözleşmenin{' '}
                  <Text className="font-bold text-white">{s.paidContracts}</Text> tanesi ödendi
                </Text>
              </View>
            </View>

            {/* Bina bazlı ay detayı — sorunlular üstte */}
            <SectionHeader title="Bina Bazlı Tahsilat" />
            <Card>
              {s.byBuilding.length === 0 ? (
                <Text className="py-2 text-center text-sm text-muted">
                  {s.activeMonthLong} için henüz kayıt yok
                </Text>
              ) : (
                <View className="gap-3.5">
                  {s.byBuilding.map((b, i) => (
                    <View
                      key={b.building}
                      className={i > 0 ? 'border-t border-border/60 pt-3.5' : ''}
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
                        <Text
                          className={`text-sm font-bold ${
                            b.rate >= 95
                              ? 'text-success'
                              : b.overdue > 0
                                ? 'text-danger'
                                : 'text-warning'
                          }`}
                        >
                          %{Math.round(b.rate)}
                        </Text>
                      </View>
                      <View className="mt-1.5">
                        <SegmentedBarLight
                          collected={b.collected}
                          pending={b.pending}
                          overdue={b.overdue}
                          total={b.due}
                        />
                      </View>
                      <View className="mt-1.5 flex-row items-center justify-between">
                        <Text className="text-xs text-muted">
                          {formatCurrency(b.collected)} / {formatCurrency(b.due)}
                        </Text>
                        {b.overdue > 0 ? (
                          <Text className="text-xs font-medium text-danger">
                            {formatCurrency(b.overdue)} geciken
                          </Text>
                        ) : b.pending > 0 ? (
                          <Text className="text-xs font-medium text-warning">
                            {formatCurrency(b.pending)} bekleyen
                          </Text>
                        ) : (
                          <Text className="text-xs font-medium text-success">Tamamlandı ✓</Text>
                        )}
                      </View>
                      {b.commission > 0 ? (
                        <Text className="mt-1 text-xs font-semibold text-primary-700">
                          Komisyon: {formatCurrency(b.commission)}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {/* Trend — seçili ay vurgulu */}
            <SectionHeader title="Tahsilat Trendi" />
            <Card>
              <BarChart
                data={s.trend}
                color={palette.primary}
                formatValue={formatCurrency}
                activeIndex={s.trendActiveIndex}
              />
            </Card>

            {/* Komisyon — kiracı girişinde alınan bir kerelik gelir */}
            {s.commissionTotal > 0 ? (
              <>
                <SectionHeader title="Komisyon" />
                <Card>
                  <View className="flex-row">
                    <View className="flex-1 items-center">
                      <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
                        {formatCurrency(s.commissionThisMonth)}
                      </Text>
                      <Text className="mt-0.5 text-center text-[11px] text-muted">
                        {s.activeMonthLong} komisyon
                      </Text>
                    </View>
                    <View className="w-px bg-border/60" />
                    <View className="flex-1 items-center">
                      <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
                        {formatCurrency(s.commissionTotal)}
                      </Text>
                      <Text className="mt-0.5 text-center text-[11px] text-muted">
                        Toplam komisyon
                      </Text>
                    </View>
                  </View>
                </Card>
              </>
            ) : null}

            {/* Genel bilgiler — kompakt */}
            <SectionHeader title="Genel" />
            <Card>
              <View className="flex-row">
                <View className="flex-1 items-center">
                  <Text className="text-lg font-bold text-foreground">
                    {s.activeContractCount}
                  </Text>
                  <Text className="mt-0.5 text-center text-[11px] text-muted">
                    Aktif sözleşme
                  </Text>
                </View>
                <View className="w-px bg-border/60" />
                <View className="flex-1 items-center">
                  <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
                    {formatCurrency(s.expectedMonthlyIncome)}
                  </Text>
                  <Text className="mt-0.5 text-center text-[11px] text-muted">
                    Beklenen gelir
                  </Text>
                </View>
                <View className="w-px bg-border/60" />
                <View className="flex-1 items-center">
                  <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
                    {formatCurrency(s.portfolioValue)}
                  </Text>
                  <Text className="mt-0.5 text-center text-[11px] text-muted">
                    Toplam depozito
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

// Açık zeminde bina satırları için segment çubuğu.
function SegmentedBarLight({
  collected,
  pending,
  overdue,
  total,
}: {
  collected: number;
  pending: number;
  overdue: number;
  total: number;
}) {
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);
  return (
    <View className="h-1.5 flex-row overflow-hidden rounded-full bg-background">
      <View style={{ width: `${pct(collected)}%`, backgroundColor: palette.success }} />
      <View style={{ width: `${pct(pending)}%`, backgroundColor: palette.warning }} />
      <View style={{ width: `${pct(overdue)}%`, backgroundColor: palette.danger }} />
    </View>
  );
}
