import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, DoorClosed, DoorOpen, Lock, Plus, Trash2 } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { useContracts } from '@/features/contracts/hooks';
import { useUnits, useUpsertUnit, useDeleteUnit } from '@/features/units/hooks';
import { useAuthStore } from '@/store/authStore';
import { buildingName, foldSearch } from '@/lib/utils/property';
import { useThemeColors } from '@/lib/theme/useThemeColors';
import { palette } from '@/lib/theme/colors';
import { vacancyLabel } from '@/features/units/vacancy';
import { mergeUnitsWithContracts, type EffectiveUnit } from '@/features/units/occupancy';

export default function UnitsInventoryScreen() {
  const router = useRouter();
  const toast = useToast();
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const { data: contracts = [] } = useContracts();
  const { data: units = [], isLoading } = useUnits();
  const upsert = useUpsertUnit();
  const del = useDeleteUnit();

  const [building, setBuilding] = useState('');
  const [block, setBlock] = useState('');
  const [labels, setLabels] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<EffectiveUnit | null>(null);

  // Mevcut sözleşmelerdeki bina adları (öneri çipleri) — sözleşmeler değişmez.
  const buildingSuggestions = useMemo(() => {
    const names = [...new Set(contracts.map((c) => buildingName(c.propertyName)).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b, 'tr'));
  }, [contracts]);

  // Envanter + aktif sözleşmeleri birleştir (yeni sözleşme otomatik "dolu").
  const merged = useMemo(() => mergeUnitsWithContracts(units, contracts), [units, contracts]);

  // Binaya göre grupla.
  const grouped = useMemo(() => {
    const map = new Map<string, EffectiveUnit[]>();
    for (const u of merged) {
      const arr = map.get(u.building);
      if (arr) arr.push(u);
      else map.set(u.building, [u]);
    }
    return [...map.entries()]
      .map(([name, list]) => ({
        name,
        list: list.sort(
          (a, b) =>
            a.block.localeCompare(b.block, 'tr', { numeric: true }) ||
            a.unitLabel.localeCompare(b.unitLabel, 'tr', { numeric: true })
        ),
        vacant: list.filter((u) => u.effectiveStatus === 'vacant').length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [merged]);

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 items-center justify-center p-6">
          <EmptyState icon={AlertTriangle} title="Yetkiniz yok" description="Bu ekran yalnızca yöneticiler içindir." />
        </View>
      </SafeAreaView>
    );
  }

  // "1, 2, 3" / "1 2 3" / satır satır → etiket listesi.
  const parseLabels = (raw: string) =>
    [...new Set(raw.split(/[\n,]+/).flatMap((s) => s.split(/\s+/)).map((s) => s.trim()).filter(Boolean))];

  const onAdd = async () => {
    const b = building.trim();
    const list = parseLabels(labels);
    if (!b) {
      toast.error('Bina adı girin.');
      return;
    }
    if (list.length === 0) {
      toast.error('En az bir daire no/etiketi girin (ör. 1, 2, 3).');
      return;
    }
    setSaving(true);
    try {
      let added = 0;
      for (const label of list) {
        // Durum sözleşmeye göre otomatik; envantere sadece dairenin varlığı eklenir.
        await upsert.mutateAsync({ building: b, block: block.trim(), unitLabel: label });
        added++;
      }
      toast.success(`${added} daire envantere eklendi`);
      setLabels('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eklenemedi');
    } finally {
      setSaving(false);
    }
  };

  // Durum tamamen sözleşmeye göre belirlenir; elle değiştirilmez.
  const explainStatus = () =>
    toast.info('Durum sözleşmeye göre otomatik: sözleşmesi olan dolu, olmayan boş.');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center gap-3 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface"
          >
            <ArrowLeft size={20} color={palette.muted} />
          </Pressable>
          <Text className="text-2xl font-bold text-foreground">Daire Envanteri</Text>
        </View>
        <Text className="mt-2 text-sm text-muted">
          Her binada hangi dairelerin olduğunu girin. Durum otomatik: aktif sözleşmesi
          olan daire dolu, olmayan boş (gri) gösterilir. Yeni sözleşme yapılınca daire
          otomatik dolu olur. Mevcut sözleşmeler etkilenmez.
        </Text>

        {/* Ekleme formu */}
        <Card className="mt-4 gap-3">
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-muted">Bina</Text>
            <TextInput
              value={building}
              onChangeText={setBuilding}
              placeholder="Örn. EGE İREM"
              placeholderTextColor={colors.textMuted}
              className="h-11 rounded-2xl border border-border bg-background px-3 text-base text-foreground"
            />
            {buildingSuggestions.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                <View className="flex-row gap-2 px-1">
                  {buildingSuggestions.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setBuilding(s)}
                      className={`rounded-full border px-3 py-1.5 ${
                        foldSearch(s) === foldSearch(building)
                          ? 'border-primary bg-primary-50'
                          : 'border-border bg-surface'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          foldSearch(s) === foldSearch(building) ? 'text-primary-700' : 'text-muted'
                        }`}
                      >
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            ) : null}
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-muted">Blok (opsiyonel)</Text>
            <TextInput
              value={block}
              onChangeText={setBlock}
              placeholder="A / B / —"
              placeholderTextColor={colors.textMuted}
              className="h-11 rounded-2xl border border-border bg-background px-3 text-base text-foreground"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-muted">Daireler (virgül veya boşlukla)</Text>
            <TextInput
              value={labels}
              onChangeText={setLabels}
              placeholder="Örn. 1, 2, 3, 4, 5"
              placeholderTextColor={colors.textMuted}
              multiline
              className="min-h-11 rounded-2xl border border-border bg-background px-3 py-2.5 text-base text-foreground"
            />
          </View>

          <Button label="Envantere Ekle" icon={Plus} onPress={onAdd} loading={saving} />
        </Card>

        {/* Envanter listesi */}
        {isLoading ? null : grouped.length === 0 ? (
          <View className="mt-8">
            <EmptyState
              icon={DoorClosed}
              title="Envanter boş"
              description="Yukarıdan bina ve daireleri ekleyin. Sonra boş daireleri dokunarak işaretleyin."
            />
          </View>
        ) : (
          grouped.map((g) => (
            <View key={g.name} className="mt-6">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-base font-bold text-foreground">{g.name}</Text>
                <Text className="text-xs font-semibold text-muted">
                  {g.list.length} daire · {g.vacant} boş
                </Text>
              </View>
              <View className="gap-2">
                {g.list.map((u) => {
                  const isVacant = u.effectiveStatus === 'vacant';
                  const locked = u.hasContract; // sözleşmeli → kilitli
                  return (
                    <Pressable
                      key={u.id}
                      onPress={explainStatus}
                      className={`flex-row items-center gap-3 rounded-2xl border p-3 active:opacity-80 ${
                        isVacant ? 'border-border/70 bg-background' : 'border-border/60 bg-surface'
                      }`}
                    >
                      <View
                        className={`h-9 w-9 items-center justify-center rounded-xl ${
                          isVacant ? 'bg-muted/15' : 'bg-success-soft'
                        }`}
                      >
                        {isVacant ? (
                          <DoorClosed size={16} color={palette.muted} />
                        ) : (
                          <DoorOpen size={16} color={palette.success} />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-sm font-bold ${isVacant ? 'text-muted' : 'text-foreground'}`}
                        >
                          {u.block ? `${u.block} · ` : ''}
                          {u.unitLabel}
                        </Text>
                        <Text className="text-xs text-muted">
                          {locked ? 'Sözleşmeli' : isVacant ? vacancyLabel(u.vacantSince) : 'Dolu'}
                        </Text>
                      </View>
                      <View
                        className={`rounded-full px-2.5 py-1 ${
                          isVacant ? 'bg-muted/15' : 'bg-success-soft'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            isVacant ? 'text-muted' : 'text-success'
                          }`}
                        >
                          {isVacant ? 'Boş' : 'Dolu'}
                        </Text>
                      </View>
                      {locked ? (
                        <Lock size={15} color={palette.muted} />
                      ) : u.synthesized ? null : (
                        <Pressable onPress={() => setToDelete(u)} hitSlop={8} className="pl-1">
                          <Trash2 size={16} color={palette.muted} />
                        </Pressable>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <ConfirmModal
        visible={toDelete !== null}
        title="Daireyi sil"
        message={
          toDelete
            ? `${toDelete.building} ${toDelete.block ? toDelete.block + ' ' : ''}${toDelete.unitLabel} envanterden silinsin mi? (Sözleşmeler etkilenmez.)`
            : ''
        }
        confirmLabel="Sil"
        destructive
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() =>
          toDelete &&
          del.mutate(toDelete.id, {
            onSuccess: () => {
              setToDelete(null);
              toast.success('Daire silindi');
            },
            onError: (e) => toast.error(e instanceof Error ? e.message : 'Silinemedi'),
          })
        }
      />
    </SafeAreaView>
  );
}
