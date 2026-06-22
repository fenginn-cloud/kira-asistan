import { Text, View } from 'react-native';

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View className="mb-3 mt-6 flex-row items-center justify-between">
      <Text className="text-lg font-bold text-foreground">{title}</Text>
      {action}
    </View>
  );
}
