import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { foldSearch } from '@/lib/utils/property';
import { palette } from '@/lib/theme/colors';
import type { Contract } from '@/types';

interface Props {
  visible: boolean;
  contracts: Contract[];
  onClose: () => void;
  onSelect: (contract: Contract | null) => void;
  /** Show a "no contract" row at the top. */
  allowNone?: boolean;
  noneLabel?: string;
}

const label = (c: Contract) => [c.propertyName, c.block, c.unit].filter(Boolean).join(' ');

/**
 * Searchable contract picker with live suggestions. Type a tenant name or a
 * property/block to filter; results are alphabetical (numeric-aware).
 */
export function ContractPicker({
  visible,
  contracts,
  onClose,
  onSelect,
  allowNone,
  noneLabel = 'Sözleşme seçilmedi',
}: Props) {
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState('');

  const sorted = useMemo(
    () =>
      [...contracts].sort((a, b) =>
        label(a).localeCompare(label(b), 'tr', { numeric: true })
      ),
    [contracts]
  );

  const results = useMemo(() => {
    const q = foldSearch(query.trim());
    if (!q) return sorted;
    return sorted.filter((c) =>
      foldSearch(`${label(c)} ${c.tenantName} ${c.tenantPhone ?? ''}`).includes(q)
    );
  }, [sorted, query]);

  const pick = (c: Contract | null) => {
    setQuery('');
    onClose();
    onSelect(c);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/40">
        <Pressable onPress={(e) => e.stopPropagation()} className="p-3 pb-8">
          <View
            className="overflow-hidden rounded-3xl bg-surface"
            style={{ maxHeight: height * 0.8 }}
          >
            <Text className="px-5 pb-1 pt-4 text-center text-xs font-medium text-muted">
              Sözleşme Seç
            </Text>

            {/* Search */}
            <View className="px-3 pb-2 pt-1">
              <View className="h-12 flex-row items-center gap-2 rounded-2xl border border-border bg-background px-3.5">
                <Search size={18} color={palette.muted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Kiracı adı veya bina/blok yazın"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  className="flex-1 text-base text-foreground"
                />
                {query ? (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <X size={16} color={palette.muted} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              {allowNone ? (
                <Pressable
                  onPress={() => pick(null)}
                  className="border-b border-border/60 px-5 py-4 active:bg-background"
                >
                  <Text className="text-base font-medium text-muted">{noneLabel}</Text>
                </Pressable>
              ) : null}

              {results.length === 0 ? (
                <View className="px-5 py-8">
                  <Text className="text-center text-sm text-muted">Eşleşen sözleşme yok</Text>
                </View>
              ) : (
                results.map((c, idx) => (
                  <Pressable
                    key={c.id}
                    onPress={() => pick(c)}
                    className={`px-5 py-3.5 active:bg-background ${
                      idx > 0 ? 'border-t border-border/60' : ''
                    }`}
                  >
                    <Text className="text-base font-semibold text-foreground">{label(c)}</Text>
                    <Text className="mt-0.5 text-sm text-muted">{c.tenantName}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
          <Pressable
            onPress={onClose}
            className="mt-2 h-14 items-center justify-center rounded-3xl bg-surface active:opacity-80"
          >
            <Text className="text-base font-semibold text-muted">Kapat</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
