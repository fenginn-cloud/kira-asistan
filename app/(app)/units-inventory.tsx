import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, DoorClosed, Lock, Plus, X } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { useContracts } from '@/features/contracts/hooks';
import { useUnits, useUpsertUnit, useUpdateUnitDetails, useDeleteUnit } from '@/features/units/hooks';
import { useAuthStore } from '@/store/authStore';
import { buildingName, foldSearch } from '@/lib/utils/property';
import { useThemeColors } from '@/lib/theme/useThemeColors';
import { palette } from '@/lib/theme/colors';
import { vacancyLabel } from '@/features/units/vacancy';
import {
  mergeUnitsWithContracts,
  buildingKey,
  buildingNameMap,
  type EffectiveUnit,
} from '@/features/units/occupancy';

type Filter = 'all' | 'occupied' | 'vacant';

// Demirbaş önerileri (tıklayınca eklenir).
const FIXTURE_SUGGESTIONS = [
  'Kombi',
  'Klima',
  'TV',
  'Baza',
  'Ocak',
  'Ankastre Fırın',
  'Davlumbaz',
  'Buzdolabı',
  'Çamaşır Makinesi',
  'Bulaşık Makinesi',
  'Gardırop',
  'Perde',
  'Su Isıtıcı',
  'Petek / Radyatör',
];

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
  const updateDetails = useUpdateUnitDetails();
  const del = useDeleteUnit();

  const [building, setBuilding] = useState('');
  const [block, setBlock] = useState('');
  const [labels, setLabels] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<EffectiveUnit | null>(null);
  const [toDelete, setToDelete] = useState<EffectiveUnit | null>(null);

  // Seçili dairenin düzenlenebilir detayları.
  const [dArea, setDArea] = useState('');
  const [dLayout, setDLayout] = useState('');
  const [dBalcony, setDBalcony] = useState(false);
  const [dTerrace, setDTerrace] = useState(false);
  const [dFixtures, setDFixtures] = useState<string[]>([]);
  const [dFixInput, setDFixInput] = useState('');
  const [dNote, setDNote] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setDArea(selected.areaM2 != null ? String(selected.areaM2) : '');
    setDLayout(selected.layout ?? '');
    setDBalcony(selected.balcony);
    setDTerrace(selected.terrace);
    setDFixtures(selected.fixtures ?? []);
    setDFixInput('');
    setDNote(selected.note ?? '');
  }, [selected]);

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

  // Envanterde eşleşmeyen aktif sözleşmeler (daire no hatalı olabilir).
  const unmatched = useMemo(() => {
    const byId = new Map(contracts.map((c) => [c.id, c]));
    return merged
      .filter((u) => u.synthesized)
      .map((u) => ({ u, tenant: (u.contractId && byId.get(u.contractId)?.tenantName) || 'Kiracı' }));
  }, [merged, contracts]);

  // Bina → blok gruplama (filtre uygulanmış).
  const grouped = useMemo(() => {
    const pass = (u: EffectiveUnit) =>
      filter === 'all' ? true : u.effectiveStatus === filter;
    // Yazıma duyarsız bina anahtarı ile grupla; görünen ad TÜM ekranlarla
    // aynı kanonik addır (buildingNameMap).
    const names = buildingNameMap(units, contracts);
    const byBuilding = new Map<string, { display: string; list: EffectiveUnit[] }>();
    for (const u of merged) {
      if (!pass(u)) continue;
      const k = buildingKey(u.building);
      const g = byBuilding.get(k);
      if (g) g.list.push(u);
      else byBuilding.set(k, { display: names.get(k) ?? u.building, list: [u] });
    }
    return [...byBuilding.values()]
      .map(({ display, list }) => {
        const name = display;
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
  }, [merged, filter, units, contracts]);

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

  const addFixtureValue = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setDFixtures((arr) =>
      arr.some((f) => f.toLocaleLowerCase('tr') === v.toLocaleLowerCase('tr')) ? arr : [...arr, v]
    );
  };
  const addFixture = () => {
    addFixtureValue(dFixInput);
    setDFixInput('');
  };

  const saveDetails = async () => {
    if (!selected) return;
    const area = dArea.trim() ? Number(dArea.replace(',', '.')) : null;
    // Kutuda yazılı kalan (henüz eklenmemiş) demirbaşı da dahil et.
    const pending = dFixInput.trim();
    const fixtures =
      pending && !dFixtures.some((f) => f.toLocaleLowerCase('tr') === pending.toLocaleLowerCase('tr'))
        ? [...dFixtures, pending]
        : dFixtures;
    const details = {
      areaM2: area != null && !Number.isNaN(area) ? area : null,
      layout: dLayout.trim() || null,
      balcony: dBalcony,
      terrace: dTerrace,
      fixtures,
      note: dNote.trim() || null,
    };
    setSavingDetails(true);
    try {
      let id = selected.id;
      // Sözleşmeden türetilmiş daire henüz envanterde yok → önce oluştur.
      if (selected.synthesized) {
        const created = await upsert.mutateAsync({
          building: selected.building,
          block: selected.block,
          unitLabel: selected.unitLabel,
        });
        id = created.id;
      }
      await updateDetails.mutateAsync({ id, details });
      toast.success('Daire bilgileri kaydedildi');
      setSelected(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSavingDetails(false);
    }
  };

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

        {/* Eşleşmeyen sözleşme uyarısı — daire no hatalı / envanterde yok */}
        {unmatched.length > 0 ? (
          <View className="mt-4 rounded-2xl border border-warning/40 bg-warning-soft p-4">
            <View className="flex-row items-center gap-2">
              <AlertTriangle size={16} color={palette.warning} />
              <Text className="flex-1 text-sm font-bold text-foreground">
                {unmatched.length} sözleşme envanterle eşleşmedi
              </Text>
            </View>
            <Text className="mt-1 text-xs text-muted">
              {'Bu sözleşmelerin daire no\'su envanterdeki bir daireyle eşleşmiyor. Sözleşmenin daire/blok bilgisini düzeltin ya da daireyi envantere ekleyin.'}
            </Text>
            <View className="mt-2 gap-1.5">
              {unmatched.slice(0, 8).map(({ u, tenant }) => (
                <View key={u.id} className="flex-row items-center justify-between">
                  <Text className="flex-1 pr-2 text-xs font-semibold text-foreground" numberOfLines={1}>
                    {u.building}
                    {u.block ? ` · ${u.block}` : ''} · {u.unitLabel || '—'}
                  </Text>
                  <Text className="text-xs text-muted" numberOfLines={1}>
                    {tenant}
                  </Text>
                </View>
              ))}
              {unmatched.length > 8 ? (
                <Text className="text-xs text-muted">+{unmatched.length - 8} daha…</Text>
              ) : null}
            </View>
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

      {/* Daire detay / düzenleme sayfası */}
      {selected ? (
        <Pressable
          onPress={() => setSelected(null)}
          className="absolute inset-0 justify-end bg-black/40"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-3xl bg-surface px-5 pb-8 pt-3"
            style={{ maxHeight: '88%' }}
          >
            <View className="mb-2 items-center">
              <View className="h-1.5 w-10 rounded-full bg-border" />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 pr-2 text-lg font-bold text-foreground" numberOfLines={1}>
                {selected.building}
                {selected.block ? ` · ${selected.block}` : ''} · Daire {selected.unitLabel}
              </Text>
              <View
                className={`rounded-full px-2.5 py-1 ${
                  selected.effectiveStatus === 'vacant' ? 'bg-muted/15' : 'bg-success-soft'
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    selected.effectiveStatus === 'vacant' ? 'text-muted' : 'text-success'
                  }`}
                >
                  {selected.effectiveStatus === 'vacant' ? 'Boş' : 'Dolu'}
                </Text>
              </View>
            </View>
            <Text className="mt-0.5 text-xs text-muted">
              {selected.hasContract
                ? 'Aktif sözleşmeli — durum otomatik.'
                : `${vacancyLabel(selected.vacantSince)} — sözleşme yapılınca otomatik dolu olur.`}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} className="mt-3" keyboardShouldPersistTaps="handled">
              {/* m² + oda tipi */}
              <View className="flex-row gap-3">
                <View className="flex-1 gap-1.5">
                  <Text className="text-sm font-medium text-muted">m²</Text>
                  <TextInput
                    value={dArea}
                    onChangeText={(t) => setDArea(t.replace(/[^\d.,]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="Örn. 85"
                    placeholderTextColor={colors.textMuted}
                    className="h-11 rounded-2xl border border-border bg-background px-3 text-base text-foreground"
                  />
                </View>
                <View className="flex-1 gap-1.5">
                  <Text className="text-sm font-medium text-muted">Oda tipi</Text>
                  <TextInput
                    value={dLayout}
                    onChangeText={setDLayout}
                    placeholder="Örn. 2+1"
                    placeholderTextColor={colors.textMuted}
                    className="h-11 rounded-2xl border border-border bg-background px-3 text-base text-foreground"
                  />
                </View>
              </View>

              {/* Balkon / Teras */}
              <View className="mt-2 flex-row gap-3">
                <View className="flex-1 flex-row items-center justify-between rounded-2xl border border-border bg-background px-3 py-2.5">
                  <Text className="text-sm text-foreground">Balkon</Text>
                  <Switch
                    value={dBalcony}
                    onValueChange={setDBalcony}
                    trackColor={{ true: palette.primary, false: palette.border }}
                  />
                </View>
                <View className="flex-1 flex-row items-center justify-between rounded-2xl border border-border bg-background px-3 py-2.5">
                  <Text className="text-sm text-foreground">Teras</Text>
                  <Switch
                    value={dTerrace}
                    onValueChange={setDTerrace}
                    trackColor={{ true: palette.primary, false: palette.border }}
                  />
                </View>
              </View>

              {/* Demirbaşlar */}
              <Text className="mb-1.5 mt-2 text-sm font-medium text-muted">Demirbaşlar</Text>
              <View className="flex-row gap-2">
                <TextInput
                  value={dFixInput}
                  onChangeText={setDFixInput}
                  onSubmitEditing={addFixture}
                  placeholder="Örn. Kombi, Ankastre ocak…"
                  placeholderTextColor={colors.textMuted}
                  className="h-11 flex-1 rounded-2xl border border-border bg-background px-3 text-base text-foreground"
                />
                <Pressable
                  onPress={addFixture}
                  className="h-11 items-center justify-center rounded-2xl bg-primary-50 px-4 active:opacity-80"
                >
                  <Plus size={18} color={palette.primary} />
                </Pressable>
              </View>

              {/* Öneriler — tıklayınca eklenir (zaten eklenenler gizli) */}
              {(() => {
                const has = (s: string) =>
                  dFixtures.some((f) => f.toLocaleLowerCase('tr') === s.toLocaleLowerCase('tr'));
                const sug = FIXTURE_SUGGESTIONS.filter((s) => !has(s));
                if (sug.length === 0) return null;
                return (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mt-2 -mx-1"
                    keyboardShouldPersistTaps="handled"
                  >
                    <View className="flex-row gap-2 px-1">
                      {sug.map((s) => (
                        <Pressable
                          key={s}
                          onPress={() => addFixtureValue(s)}
                          className="flex-row items-center gap-1 rounded-full border border-dashed border-primary/40 bg-primary-50 px-3 py-1.5 active:opacity-80"
                        >
                          <Plus size={12} color={palette.primary} />
                          <Text className="text-xs font-semibold text-primary-700">{s}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                );
              })()}

              {dFixtures.length > 0 ? (
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {dFixtures.map((f) => (
                    <View
                      key={f}
                      className="flex-row items-center gap-1.5 rounded-full bg-background px-3 py-1.5"
                    >
                      <Text className="text-xs font-semibold text-foreground">{f}</Text>
                      <Pressable onPress={() => setDFixtures((arr) => arr.filter((x) => x !== f))} hitSlop={6}>
                        <X size={13} color={palette.muted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Not */}
              <Text className="mb-1.5 mt-2 text-sm font-medium text-muted">Not (opsiyonel)</Text>
              <TextInput
                value={dNote}
                onChangeText={setDNote}
                placeholder="Ek açıklama…"
                placeholderTextColor={colors.textMuted}
                className="h-11 rounded-2xl border border-border bg-background px-3 text-base text-foreground"
              />

              <View className="mt-3 mb-1">
                <Button label="Kaydet" onPress={saveDetails} loading={savingDetails} />
              </View>

              {!selected.hasContract && !selected.synthesized ? (
                <Pressable
                  onPress={() => {
                    const u = selected;
                    setSelected(null);
                    setTimeout(() => setToDelete(u), 0);
                  }}
                  className="mt-1 items-center py-2.5"
                >
                  <Text className="text-sm font-semibold text-danger">Daireyi envanterden sil</Text>
                </Pressable>
              ) : null}
            </ScrollView>
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
