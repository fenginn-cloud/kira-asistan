import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  Lock,
  Pencil,
  TimerReset,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { BarChart } from '@/components/charts/BarChart';
import { useStats } from '@/features/stats/useStats';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { useScrollToTop } from '@/lib/scrollToTop';
import { foldSearch } from '@/lib/utils/property';
import { formatCurrency } from '@/lib/utils/format';
import { palette } from '@/lib/theme/colors';

function Dot({ color }: { color: string }) {
  return <View style={{ backgroundColor: color }} className="h-2 w-2 rounded-full" />;
}

/** Küçük istatistik kutusu (Stitch 2x2 grid). */
function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  chip,
  iconColor,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  chip: string;
  iconColor: string;
}) {
  return (
    <View className="flex-1 rounded-3xl border border-border/60 bg-surface p-4 shadow-sm shadow-black/5">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium text-muted" numberOfLines={1}>
          {label}
        </Text>
        <View className={`h-7 w-7 items-center justify-center rounded-xl ${chip}`}>
          <Icon size={14} color={iconColor} />
        </View>
      </View>
      <Text className="mt-2 text-xl font-extrabold text-foreground" numberOfLines={1}>
        {value}
      </Text>
      {sub ? <Text className="text-[11px] text-muted">{sub}</Text> : null}
    </View>
  );
}

export default function StatsScreen() {
  const router = useRouter();
  const entitlement = useEntitlement();
  const [month, setMonth] = useState<string | undefined>(undefined);
  const s = useStats(month);
  const scrollRef = useScrollToTop<ScrollView>('stats');

  // Bina adına göre doluluk eşlemesi (Portföy & Gelir Dağılımı için).
  const occByName = useMemo(
    () => new Map(s.occupancy.map((o) => [foldSearch(o.building), o])),
    [s.occupancy]
  );

  // Free plan: istatistik + Finansal Özet Pro/Business özelliği — kilitli tanıtım.
  if (!entitlement.limits.stats) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary">
            <BarChart3 size={36} color="#FFFFFF" />
          </View>
          <View className="mt-5 flex-row items-center gap-2">
            <Lock size={16} color="#9CA3AF" />
            <Text className="text-lg font-bold text-foreground">Analiz</Text>
          </View>
          <Text className="mt-2 text-center text-sm text-muted">
            Tahsilat oranları, bina bazlı analiz ve Finansal Özet (toplam kira, tahsilat,
            kalan alacak, depozito, komisyon) Pro ve Business planlarına dahildir.
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/paywall?feature=stats')}
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
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Header — başlık + dönem + PDF (Stitch) */}
        <View className="flex-row items-center justify-between pt-2">
          <Text className="text-2xl font-bold text-foreground">Analiz</Text>
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1.5 rounded-2xl border border-border/60 bg-surface px-3 py-2">
              <CalendarDays size={15} color={palette.primary} />
              <Text className="text-sm font-semibold text-foreground">{s.activeMonthLong}</Text>
            </View>
          </View>
        </View>

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

            {/* DÖNEM ÖZETİ — Toplam Tahakkuk (Stitch beyaz hero + 2 alt kart) */}
            <View className="mt-4 rounded-[26px] border border-border/60 bg-surface p-5 shadow-sm shadow-black/5">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-muted">
                  Toplam Tahakkuk (Beklenen Kira)
                </Text>
                {s.momDeltaPct !== null ? (
                  <View
                    className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${
                      s.momDeltaPct >= 0 ? 'bg-success-soft' : 'bg-danger-soft'
                    }`}
                  >
                    {s.momDeltaPct >= 0 ? (
                      <TrendingUp size={12} color={palette.success} />
                    ) : (
                      <TrendingDown size={12} color={palette.danger} />
                    )}
                    <Text
                      className={`text-xs font-bold ${
                        s.momDeltaPct >= 0 ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {s.momDeltaPct >= 0 ? '+' : ''}
                      {Math.round(s.momDeltaPct)}%
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="mt-1 text-4xl font-extrabold text-foreground">
                {formatCurrency(s.due)}
              </Text>

              <View className="mt-4 flex-row gap-3">
                <View className="flex-1 rounded-2xl bg-success-soft/60 p-3">
                  <View className="flex-row items-center gap-1.5">
                    <Dot color={palette.success} />
                    <Text className="text-xs font-medium text-muted">Tahsil Edilen</Text>
                  </View>
                  <Text className="mt-1 text-lg font-extrabold text-success" numberOfLines={1}>
                    {formatCurrency(s.collected)}
                  </Text>
                  <Text className="text-[11px] text-muted">
                    %{Math.round(s.collectionRate)} toplam tahsilat
                  </Text>
                </View>
                <View className="flex-1 rounded-2xl bg-danger-soft/60 p-3">
                  <View className="flex-row items-center gap-1.5">
                    <Dot color={palette.danger} />
                    <Text className="text-xs font-medium text-muted">Geciken / Kalan</Text>
                  </View>
                  <Text className="mt-1 text-lg font-extrabold text-danger" numberOfLines={1}>
                    {formatCurrency(s.overdue + s.pending)}
                  </Text>
                  <Text className="text-[11px] text-muted">
                    {Math.max(0, s.totalContracts - s.paidContracts)} birim beklemede
                  </Text>
                </View>
              </View>

              <View className="mt-4">
                <SegmentedBarLight
                  collected={s.collected}
                  pending={s.pending}
                  overdue={s.overdue}
                  total={s.due}
                />
              </View>
            </View>

            {/* 2x2 İSTATİSTİK KUTULARI (Stitch) — tümü gerçek veri */}
            <View className="mt-4 flex-row gap-3">
              <StatTile
                label="Ortalama Kira"
                value={formatCurrency(
                  s.activeContractCount > 0
                    ? Math.round(s.expectedMonthlyIncome / s.activeContractCount)
                    : 0
                )}
                icon={Wallet}
                chip="bg-primary-50"
                iconColor={palette.primary}
              />
              <StatTile
                label="Portföy Doluluk"
                value={`%${
                  s.unitTotal > 0 ? Math.round((s.occupiedTotal / s.unitTotal) * 100) : 0
                }`}
                sub={s.unitTotal > 0 ? `${s.occupiedTotal}/${s.unitTotal} daire` : undefined}
                icon={Building2}
                chip="bg-success-soft"
                iconColor={palette.success}
              />
            </View>
            <View className="mt-3 flex-row gap-3">
              <StatTile
                label="Aktif Sözleşme"
                value={`${s.activeContractCount}`}
                icon={FileText}
                chip="bg-primary-50"
                iconColor={palette.primary}
              />
              <StatTile
                label="Kalan Alacak"
                value={formatCurrency(s.totalRemainingAll)}
                icon={TimerReset}
                chip={s.totalRemainingAll > 0 ? 'bg-warning-soft' : 'bg-success-soft'}
                iconColor={s.totalRemainingAll > 0 ? palette.warning : palette.success}
              />
            </View>

            {/* Portföy & Gelir Dağılımı (Stitch) — bina bazlı pay + doluluk */}
            <SectionHeader title="Portföy & Gelir Dağılımı" />
            <Card>
              {s.byBuilding.length === 0 ? (
                <Text className="py-2 text-center text-sm text-muted">
                  {s.activeMonthLong} için henüz kayıt yok
                </Text>
              ) : (
                <View className="gap-4">
                  {s.byBuilding.map((b, i) => {
                    const share = s.due > 0 ? (b.due / s.due) * 100 : 0;
                    const occ = occByName.get(foldSearch(b.building));
                    const dolulukPct =
                      occ && occ.total > 0
                        ? Math.round((occ.occupied / occ.total) * 100)
                        : null;
                    const dotColor =
                      b.overdue > 0 ? palette.danger : b.rate >= 95 ? palette.success : palette.primary;
                    return (
                      <View
                        key={b.building}
                        className={i > 0 ? 'border-t border-border/60 pt-4' : ''}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 flex-row items-center gap-2 pr-2">
                            <Dot color={dotColor} />
                            <Text
                              className="flex-1 text-sm font-bold text-foreground"
                              numberOfLines={1}
                            >
                              {b.building}
                            </Text>
                            {b.totalUnits > 0 ? (
                              <Text className="text-xs text-muted">({b.totalUnits} Daire)</Text>
                            ) : null}
                          </View>
                          <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                            {formatCurrency(b.due)}
                            <Text className="text-xs font-normal text-muted"> /ay</Text>
                          </Text>
                        </View>
                        <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                          <View
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${Math.min(share, 100)}%` }}
                          />
                        </View>
                        <View className="mt-1.5 flex-row items-center justify-between">
                          <Text className="text-xs text-muted">%{share.toFixed(1)} pay</Text>
                          {dolulukPct !== null ? (
                            <View className="flex-row items-center gap-1">
                              <Dot color={dolulukPct >= 90 ? palette.success : palette.warning} />
                              <Text
                                className={`text-xs font-semibold ${
                                  dolulukPct >= 90 ? 'text-success' : 'text-warning'
                                }`}
                              >
                                %{dolulukPct} Dolu
                              </Text>
                            </View>
                          ) : b.commission > 0 ? (
                            <Text className="text-xs font-semibold text-primary-700">
                              Komisyon: {formatCurrency(b.commission)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>

            {/* Boş daireler — toplam − dolu (aktif sözleşme) */}
            {s.occupancy.length > 0 ? (
              <>
                <SectionHeader title="Boş Daireler" />
                <Card>
                  <View className="flex-row">
                    <View className="flex-1 items-center">
                      <Text className="text-2xl font-extrabold text-warning">{s.vacantTotal}</Text>
                      <Text className="mt-0.5 text-[11px] text-muted">Boş daire</Text>
                    </View>
                    <View className="w-px bg-border/60" />
                    <View className="flex-1 items-center">
                      <Text className="text-2xl font-extrabold text-foreground">{s.occupiedTotal}</Text>
                      <Text className="mt-0.5 text-[11px] text-muted">Dolu</Text>
                    </View>
                    <View className="w-px bg-border/60" />
                    <View className="flex-1 items-center">
                      <Text className="text-2xl font-extrabold text-foreground">{s.unitTotal}</Text>
                      <Text className="mt-0.5 text-[11px] text-muted">Toplam</Text>
                    </View>
                  </View>
                  <View className="mt-3 gap-2.5 border-t border-border/60 pt-3">
                    {s.occupancy.map((o) => (
                      <View key={o.building} className="flex-row items-center justify-between">
                        <Text className="flex-1 pr-2 text-sm font-semibold text-foreground" numberOfLines={1}>
                          {o.building}
                        </Text>
                        <Text className="text-xs text-muted">{o.occupied}/{o.total} dolu</Text>
                        <View className="ml-3 rounded-full bg-warning-soft px-2.5 py-1">
                          <Text className="text-xs font-bold text-warning">{o.vacant} boş</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    onPress={() => router.push('/(app)/building-units' as Href)}
                    className="mt-3 flex-row items-center justify-center gap-1.5 border-t border-border/60 pt-3 active:opacity-70"
                  >
                    <Pencil size={14} color={palette.primary} />
                    <Text className="text-sm font-semibold text-primary-700">
                      Daire sayılarını düzenle
                    </Text>
                  </Pressable>
                </Card>
              </>
            ) : null}

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

            {/* Portföy toplamları — depozito ve komisyon (sözleşme alanlarının
                gerçek toplamı; kümülatif aylık tahsilat satırları kaldırıldı). */}
            <SectionHeader title="Finansal Özet" />
            <Card>
              <SummaryRow label="Toplam Depozito" value={formatCurrency(s.depositTotal)} />
              <SummaryRow
                label="Toplam Komisyon"
                value={formatCurrency(s.commissionTotal)}
                tone="primary"
                last
              />
            </Card>

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
                    Beklenen aylık gelir
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

// Finansal Özet satırı: solda etiket, sağda tutar (tona göre renk).
function SummaryRow({
  label,
  value,
  tone = 'default',
  last = false,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger' | 'primary' | 'muted';
  last?: boolean;
}) {
  const color =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : tone === 'primary'
          ? 'text-primary-700'
          : tone === 'muted'
            ? 'text-muted'
            : 'text-foreground';
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${
        last ? '' : 'border-b border-border/60'
      }`}
    >
      <Text className="text-sm text-muted">{label}</Text>
      <Text className={`text-base font-bold ${color}`} numberOfLines={1}>
        {value}
      </Text>
    </View>
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
