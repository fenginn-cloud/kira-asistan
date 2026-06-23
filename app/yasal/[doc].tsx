import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { LEGAL_DOCS } from '@/content/legal';
import { fgColor } from '@/lib/theme/useThemeColors';

export default function LegalDocScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const router = useRouter();
  const data = doc ? LEGAL_DOCS[doc] : undefined;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-2 px-5 pt-2">
        <Pressable onPress={() => router.back()} className="h-10 w-10 justify-center">
          <ArrowLeft size={24} color={fgColor()} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
          {data?.title ?? 'Yasal'}
        </Text>
      </View>

      {!data ? (
        <EmptyState icon={FileText} title="Belge bulunamadı" />
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-12" showsVerticalScrollIndicator={false}>
          <Text className="mt-2 text-xs text-muted">Son güncelleme: {data.updated}</Text>

          {data.sections.map((s, i) => (
            <View key={i} className="mt-4">
              {s.heading ? (
                <Text className="mb-1 text-base font-bold text-foreground">{s.heading}</Text>
              ) : null}
              <Text className="text-sm leading-6 text-foreground">{s.body}</Text>
            </View>
          ))}

          <Text className="mt-8 text-[11px] leading-4 text-muted">
            Bu metin bilgilendirme amaçlı bir taslaktır; bağlayıcı nihai sürüm için
            hukuki danışmanlık alınması önerilir.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
