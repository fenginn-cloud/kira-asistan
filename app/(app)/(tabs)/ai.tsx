import { Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sparkles, Lock } from 'lucide-react-native';
import { AIAssistantChat } from '@/components/AIAssistantChat';
import { useEntitlement } from '@/features/subscription/useEntitlement';

export default function AIScreen() {
  const entitlement = useEntitlement();
  const router = useRouter();

  if (entitlement.limits.ai) {
    return <AIAssistantChat />;
  }

  // Free plan: AI is a Pro/Business feature — show a locked upsell.
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 items-center justify-center px-8">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary">
          <Sparkles size={36} color="#FFFFFF" />
        </View>
        <View className="mt-5 flex-row items-center gap-2">
          <Lock size={16} color="#9CA3AF" />
          <Text className="text-lg font-bold text-foreground">AI Asistan</Text>
        </View>
        <Text className="mt-2 text-center text-sm text-muted">
          AI Asistan; kim ödemedi, geciken alacak, aylık tahsilat gibi soruları
          portföyünüz üzerinde yanıtlar. Pro ve Business planlarına dahildir.
        </Text>
        <Pressable
          onPress={() => router.push('/(app)/paywall?feature=ai')}
          className="mt-6 rounded-2xl bg-primary px-6 py-3 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">Planları Gör</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
