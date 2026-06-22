import { Text, View } from 'react-native';

interface InfoRowProps {
  label: string;
  value: string;
  last?: boolean;
}

export function InfoRow({ label, value, last = false }: InfoRowProps) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${
        last ? '' : 'border-b border-border/60'
      }`}
    >
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="max-w-[60%] text-right text-sm font-semibold text-foreground">
        {value}
      </Text>
    </View>
  );
}
