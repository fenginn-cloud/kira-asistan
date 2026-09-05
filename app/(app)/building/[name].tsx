import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ArrowLeft, BarChart3, Building2, DoorClosed } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusPill, type PillTone } from '@/features/dashboard/components/StatusPill';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments } from '@/features/payments/hooks';
import { useBuildingUnits } from '@/features/stats/buildingUnitsHooks';
import { getContractBalance, formatCurrencyTRY, type LedgerStatus } from '@/lib/ledger/ledger';
import { buildingName, foldSearch } from '@/lib/utils/property';
import { formatCurrency, getInitials } from '@/lib/utils/format';
import { fgColor } from '@/lib/theme/useThemeColors';
import { palette } from '@/lib/theme/colors';
import type { Contract, Payment } from '@/types';

const PILL_DEFAULT: { tone: PillTone; label: string } = { tone: 'info', label: 'Bekliyor' };
const PILL: Record<string, { tone: PillTone; label: string }> = {
  paid: { tone: 'paid', label: 'Ödendi' },
  overpaid: { tone: 'paid', label: 'Ödendi' },
  partial: { tone: 'pending', label: 'Kısmi' },
  pending: { tone: 'info', label: 'Bekliyor' },
  upcoming: { tone: 'info', label: 'Bekliyor' },
  overdue: { tone: 'overdue', label: 'Gecikmede' },
};
const AVBG: Record<string, string> = {
  paid: 'bg-success-soft',
  overpaid: 'bg-success-soft',
  partial: 'bg-warning-soft',
  overdue: 'bg-danger-soft',
  pending: 'bg-primary-50',
  upcoming: 'bg-primary-50',
};
const AVTX: Record<string, string> = {
  paid: 'text-success',
  overpaid: 'text-success',
  partial: 'text-warning',
  overdue: 'text-danger',
  pending: 'text-primary-700',
  upcoming: 'text-primary-700',
};

/**
 * Bina / Daire Envanteri detayı — Stitch "Daire Matrisi". Tümüyle mevcut
 * veriden: dolu daireler gerçek sözleşmelerden (kiracı + kira + durum),
 * boş daire yalnızca SAYI olarak (numara uydurulmaz). Bloklara göre gruplanır.
 */
export default function BuildingDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const building = (name ?? '').toString();
  const router = useRouter();
  const { data: contracts = [] } = useContracts();
  const { data: payments = [] } = useAllPayments();
  const { data: overrides = [] } = useBuildingUnits();

  const data = useMemo(() => {
    const key = foldSearch(building);
    const byContract = new Map<string, Payment[]>();
    for (const p of payments) {
      const arr = byContract.get(p.contractId);
      if (arr) arr.push(p);
      else byContract.set(p.contractId, [p]);
    }
    const mine = contracts.filter((c) => foldSearch(buildingName(c.propertyName)) === key);
    const active = mine.filter((c) => c.status === 'active');
    const totalOverride = overrides.find((o) => foldSearch(o.building) === key)?.total ?? null;
    const occupied = active.length;
    const total = totalOverride ?? occupied;
    const vacant = Math.max(0, total - occupied);

    let monthly = 0;
    const counts = { paid: 0, overdue: 0, pending: 0 };
    const statusByContract = new Map<string, LedgerStatus>();
    for (const c of active) {
      monthly += c.rentAmount + c.duesAmount;
      const bal = getContractBalance(c, byContract.get(c.id) ?? []);
      const st = bal.currentMonth.status;
      statusByContract.set(c.id, st);
      if (st === 'paid' || st === 'overpaid') counts.paid += 1;
      else if (st === 'overdue') counts.overdue += 1;
      else counts.pending += 1;
    }

    // Bloklara göre grupla (blok yoksa "Genel").
    const byBlock = new Map<string, Contract[]>();
    for (const c of active) {
      const b = (c.block ?? '').trim() || 'Genel';
      const arr = byBlock.get(b);
      if (arr) arr.push(c);
      else byBlock.set(b, [c]);
    }
    const blocks = [...byBlock.entries()]
      .map(([block, list]) => ({
        block,
        list: list.sort((a, b) => (a.unit ?? '').localeCompare(b.unit ?? '', 'tr', { numeric: true })),
      }))
      .sort((a, b) => a.block.localeCompare(b.block, 'tr'));

    return {
      total,
      occupied,
      vacant,
      rate: total > 0 ? Math.round((Math.min(occupied, total) / total) * 100) : 0,
      monthly,
      counts,
      blocks,
      statusByContract,
      hasTotal: totalOverride != null && totalOverride > 0,
    };
  }, [contracts, payments, overrides, building]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={fgColor()} />
        </Pressable>
        <Text className="flex-1 text-xl font-bold text-foreground" numberOfLines={1}>
          {building}
        </Text>
        <Pressable
          onPress={() => router.push(`/(app)/property-report?name=${encodeURIComponent(building)}` as Href)}
          className="h-9 w-9 items-center justify-center rounded-2xl bg-primary-50 active:opacity-80"
        >
          <BarChart3 size={18} color={palette.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-10 pt-3" showsVerticalScrollIndicator={false}>
        {/* Doluluk özeti (cobalt) */}
        <View
          className="rounded-[26px] bg-primary p-5"
          style={{
            shadowColor: '#2563EB',
            shadowOpacity: 0.28,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
          }}
        >
          <View className="flex-row items-center gap-2">
            <Building2 size={16} color="#FFFFFF" />
            <Text className="text-sm font-medium text-white/80">Toplam Doluluk</Text>
          </View>
          <View className="mt-1 flex-row items-end gap-2">
            <Text className="text-4xl font-extrabold text-white">%{data.rate}</Text>
            <Text className="pb-1 text-sm font-medium text-white/70">
              {data.occupied} / {data.total} daire
            </Text>
          </View>
          <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
            <View className="h-2 rounded-full bg-white" style={{ width: `${Math.min(data.rate, 100)}%` }} />
          </View>
          <View className="mt-4 flex-row items-center justify-between border-t border-white/15 pt-3">
            <Text className="text-xs text-white/70">Aylık tahsilat hacmi</Text>
            <Text className="text-base font-bold text-white">{formatCurrencyTRY(data.monthly)}</Text>
          </View>
        </View>

        {/* Portföy sağlığı */}
        <View className="mt-4 flex-row gap-3">
          <HealthTile value={data.counts.paid} label="Ödendi" tone="text-success" chip="bg-success-soft" />
          <HealthTile value={data.counts.overdue} label="Gecikmede" tone="text-danger" chip="bg-danger-soft" />
          <HealthTile value={data.counts.pending} label="Bekleyen" tone="text-primary-700" chip="bg-primary-50" />
          <HealthTile value={data.vacant} label="Boş" tone="text-warning" chip="bg-warning-soft" />
        </View>

        {/* Blok ve daire planı */}
        {data.blocks.length === 0 ? (
          <View className="mt-8">
            <EmptyState icon={Building2} title="Bu binada aktif sözleşme yok" />
          </View>
        ) : (
          data.blocks.map((grp) => (
            <View key={grp.block} className="mt-6">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-base font-bold text-foreground">
                  {grp.block === 'Genel' ? 'Daireler' : `${grp.block} Blok`}
                </Text>
                <Text className="text-xs font-semibold text-muted">{grp.list.length} daire</Text>
              </View>
              <View className="gap-2">
                {grp.list.map((c) => {
                  const st = data.statusByContract.get(c.id) ?? 'pending';
                  const p = PILL[st] ?? PILL_DEFAULT;
                  return (
                    <Card key={c.id} onPress={() => router.push(`/(app)/contracts/${c.id}`)}>
                      <View className="flex-row items-center gap-3">
                        <View className={`h-11 w-11 items-center justify-center rounded-2xl ${AVBG[st] ?? 'bg-primary-50'}`}>
                          <Text className={`text-xs font-extrabold ${AVTX[st] ?? 'text-primary-700'}`}>
                            {getInitials(c.tenantName)}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                            {c.unit ? `D:${c.unit}` : c.propertyName} · {c.tenantName}
                          </Text>
                          <Text className="text-xs text-muted">{formatCurrency(c.rentAmount)} / ay</Text>
                        </View>
                        <StatusPill tone={p.tone} label={p.label} />
                      </View>
                    </Card>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {/* Boş daire notu (numara uydurulmaz) */}
        {data.vacant > 0 ? (
          <View className="mt-6 flex-row items-center gap-3 rounded-2xl border border-dashed border-warning/40 bg-warning-soft p-4">
            <DoorClosed size={18} color={palette.warning} />
            <Text className="flex-1 text-sm text-foreground">
              {data.vacant} boş daire{' '}
              <Text className="text-muted">
                {data.hasTotal
                  ? '(toplam − dolu). Kiralanınca sözleşme ekleyin.'
                  : '— toplam daire sayısı girilmediği için tahmini.'}
              </Text>
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function HealthTile({
  value,
  label,
  tone,
  chip,
}: {
  value: number;
  label: string;
  tone: string;
  chip: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-border/60 bg-surface p-2.5 shadow-sm shadow-black/5">
      <View className={`h-2 w-2 rounded-full ${chip}`} />
      <Text className={`mt-1.5 text-xl font-extrabold ${tone}`}>{value}</Text>
      <Text className="text-[11px] font-medium text-muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
