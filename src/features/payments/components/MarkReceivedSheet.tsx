import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CheckCircle2, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatMonth } from '@/lib/utils/format';
import { useThemeColors } from '@/lib/theme/useThemeColors';
import { palette } from '@/lib/theme/colors';
import type { Contract } from '@/types';

interface Props {
  contract: Contract | null;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (note: string | null) => void;
}

/** One-tap "Alındı" onayı — isteğe bağlı not. */
export function MarkReceivedSheet({ contract, submitting, onClose, onConfirm }: Props) {
  const colors = useThemeColors();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (contract) setNote('');
  }, [contract?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const month = formatMonth(new Date().toISOString().slice(0, 10));
  const loc = contract
    ? [contract.propertyName, contract.block, contract.unit].filter(Boolean).join(' ')
    : '';

  return (
    <Modal
      visible={contract !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="rounded-t-[28px] bg-surface p-5 pb-8">
          {/* Tutma çubuğu (Stitch) */}
          <View className="mb-3 items-center">
            <View className="h-1.5 w-10 rounded-full bg-border" />
          </View>

          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-2xl bg-success-soft">
                <CheckCircle2 size={18} color={palette.success} />
              </View>
              <Text className="text-lg font-bold text-foreground">Kira Alındı</Text>
            </View>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center">
              <X size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {contract ? (
            <View className="mb-4 rounded-2xl bg-background p-4">
              <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                {loc} • {contract.tenantName}
              </Text>
              <Text className="mt-0.5 text-xs capitalize text-muted">{month}</Text>
              <Text className="mt-2 text-2xl font-extrabold text-foreground">
                {formatCurrency(contract.rentAmount + contract.duesAmount)}
              </Text>
            </View>
          ) : null}

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-muted">Not (opsiyonel)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Örn. elden alındı, havale vb."
              placeholderTextColor={colors.textMuted}
              className="rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground"
            />
          </View>

          <View className="mt-4">
            <Button
              label="Alındı Olarak İşaretle"
              icon={CheckCircle2}
              loading={submitting}
              onPress={() => onConfirm(note.trim() || null)}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
