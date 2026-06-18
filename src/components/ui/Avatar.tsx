import { Text, View } from 'react-native';
import { getInitials } from '@/lib/utils/format';

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 44 }: AvatarProps) {
  return (
    <View
      className="items-center justify-center rounded-full bg-primary-100"
      style={{ width: size, height: size }}
    >
      <Text className="font-bold text-primary-700" style={{ fontSize: size / 2.6 }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
