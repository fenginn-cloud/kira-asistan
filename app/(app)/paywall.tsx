import { Text, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Crown } from 'lucide-react-native';
import { fgColor } from '@/lib/theme/useThemeColors';
import { Card } from '@/components/ui/Card';
import { palette } from '@/lib/theme/colors';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { PLAN_LABELS } from '@/features/subscription/entitlement';

const PLANS: { id: 'pro' | 'business'; title: string; tagline: string; features: string[] }[] = [
  {
    id: 'pro',
    title: 'Pro',
    tagline: 'Sınırsız sözleşme, tek kullanıcı',
    features: ['Sınırsız sözleşme', 'Tüm hatırlatmalar', 'İstatistikler ve raporlar'],
  },
  {
    id: 'business',
    title: 'Business',
    tagline: 'Ekip ile sınırsız kullanım',
    features: [
      'Sınırsız sözleşme',
      'Personel / ekip yönetimi',
      'Excel senkronizasyonu',
      'Öncelikli destek',
    ],
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const entitlement = useEntitlement();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 pt-2">
        <Pressable onPress={() => router.back()} className="h-10 w-10 justify-center">
          <ArrowLeft size={24} color={fgColor()} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-6 pb-10" showsVerticalScrollIndicator={false}>
        <View className="items-center">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary">
            <Crown size={30} color="#FFFFFF" />
          </View>
          <Text className="mt-4 text-2xl font-bold text-foreground">Planınızı yükseltin</Text>
          <Text className="mt-2 text-center text-sm text-muted">
            Ücretsiz planda en fazla 3 sözleşme ekleyebilirsiniz. Sınırsız sözleşme ve
            ekip özellikleri için yükseltin.
          </Text>
        </View>

        <View className="mt-6 gap-4">
          {PLANS.map((p) => (
            <Card key={p.id}>
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-foreground">{p.title}</Text>
                {entitlement.plan === p.id ? (
                  <View className="rounded-full bg-success-soft px-3 py-1">
                    <Text className="text-xs font-semibold text-success">Mevcut plan</Text>
                  </View>
                ) : null}
              </View>
              <Text className="mt-1 text-sm text-muted">{p.tagline}</Text>
              <View className="mt-3 gap-2">
                {p.features.map((f) => (
                  <View key={f} className="flex-row items-center gap-2">
                    <Check size={16} color={palette.primary} />
                    <Text className="text-sm text-foreground">{f}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ))}
        </View>

        <View className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <Text className="text-center text-sm text-muted">
            Uygulama içi satın alma yakında etkinleştirilecek. Şimdiden yükseltmek için
            bizimle iletişime geçebilirsiniz.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
