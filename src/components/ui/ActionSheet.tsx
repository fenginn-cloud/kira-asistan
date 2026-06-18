import { Modal, Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { palette } from '@/lib/theme/colors';

export interface ActionSheetItem {
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  items: ActionSheetItem[];
  onClose: () => void;
}

export function ActionSheet({ visible, title, items, onClose }: ActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/40">
        <Pressable onPress={(e) => e.stopPropagation()} className="p-3 pb-8">
          <View className="overflow-hidden rounded-3xl bg-surface">
            {title ? (
              <Text className="px-5 pb-2 pt-4 text-center text-xs font-medium text-muted">
                {title}
              </Text>
            ) : null}
            {items.map((item, idx) => {
              const Icon = item.icon;
              const color = item.destructive ? palette.danger : palette.primary;
              return (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    onClose();
                    item.onPress();
                  }}
                  className={`flex-row items-center gap-3 px-5 py-4 active:bg-background ${
                    idx > 0 ? 'border-t border-border/60' : ''
                  }`}
                >
                  {Icon ? <Icon size={20} color={color} /> : null}
                  <Text
                    className={`text-base font-medium ${
                      item.destructive ? 'text-danger' : 'text-[#0B1220]'
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
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
