import { Text, View } from 'react-native';
import { getInitials } from '@/lib/utils/format';

interface AvatarProps {
  name: string;
  size?: number;
  /** Seçildiyse baş harfler yerine bu emoji gösterilir (profil avatarı). */
  emoji?: string | null;
}

export function Avatar({ name, size = 44, emoji }: AvatarProps) {
  return (
    <View
      className="items-center justify-center rounded-full bg-primary-100"
      style={{ width: size, height: size }}
    >
      {emoji ? (
        <Text style={{ fontSize: size / 1.7 }}>{emoji}</Text>
      ) : (
        <Text className="font-bold text-primary-700" style={{ fontSize: size / 2.6 }}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}
