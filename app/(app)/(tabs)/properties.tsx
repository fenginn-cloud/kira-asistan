import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Building2, ChevronRight, DoorClosed, Sliders, TrendingUp } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useContracts } from '@/features/contracts/hooks';
import { useBuildingUnits } from '@/features/stats/buildingUnitsHooks';
import { useScrollToTop } from '@/lib/scrollToTop';
import { buildingName, foldSearch } from '@/lib/utils/property';
import { formatCurrencyTRY } from '@/lib/ledger/ledger';
import { getInitials } from '@/lib/utils/format';
import { palette } from '@/lib/theme/colors';

interface BlockRow {
  block: string;
  occupied: number;
}

interface BuildingRow {
  name: string;
  total: number | null; // building_units'te tanımlı toplam (yoksa null)
  occupied: number; // aktif sözleşme sayısı
  income: number; // aktif sözleşmelerin aylık kira + aidat toplamı
  blocks: BlockRow[]; // bloklara göre dolu (aktif sözleşme) sayısı
}

/**
 * Mülkler / Daire Envanteri — mevcut veriden türetilir:
 *   dolu   = o binadaki AKTİF sözleşme sayısı
 *   toplam = building_units'te girilen değer (yönetici girer)
 *   boş    = toplam − dolu
 *   gelir  = aktif sözleşmelerin aylık kira + aidat toplamı
 * Yeni backend ilişkisi icat edilmez (şehir, m², hedef kira, blok başına
 * toplam daire ve "gün gündür boş" verisi olmadığından gösterilmez).
 */
export default function PropertiesScreen() {
  const router = useRouter();
  const listRef = useScrollToTop<FlatList>('properties');
  const { data: contracts = [], isLoading } = useContracts();
  const { data: overrides = [] } = useBuildingUnits();

  const rows = useMemo<BuildingRow[]>(() => {
    const totalByFold = new Map(overrides.map((o) => [foldSearch(o.building), o.total]));
    const map = new Map<
      string,
      Omit<BuildingRow, 'blocks'> & { blockMap: Map<string, number> }
    >();
    for (const c of contracts) {
      const name = buildingName(c.propertyName);
      const k = foldSearch(name);
      if (!k) continue;
      const row =
        map.get(k) ??
        {
          name,
          total: totalByFold.get(k) ?? null,
          occupied: 0,
          income: 0,
          blockMap: new Map<string, number>(),
        };
      if (c.status === 'active') {
        row.occupied += 1;
        row.income += c.rentAmount + c.duesAmount;
        const b = (c.block ?? '').trim() || 'Genel';
        row.blockMap.set(b, (row.blockMap.get(b) ?? 0) + 1);
      }
      map.set(k, row);
    }
    // Sözleşmesi olmayan ama daire sayısı girilmiş binaları da göster.
    for (const o of overrides) {
      const k = foldSearch(o.building);
      if (!map.has(k))
        map.set(k, {
          name: o.building,
          total: o.total,
          occupied: 0,
          income: 0,
          blockMap: new Map(),
        });
    }
    return [...map.values()]
      .map((r) => ({
        name: r.name,
        total: r.total,
        occupied: r.occupied,
        income: r.income,
        blocks: [...r.blockMap.entries()]
          .map(([block, occupied]) => ({ block, occupied }))
          .sort((a, b) => a.block.localeCompare(b.block, 'tr', { numeric: true })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [contracts, overrides]);

  const totals = useMemo(() => {
    let total = 0;
    let occupied = 0;
    let income = 0;
    for (const r of rows) {
      occupied += r.occupied;
      total += r.total ?? r.occupied;
      income += r.income;
    }
    return {
      total,
      occupied,
      income,
      vacant: Math.max(0, total - occupied),
      projects: rows.length,
      rate: total > 0 ? Math.round((Math.min(occupied, total) / total) * 100) : 0,
    };
  }, [rows]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-bold text-foreground">Mülkler</Text>
          {rows.length > 0 ? (
            <Text className="mt-0.5 text-xs font-medium text-muted">
              {totals.projects} proje · {totals.total} bağımsız bölüm
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.push('/(app)/building-units')}
          className="h-10 flex-row items-center gap-1.5 rounded-2xl bg-primary-50 px-3.5 active:opacity-80"
        >
          <Sliders size={16} color={palette.primary} />
          <Text className="text-sm font-semibold text-primary-700">Daire Sayıları</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="gap-3 px-5 pt-4">
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : rows.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            icon={Building2}
            title="Henüz mülk yok"
            description="Sözleşme ekledikçe mülkleriniz burada listelenir; daire sayılarını girerek doluluk takibi yapabilirsiniz."
          />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(r) => r.name}
          contentContainerClassName="px-5 pb-10 pt-4 gap-3"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<PortfolioHero totals={totals} />}
          renderItem={({ item }) => (
            <BuildingCard
              row={item}
              onPress={() =>
                router.push(`/(app)/building/${encodeURIComponent(item.name)}` as Href)
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

/** Mavi portföy hero (Stitch) — aylık gelir + doluluk + boş birim. */
function PortfolioHero({
  totals,
}: {
  totals: {
    income: number;
    rate: number;
    occupied: number;
    total: number;
    vacant: number;
  };
}) {
  return (
    <View
      className="mb-4 overflow-hidden rounded-[26px] bg-primary p-5"
      style={{
        shadowColor: '#2563EB',
        shadowOpacity: 0.28,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-medium uppercase tracking-wide text-white/70">
            Aylık Beklenen Toplam Gelir
          </Text>
          <Text className="mt-0.5 text-2xl font-extrabold text-white" numberOfLines={1}>
            {formatCurrencyTRY(totals.income)}
            <Text className="text-xs font-medium text-white/60"> / ay</Text>
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5 rounded-full bg-success/25 px-2.5 py-1">
          <TrendingUp size={12} color="#4ADE80" />
          <Text className="text-[11px] font-semibold text-white">%{totals.rate} Dolu</Text>
        </View>
      </View>

      {/* Doluluk çubuğu */}
      <View className="mt-4 rounded-2xl bg-black/15 p-3.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-medium text-white/70">Toplam Doluluk Oranı</Text>
          <Text className="text-xs font-bold text-white">
            %{totals.rate}{' '}
            <Text className="font-normal text-white/60">
              ({totals.occupied} Dolu / {totals.vacant} Boş)
            </Text>
          </Text>
        </View>
        <View className="mt-2 h-2 flex-row overflow-hidden rounded-full bg-white/20">
          <View style={{ width: `${totals.rate}%`, backgroundColor: '#4ADE80' }} />
          <View style={{ width: `${100 - totals.rate}%`, backgroundColor: '#FCD34D' }} />
        </View>
      </View>

      {totals.vacant > 0 ? (
        <View className="mt-3.5 flex-row items-center gap-1.5">
          <DoorClosed size={14} color="#FCD34D" />
          <Text className="text-xs font-medium text-white/80">
            {totals.vacant} boş birim kiralama bekliyor
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const AV_TONES = ['bg-primary-50', 'bg-success-soft', 'bg-warning-soft'] as const;
const AV_TEXT = ['text-primary-700', 'text-success', 'text-warning'] as const;

function BuildingCard({ row, onPress }: { row: BuildingRow; onPress: () => void }) {
  const hasTotal = row.total != null && row.total > 0;
  const total = row.total ?? 0;
  const vacant = Math.max(0, total - row.occupied);
  const rate = hasTotal ? Math.round((Math.min(row.occupied, total) / total) * 100) : 0;
  // Avatar tonu bina adına göre sabit (deterministik).
  const toneIdx = Math.abs(hashCode(row.name)) % AV_TONES.length;
  const blockCount = row.blocks.filter((b) => b.block !== 'Genel').length;

  return (
    <Card onPress={onPress}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center gap-3 pr-2">
          <View
            className={`h-11 w-11 items-center justify-center rounded-2xl ${AV_TONES[toneIdx]}`}
          >
            <Text className={`text-sm font-extrabold ${AV_TEXT[toneIdx]}`}>
              {getInitials(row.name)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {row.name}
            </Text>
            <Text className="text-xs text-muted">
              {hasTotal ? `${total} daire` : `${row.occupied} aktif sözleşme`}
              {blockCount > 0 ? ` · ${blockCount} blok` : ''}
            </Text>
          </View>
        </View>
        {hasTotal ? (
          <View className="rounded-lg bg-background px-2 py-1">
            <Text className="text-xs font-extrabold text-primary-700">%{rate}</Text>
          </View>
        ) : (
          <ChevronRight size={18} color={palette.muted} />
        )}
      </View>

      {/* Gelir + doluluk */}
      <View className="mt-3.5 flex-row gap-3 border-t border-border/60 pt-3.5">
        <View className="flex-1">
          <Text className="text-[11px] font-medium text-muted">Aylık Gelir</Text>
          <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
            {formatCurrencyTRY(row.income)}
            <Text className="text-[10px] font-normal text-muted"> / ay</Text>
          </Text>
        </View>
        {hasTotal ? (
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] font-medium text-muted">Doluluk</Text>
              <Text className="text-[11px] font-bold text-success">
                {Math.min(row.occupied, total)} Dolu · {vacant} Boş
              </Text>
            </View>
            <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
              <View
                className="h-1.5 rounded-full bg-primary"
                style={{ width: `${Math.min(rate, 100)}%` }}
              />
            </View>
          </View>
        ) : (
          <View className="flex-1 items-end justify-center">
            <Text className="text-[11px] text-muted">Doluluk için daire sayısı girin</Text>
          </View>
        )}
      </View>

      {/* Blok dağılımı — dolu (aktif sözleşme) sayısı; blok başına toplam
          verisi olmadığından yalnızca dolu sayısı gösterilir. */}
      {blockCount > 0 ? (
        <View className="mt-3 rounded-2xl bg-background p-2.5">
          <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
            Blok Dağılımı (dolu daire)
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {row.blocks
              .filter((b) => b.block !== 'Genel')
              .map((b) => (
                <View
                  key={b.block}
                  className="rounded-xl border border-border/60 bg-surface px-2.5 py-1.5"
                >
                  <Text className="text-[10px] font-medium text-muted">{b.block} Blok</Text>
                  <Text className="text-xs font-bold text-primary-700">{b.occupied}</Text>
                </View>
              ))}
          </View>
        </View>
      ) : null}

      {/* Aksiyon */}
      <View className="mt-3">
        <View className="flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary-50 py-2.5">
          <Text className="text-xs font-semibold text-primary-700">
            Daireleri İncele{row.occupied > 0 ? ` (${row.occupied})` : ''}
          </Text>
          <ChevronRight size={14} color={palette.primary} />
        </View>
      </View>
    </Card>
  );
}

/** Deterministik renk için basit string hash. */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}
