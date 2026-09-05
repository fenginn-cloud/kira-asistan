import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Building2, ChevronRight, Sliders } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useContracts } from '@/features/contracts/hooks';
import { useBuildingUnits } from '@/features/stats/buildingUnitsHooks';
import { useScrollToTop } from '@/lib/scrollToTop';
import { buildingName, foldSearch } from '@/lib/utils/property';
import { palette } from '@/lib/theme/colors';

interface BuildingRow {
  name: string;
  total: number | null; // building_units'te tanımlı toplam (yoksa null)
  occupied: number; // aktif sözleşme sayısı
}

/**
 * Mülkler / Daire Envanteri — mevcut veriden türetilir:
 *   dolu  = o binadaki AKTİF sözleşme sayısı
 *   toplam = building_units'te girilen değer (yönetici girer)
 *   boş   = toplam − dolu
 * Yeni backend ilişkisi icat edilmez; iş mantığı Analiz ekranıyla aynıdır.
 */
export default function PropertiesScreen() {
  const router = useRouter();
  const listRef = useScrollToTop<FlatList>('properties');
  const { data: contracts = [], isLoading } = useContracts();
  const { data: overrides = [] } = useBuildingUnits();

  const rows = useMemo<BuildingRow[]>(() => {
    const totalByFold = new Map(overrides.map((o) => [foldSearch(o.building), o.total]));
    const map = new Map<string, BuildingRow>();
    for (const c of contracts) {
      const name = buildingName(c.propertyName);
      const k = foldSearch(name);
      if (!k) continue;
      const row = map.get(k) ?? { name, total: totalByFold.get(k) ?? null, occupied: 0 };
      if (c.status === 'active') row.occupied += 1;
      map.set(k, row);
    }
    // Sözleşmesi olmayan ama daire sayısı girilmiş binaları da göster.
    for (const o of overrides) {
      const k = foldSearch(o.building);
      if (!map.has(k)) map.set(k, { name: o.building, total: o.total, occupied: 0 });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [contracts, overrides]);

  const totals = useMemo(() => {
    let total = 0;
    let occupied = 0;
    for (const r of rows) {
      occupied += r.occupied;
      total += r.total ?? r.occupied;
    }
    return { total, occupied, vacant: Math.max(0, total - occupied), buildings: rows.length };
  }, [rows]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2">
        <Text className="text-2xl font-bold text-foreground">Mülkler</Text>
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
          ListHeaderComponent={
            <View className="mb-1 flex-row gap-3">
              <PortfolioTile label="Toplam Daire" value={`${totals.total}`} tone="text-foreground" />
              <PortfolioTile label="Dolu" value={`${totals.occupied}`} tone="text-success" />
              <PortfolioTile label="Boş" value={`${totals.vacant}`} tone="text-warning" />
            </View>
          }
          renderItem={({ item }) => (
            <BuildingCard
              row={item}
              onPress={() =>
                router.push(`/(app)/property-report?name=${encodeURIComponent(item.name)}` as Href)
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function PortfolioTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View className="flex-1 rounded-3xl border border-border/60 bg-surface p-3.5 shadow-sm shadow-black/5">
      <Text className={`text-2xl font-extrabold ${tone}`}>{value}</Text>
      <Text className="mt-0.5 text-xs font-medium text-muted">{label}</Text>
    </View>
  );
}

function BuildingCard({ row, onPress }: { row: BuildingRow; onPress: () => void }) {
  const hasTotal = row.total != null && row.total > 0;
  const total = row.total ?? 0;
  const vacant = Math.max(0, total - row.occupied);
  const rate = hasTotal ? Math.round((Math.min(row.occupied, total) / total) * 100) : 0;
  return (
    <Card onPress={onPress}>
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
          <Building2 size={20} color={palette.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>
            {row.name}
          </Text>
          <Text className="text-sm text-muted">
            {hasTotal ? `${total} daire` : `${row.occupied} aktif sözleşme`}
          </Text>
        </View>
        {hasTotal ? (
          <Text className="text-base font-extrabold text-primary-700">%{rate}</Text>
        ) : (
          <ChevronRight size={18} color={palette.muted} />
        )}
      </View>

      {hasTotal ? (
        <>
          <View className="mt-3 h-2 overflow-hidden rounded-full bg-background">
            <View
              className="h-2 rounded-full bg-primary"
              style={{ width: `${Math.min(rate, 100)}%` }}
            />
          </View>
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1 rounded-2xl bg-success-soft px-3 py-2">
              <Text className="text-[11px] text-muted">Dolu</Text>
              <Text className="text-sm font-bold text-success">{Math.min(row.occupied, total)}</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-warning-soft px-3 py-2">
              <Text className="text-[11px] text-muted">Boş</Text>
              <Text className="text-sm font-bold text-warning">{vacant}</Text>
            </View>
          </View>
        </>
      ) : (
        <Text className="mt-2 text-xs text-muted">
          {'Doluluk için bu binanın toplam daire sayısını girin — «Daire Sayıları».'}
        </Text>
      )}
    </Card>
  );
}
