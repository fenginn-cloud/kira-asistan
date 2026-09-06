import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, DoorClosed, Lock, Plus } from 'lucide-react-native';
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

type Filter = 'all' | 'occupied' | 'vacant';

export default function UnitsInventoryScreen() {
  const router = useRouter();
  const toast = useToast();
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const { width } = useWindowDimensions();

  const { data: contracts = [] } = useContracts();
  const { data: units = [], isLoading } = useUnits();
  const upsert = useUpsertUnit();
  const del = useDeleteUnit();

  const [building, setBuilding] = useState('');
  const [block, setBlock] = useState('');
  const [labels, setLabels] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<EffectiveUnit | null>(null);
  const [toDelete, setToDelete] = useState<EffectiveUnit | null>(null);

  // 4 sütunlu ızgara için kutucuk genişliği (px-5 = 40 kenar, 8 boşluk).
  const cols = 4;
  const gap = 8;
  const maxW = Math.min(width, 560);
  const cellW = Math.floor((maxW - 40 - (cols - 1) * gap) / cols);

  const buildingSuggestions = useMemo(() => {
    const names = [...new Set(contracts.map((c) => buildingName(c.propertyName)).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b, 'tr'));
  }, [contracts]);

  const merged = useMemo(() => mergeUnitsWithContracts(units, contracts), [units, contracts]);

  const totals = useMemo(() => {
    const occupied = merged.filter((u) => u.effectiveStatus === 'occupied').length;
    return { all: merged.length, occupied, vacant: merged.length - occupied };
  }, [merged]);

  // Bina → blok gruplama (filtre uygulanmış).
  const grouped = useMemo(() => {
    const pass = (u: EffectiveUnit) =>
      filter === 'all' ? true : u.effectiveStatus === filter;
    const byBuilding = new Map<string, EffectiveUnit[]>();
    for (const u of merged) {
      if (!pass(u)) continue;
      const arr = byBuilding.get(u.building);
      if (arr) arr.push(u);
      else byBuilding.set(u.building, [u]);
    }
    return [...byBuilding.entries()]
      .map(([name, list]) => {
        const byBlock = new Map<string, EffectiveUnit[]>();
        for (const u of list) {
          const b = u.block || '';
          const arr = byBlock.get(b);
          if (arr) arr.push(u);
          else byBlock.set(b, [u]);
        }
        const blocks = [...byBlock.entries()]
          .map(([b, l]) => ({
            block: b,
            list: l.sort((x, y) => x.unitLabel.localeCompare(y.unitLabel, 'tr', { numeric: true })),
          }))
          .sort((a, b) => a.block.localeCompare(b.block, 'tr', { numeric: true }));
        return {
          name,
          blocks,
          total: list.length,
          vacant: list.filter((u) => u.effectiveStatus === 'vacant').length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [merged, filter]);

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 items-center justify-center p-6">
          <EmptyState icon={AlertTriangle} title="Yetkiniz yok" description="Bu ekran yalnızca yöneticiler içindir." />
        </View>
      </SafeAreaView>
    );
  }

  const parseLabels = (raw: string) =>
    [...new Set(raw.split(/[\n,]+/).flatMap((s) => s.split(/\s+/)).map((s) => s.trim()).filter(Boolean))];

  const onAdd = async () => {
    const b = building.trim();
    const list = parseLabels(labels);
    if (!b) return toast.error('Bina adı girin.');
    if (list.length === 0) return toast.error('En az bir daire no girin (ör. 1, 2, 3).');
    setSaving(true);
    try {
      for (const label of list) {
        await upsert.mutateAsync({ building: b, block: block.trim(), unitLabel: label });
      }
      toast.success(`${list.length} daire eklendi`);
      setLabels('');
      setShowAdd(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eklenemedi');
    } finally {
      setSaving(false);
    }
  };

  const onCell = (u: EffectiveUnit) => setSelected(u);

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'Tümü', count: totals.all },
    { key: 'occupied', label: 'Dolu', count: totals.occupied },
    { key: 'vacant', label: 'Boş', count: totals.vacant },
  ];

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
          <Text className="flex-1 text-2xl font-bold text-foreground">Daire Envanteri</Text>
          <Pressable
            onPress={() => setShowAdd((s) => !s)}
            className="h-10 flex-row items-center gap-1.5 rounded-2xl bg-primary px-3.5 active:opacity-80"
          >
            <Plus size={16} color="#FFFFFF" />
            <Text className="text-sm font-semibold text-white">Daire Ekle</Text>
          </Pressable>
        </View>

        {/* Ekleme formu (katlanır) */}
        {showAdd ? (
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
            <View className="flex-row gap-3">
              <View className="w-24 gap-1.5">
                <Text className="text-sm font-medium text-muted">Blok</Text>
                <TextInput
                  value={block}
                  onChangeText={setBlock}
                  placeholder="A / —"
                  placeholderTextColor={colors.textMuted}
                  className="h-11 rounded-2xl border border-border bg-background px-3 text-base text-foreground"
                />
              </View>
              <View className="flex-1 gap-1.5">
                <Text className="text-sm font-medium text-muted">Daireler</Text>
                <TextInput
                  value={labels}
                  onChangeText={setLabels}
                  placeholder="1, 2, 3, 4, 5"
                  placeholderTextColor={colors.textMuted}
                  className="h-11 rounded-2xl border border-border bg-background px-3 text-base text-foreground"
                />
              </View>
            </View>
            <Button label="Envantere Ekle" icon={Plus} onPress={onAdd} loading={saving} />
          </Card>
        ) : null}

        {/* Filtre (Tümü / Dolu / Boş) */}
        {merged.length > 0 ? (
          <View className="mt-4 flex-row gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const tone = active
                ? f.key === 'occupied'
                  ? 'bg-success'
                  : f.key === 'vacant'
                    ? 'bg-muted'
                    : 'bg-primary'
                : f.key === 'occupied'
                  ? 'bg-success-soft'
                  : f.key === 'vacant'
                    ? 'bg-muted/15'
                    : 'bg-surface border border-border';
              const txt = active
                ? 'text-white'
                : f.key === 'occupied'
                  ? 'text-success'
                  : 'text-muted';
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  className={`flex-1 items-center rounded-2xl py-2.5 ${tone}`}
                >
                  <Text className={`text-sm font-bold ${txt}`}>
                    {f.label} · {f.count}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Izgara */}
        {isLoading ? null : merged.length === 0 ? (
          <View className="mt-8">
            <EmptyState
              icon={DoorClosed}
              title="Envanter boş"
              description="Sağ üstteki 'Daire Ekle' ile bina ve daireleri girin."
            />
          </View>
        ) : grouped.length === 0 ? (
          <View className="mt-8">
            <EmptyState icon={DoorClosed} title="Bu filtrede daire yok" />
          </View>
        ) : (
          grouped.map((g) => (
            <View key={g.name} className="mt-6">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-base font-bold text-foreground">{g.name}</Text>
                <Text className="text-xs font-semibold text-muted">
                  {g.total} daire · {g.vacant} boş
                </Text>
              </View>

              {g.blocks.map((blk) => (
                <View key={blk.block} className="mb-1.5">
                  {blk.block ? (
                    <Text className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                      {blk.block} Blok
                    </Text>
                  ) : null}
                  <View className="flex-row flex-wrap" style={{ gap }}>
                    {blk.list.map((u) => {
                      const vacant = u.effectiveStatus === 'vacant';
                      return (
                        <Pressable
                          key={u.id}
                          onPress={() => onCell(u)}
                          style={{ width: cellW }}
                          className={`items-center justify-center rounded-2xl border py-3 active:opacity-80 ${
                            vacant
                              ? 'border-border/70 bg-background'
                              : 'border-success/30 bg-success-soft'
                          }`}
                        >
                          <Text
                            className={`text-lg font-extrabold ${
                              vacant ? 'text-muted' : 'text-success'
                            }`}
                            numberOfLines={1}
                          >
                            {u.unitLabel}
                          </Text>
                          <View className="mt-0.5 flex-row items-center gap-1">
                            {u.hasContract ? <Lock size={9} color={palette.muted} /> : null}
                            <Text
                              className={`text-[10px] font-semibold ${
                                vacant ? 'text-muted' : 'text-success'
                              }`}
                            >
                              {vacant ? 'Boş' : 'Dolu'}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Daire detay / işlem sayfası */}
      {selected ? (
        <Pressable
          onPress={() => setSelected(null)}
          className="absolute inset-0 justify-end bg-black/40"
        >
          <Pressable onPress={(e) => e.stopPropagation()} className="rounded-t-3xl bg-surface p-5 pb-8">
            <View className="mb-3 items-center">
              <View className="h-1.5 w-10 rounded-full bg-border" />
            </View>
            <Text className="text-lg font-bold text-foreground">
              {selected.building}
              {selected.block ? ` · ${selected.block} Blok` : ''} · Daire {selected.unitLabel}
            </Text>
            <Text className="mt-1 text-sm text-muted">
              {selected.hasContract
                ? 'Dolu — aktif sözleşmeli. Durum sözleşmeye göre otomatik belirlenir.'
                : `Boş — ${vacancyLabel(selected.vacantSince)}. Sözleşme yapılınca otomatik dolu olur.`}
            </Text>
            {!selected.hasContract && !selected.synthesized ? (
              <Pressable
                onPress={() => {
                  const u = selected;
                  setSelected(null);
                  setTimeout(() => setToDelete(u), 0);
                }}
                className="mt-4 items-center rounded-2xl bg-danger-soft py-3 active:opacity-80"
              >
                <Text className="text-sm font-bold text-danger">Bu daireyi envanterden sil</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setSelected(null)} className="mt-2 items-center py-2">
              <Text className="text-sm font-semibold text-muted">Kapat</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      ) : null}

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
