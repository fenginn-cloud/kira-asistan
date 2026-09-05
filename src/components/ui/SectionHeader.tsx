import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { palette } from '@/lib/theme/colors';

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
  /** Opsiyonel başlık ikonu — tinted çerçevede (Stitch). */
  icon?: LucideIcon;
}

export function SectionHeader({ title, action, icon: Icon }: SectionHeaderProps) {
  return (
    <View className="mb-3 mt-6 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        {Icon ? (
          <View className="h-7 w-7 items-center justify-center rounded-xl bg-primary-50">
            <Icon size={15} color={palette.primary} />
          </View>
        ) : null}
        <Text className="text-lg font-bold text-foreground">{title}</Text>
      </View>
      {action}
    </View>
  );
}
