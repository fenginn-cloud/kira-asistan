import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { palette } from '@/lib/theme/colors';
import type { StatusFilter, SortKey } from '@/store/contractsViewStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  statusFilters: { key: StatusFilter; label: string }[];
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
  propertyOptions: string[];
  property: string;
  onProperty: (p: string) => void;
  /** Seçili mülkün blokları ('all' + blok adları). Boşsa blok bölümü gizlenir. */
  blockOptions: string[];
  block: string;
  onBlock: (b: string) => void;
  sortOrder: SortKey[];
  sort: SortKey;
  sortLabels: Record<SortKey, string>;
  onSort: (s: SortKey) => void;
  onClear: () => void;
}

/**
 * Stitch "Filtreler Bottom Sheet" — mevcut filtre store'unu sürer (yeni davranış
 * yok; satır-içi çipler de çalışmaya devam eder). Durum / Mülk / Sıralama.
 */
export function FilterBottomSheet({
  visible,
  onClose,
  statusFilters,
  status,
  onStatus,
  propertyOptions,
  property,
  onProperty,
  blockOptions,
  block,
  onBlock,
  sortOrder,
  sort,
  sortLabels,
  onSort,
  onClear,
}: Props) {
  const { height } = useWindowDimensions();

  const Chip = ({
    active,
    label,
    onPress,
  }: {
    active: boolean;
    label: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 ${
        active ? 'border-primary bg-primary-50' : 'border-border bg-surface'
      }`}
    >
      {active ? <Check size={13} color={palette.primary} /> : null}
      <Text className={`text-sm font-semibold ${active ? 'text-primary-700' : 'text-muted'}`}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/40">
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            className="rounded-t-[28px] bg-surface px-5 pb-8 pt-3"
            style={{ maxHeight: height * 0.85 }}
          >
            {/* Grabber + başlık */}
            <View className="items-center">
              <View className="h-1.5 w-10 rounded-full bg-border" />
            </View>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Filtreler</Text>
              <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center">
                <X size={22} color={palette.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mt-2">
              {/* Durum */}
              <Text className="mb-2 mt-3 text-xs font-bold uppercase tracking-wide text-muted">
                Durum
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {statusFilters.map((f) => (
                  <Chip
                    key={f.key}
                    active={status === f.key}
                    label={f.label}
                    onPress={() => onStatus(f.key)}
                  />
                ))}
              </View>

              {/* Mülk */}
              {propertyOptions.length > 1 ? (
                <>
                  <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted">
                    Mülk
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {propertyOptions.map((p) => (
                      <Chip
                        key={p}
                        active={property === p}
                        label={p === 'all' ? 'Tüm Mülkler' : p}
                        onPress={() => onProperty(p)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {/* Blok — yalnızca bir mülk seçiliyken ve o mülkün blokları varsa */}
              {property !== 'all' && blockOptions.length > 1 ? (
                <>
                  <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted">
                    Blok
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {blockOptions.map((b) => (
                      <Chip
                        key={b}
                        active={block === b}
                        label={b === 'all' ? 'Tüm Bloklar' : `Blok ${b}`}
                        onPress={() => onBlock(b)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {/* Sıralama */}
              <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted">
                Sıralama
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {sortOrder.map((k) => (
                  <Chip key={k} active={sort === k} label={sortLabels[k]} onPress={() => onSort(k)} />
                ))}
              </View>
            </ScrollView>

            {/* Aksiyonlar */}
            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={onClear}
                className="flex-1 items-center rounded-2xl bg-background py-3.5 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-muted">Temizle</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                className="flex-1 items-center rounded-2xl bg-primary py-3.5 active:opacity-90"
              >
                <Text className="text-sm font-bold text-white">Uygula</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
