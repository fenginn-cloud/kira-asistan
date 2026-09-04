import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Pencil, StickyNote, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useUpdateContract } from '@/features/contracts/hooks';
import { errorMessage } from '@/lib/utils/error';
import { palette } from '@/lib/theme/colors';
import type { Contract } from '@/types';

/**
 * Sözleşme kartı üzerinde görünen kısa hızlı not. Karta dokunmadan (detaya
 * girmeden) not eklenir/düzenlenir. Kendi içinde kaydeder (useUpdateContract),
 * böylece her kart bileşeninde tek satırla kullanılabilir.
 */
export function CardNote({ contract }: { contract: Contract }) {
  const note = contract.cardNote?.trim() || '';
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(note);
  const update = useUpdateContract();
  const toast = useToast();

  const openEditor = () => {
    setText(note);
    setOpen(true);
  };

  const save = () => {
    update.mutate(
      { id: contract.id, patch: { cardNote: text.trim() || null } },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success(text.trim() ? 'Not kaydedildi' : 'Not silindi');
        },
        onError: (e) => toast.error(errorMessage(e, 'Not kaydedilemedi')),
      }
    );
  };

  return (
    <>
      {note ? (
        <Pressable
          onPress={openEditor}
          className="mt-3 flex-row items-start gap-2 rounded-2xl bg-warning-soft px-3 py-2 active:opacity-80"
        >
          <StickyNote size={14} color={palette.warning} />
          <Text className="flex-1 text-xs leading-4 text-foreground">{note}</Text>
          <Pencil size={12} color={palette.muted} />
        </Pressable>
      ) : (
        <Pressable
          onPress={openEditor}
          className="mt-3 flex-row items-center gap-1.5 self-start active:opacity-70"
        >
          <StickyNote size={13} color={palette.muted} />
          <Text className="text-xs font-medium text-muted">Not ekle</Text>
        </Pressable>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 items-center justify-center bg-black/40 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full rounded-3xl bg-surface p-5"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Kart Notu</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <X size={20} color={palette.muted} />
              </Pressable>
            </View>
            <Text className="mt-1 text-xs text-muted" numberOfLines={1}>
              {[contract.propertyName, contract.block, contract.unit].filter(Boolean).join(' ')} —{' '}
              {contract.tenantName}
            </Text>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Örn: Kira günü bugün ama 10 gün sonra ödeyecek."
              placeholderTextColor="#9CA3AF"
              multiline
              autoFocus
              maxLength={280}
              className="mt-4 min-h-[96px] rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground"
              textAlignVertical="top"
            />

            <View className="mt-4">
              <Button label="Kaydet" onPress={save} loading={update.isPending} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
