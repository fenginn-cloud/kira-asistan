import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <View className="items-center justify-center py-12">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-50">
        <Icon size={28} color="#2563EB" />
      </View>
      <Text className="mt-4 text-base font-semibold text-[#0B1220]">{title}</Text>
      {description ? (
        <Text className="mt-1 px-8 text-center text-sm text-muted">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
