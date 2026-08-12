import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, Building2 } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useContracts } from '@/features/contracts/hooks';
import { useAuthStore } from '@/store/authStore';
import { buildingName, foldSearch } from '@/lib/utils/property';
import { useThemeColors } from '@/lib/theme/useThemeColors';
import { palette } from '@/lib/theme/colors';
import { BUILDING_UNITS } from '@/features/stats/buildingUnits';
import { useBuildingUnits, useSetBuildingUnit } from '@/features/stats/buildingUnitsHooks';

export default function BuildingUnitsScreen() {
  const router = useRouter();
  const toast = useToast();
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const { data: contracts = [] } = useContracts();
  const { data: overrides = [] } = useBuildingUnits();
  const setUnit = useSetBuildingUnit();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Düzenlenebilir bina listesi: sözleşmelerdeki binalar + kayıtlı override'lar
  // + varsayılan sabitler (hepsi tekilleştirilir, alfabetik).
  const rows = useMemo(() => {
    const map = new Map<string, { name: string; current: number | null }>();
    const overrideByFold = new Map(overrides.map((o) => [foldSearch(o.building), o.total]));
    const constByFold = new Map(BUILDING_UNITS.map((b) => [foldSearch(b.name), b.total]));
    const add = (name: string) => {
      const k = foldSearch(name);
      if (!k || map.has(k)) return;
      map.set(k, { name, current: overrideByFold.get(k) ?? constByFold.get(k) ?? null });
    };
    for (const c of contracts) add(buildingName(c.propertyName));
    for (const o of overrides) add(o.building);
    for (const b of BUILDING_UNITS) add(b.name);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [contracts, overrides]);

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 items-center justify-center p-6">
          <EmptyState icon={AlertTriangle} title="Yetkiniz yok" description="Bu ekran yalnızca yöneticiler içindir." />
        </View>
      </SafeAreaView>
    );
  }

  const valueOf = (row: { name: string; current: number | null }) => {
    const k = foldSearch(row.name);
    return edits[k] ?? (row.current != null ? String(row.current) : '');
  };

  const onSave = async () => {
    setSaving(true);
    try {
      let changed = 0;
      for (const row of rows) {
        const k = foldSearch(row.name);
        if (!(k in edits)) continue; // dokunulmadı
        const raw = edits[k]!.trim();
        if (raw === '') continue;
        const n = parseInt(raw, 10);
        if (Number.isNaN(n) || n < 0) continue;
        if (n === row.current) continue;
        await setUnit.mutateAsync({ building: row.name, total: n });
        changed++;
      }
      toast.success(changed ? `${changed} bina güncellendi` : 'Değişiklik yok');
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3 pt-2">
          <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full bg-surface">
            <ArrowLeft size={20} color={palette.muted} />
          </Pressable>
          <Text className="text-2xl font-bold text-foreground">Daire Sayıları</Text>
        </View>
        <Text className="mt-3 text-sm text-muted">
          Her binadaki toplam daire sayısını girin. Boş daire = toplam − dolu (aktif sözleşme).
        </Text>

        <View className="mt-5 gap-2">
          {rows.map((row) => (
            <Card key={row.name}>
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary-50">
                  <Building2 size={18} color={palette.primary} />
                </View>
                <Text className="flex-1 text-base font-semibold text-foreground" numberOfLines={1}>
                  {row.name}
                </Text>
                <TextInput
                  value={valueOf(row)}
                  onChangeText={(t) =>
                    setEdits((e) => ({ ...e, [foldSearch(row.name)]: t.replace(/[^\d]/g, '') }))
                  }
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  className="h-11 w-20 rounded-2xl border border-border bg-background px-3 text-center text-base font-bold text-foreground"
                />
                <Text className="text-xs text-muted">daire</Text>
              </View>
            </Card>
          ))}
        </View>

        <View className="mt-6">
          <Button label="Kaydet" onPress={onSave} loading={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
