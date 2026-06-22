import { Modal, Pressable, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { palette } from '@/lib/theme/colors';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Onayla',
  cancelLabel = 'Vazgeç',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} className="flex-1 items-center justify-center bg-black/40 px-8">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm items-center rounded-3xl bg-surface p-6"
        >
          <View
            className={`h-14 w-14 items-center justify-center rounded-full ${
              destructive ? 'bg-danger-soft' : 'bg-primary-50'
            }`}
          >
            <AlertTriangle size={26} color={destructive ? palette.danger : palette.primary} />
          </View>
          <Text className="mt-4 text-center text-lg font-bold text-foreground">{title}</Text>
          {message ? (
            <Text className="mt-2 text-center text-sm text-muted">{message}</Text>
          ) : null}

          <View className="mt-6 w-full gap-2">
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              className={`h-12 items-center justify-center rounded-2xl active:opacity-80 ${
                destructive ? 'bg-danger' : 'bg-primary'
              } ${loading ? 'opacity-60' : ''}`}
            >
              <Text className="text-base font-semibold text-white">{confirmLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onCancel}
              className="h-12 items-center justify-center rounded-2xl bg-background active:opacity-80"
            >
              <Text className="text-base font-semibold text-muted">{cancelLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
