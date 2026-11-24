import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { palette } from '@/lib/theme/colors';

/** Alt sayfa başlığı: geri butonu + başlık. */
export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-3 pt-2">
      <Pressable
        onPress={() => router.back()}
        accessibilityLabel="Geri"
        className="h-9 w-9 items-center justify-center rounded-full bg-surface"
      >
        <ArrowLeft size={20} color={palette.muted} />
      </Pressable>
      <Text className="text-2xl font-bold text-foreground">{title}</Text>
    </View>
  );
}
