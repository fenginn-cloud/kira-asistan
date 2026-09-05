import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export interface QuickAction {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  /** Icon frame tint (NativeWind bg class). */
  chip: string;
  onPress: () => void;
}

/**
 * Stitch "Quick Action Grid" — 4 sütun. Bağımsız AI Danışman aksiyonu YOK;
 * yalnızca mevcut, gerçek ürün akışlarına götüren aksiyonlar.
 */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <View className="mt-6">
      <Text className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
        Hızlı İşlemler
      </Text>
      <View className="flex-row gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Pressable
              key={a.key}
              onPress={a.onPress}
              className="flex-1 items-center active:opacity-80"
            >
              <View className={`h-14 w-14 items-center justify-center rounded-2xl ${a.chip}`}>
                <Icon size={22} color={a.color} />
              </View>
              <Text
                className="mt-1.5 text-center text-xs font-medium text-foreground"
                numberOfLines={1}
              >
                {a.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
