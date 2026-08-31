import { useState } from 'react';
import { Text, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Minus, Star } from 'lucide-react-native';
import { fgColor } from '@/lib/theme/useThemeColors';
import { Card } from '@/components/ui/Card';
import { palette } from '@/lib/theme/colors';
import { formatCurrency } from '@/lib/utils/format';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import {
  PLANS,
  FEATURE_MATRIX,
  type FeatureRow,
  type PlanInfo,
} from '@/features/subscription/plans';

function Cell({ value }: { value: FeatureRow['free'] }) {
  if (value === true) return <Check size={15} color={palette.primary} />;
  if (value === false) return <Minus size={15} color="#9CA3AF" />;
  return (
    <Text className="text-center text-[10px] font-semibold text-foreground">{value}</Text>
  );
}

/** Paywall'a hangi özellik/limit için gelindiğine göre başlık ve alt metin. */
function paywallHeader(
  feature?: string,
  reason?: string,
  plan?: string
): { title: string; subtitle: string } {
  switch (feature) {
    case 'excel':
      return {
        title: 'Excel Aktarımı',
        subtitle: 'Tek tıkla tüm sözleşmelerinizi içeri aktarın. Pro ve Business planlarına dahildir.',
      };
    case 'ai':
      return {
        title: 'AI Asistan',
        subtitle:
          'Kim ödemedi, geciken alacak, aylık tahsilat… Portföyünüz üzerinde anında yanıt. Pro ve Business’a dahildir.',
      };
    case 'team':
      return {
        title: 'Ekip Yönetimi',
        subtitle: 'Personel ekleyin, rol ve yetki verin. Business planına dahildir.',
      };
    case 'reminders':
      return {
        title: 'Gelişmiş Hatırlatmalar',
        subtitle: '7 / 3 / 1 gün önceden hatırlatmalar Pro ve Business planlarına dahildir.',
      };
    case 'stats':
      return {
        title: 'İstatistik & Finansal Özet',
        subtitle:
          'Tahsilat oranları, bina bazlı analiz ve finansal toplamlar Pro ve Business planlarına dahildir.',
      };
    case 'reports':
      return {
        title: 'Gelişmiş Raporlar',
        subtitle:
          'Aylık tahsilat, doluluk, kiralama ve komisyon performansı Pro ve Business planlarına dahildir.',
      };
  }
  if (reason === 'limit') {
    return {
      title: '3 sözleşme sınırına ulaştınız',
      subtitle: 'Portföyünüzü sınırsız yönetin. Size uygun planı seçin.',
    };
  }
  return {
    title: plan === 'free' ? 'Planınızı yükseltin' : 'Planınızı yükseltin',
    subtitle: 'Portföyünüzü büyütün, tüm özelliklerin kilidini açın.',
  };
}

// Kartlarda gösterilecek planlar (soldan sağa / üstten alta).
const CARDS: PlanInfo[] = [PLANS.free, PLANS.pro, PLANS.business];

export default function PaywallScreen() {
  const router = useRouter();
  const entitlement = useEntitlement();
  const params = useLocalSearchParams<{ feature?: string; reason?: string }>();
  const header = paywallHeader(params.feature, params.reason, entitlement.plan);
  const [isMonthly, setIsMonthly] = useState(false);
  const [showTable, setShowTable] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 pt-2">
        <Pressable onPress={() => router.back()} className="h-10 w-10 justify-center">
          <ArrowLeft size={24} color={fgColor()} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-6 pb-10" showsVerticalScrollIndicator={false}>
        {/* Başlık */}
        <View className="items-center">
          <View className="h-14 w-14 items-center justify-center rounded-3xl bg-primary shadow-sm shadow-primary/30">
            <Star size={26} color="#FFFFFF" fill="#FFFFFF" />
          </View>
          <Text className="mt-4 text-center text-2xl font-bold text-foreground">
            {header.title}
          </Text>
          <Text className="mt-2 text-center text-sm text-muted">{header.subtitle}</Text>
        </View>

        {/* Aylık / Yıllık geçişi */}
        <View className="mt-6 flex-row items-center self-center rounded-full border border-border bg-surface p-1">
          <BillingTab label="Aylık" active={isMonthly} onPress={() => setIsMonthly(true)} />
          <BillingTab
            label="Yıllık"
            active={!isMonthly}
            onPress={() => setIsMonthly(false)}
          />
        </View>

        {/* Plan kartları */}
        <View className="mt-8 gap-6">
          {CARDS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isMonthly={isMonthly}
              current={entitlement.plan === plan.id}
            />
          ))}
        </View>

        {/* Tüm özellikleri gör — karşılaştırma tablosu */}
        <Pressable
          onPress={() => setShowTable((v) => !v)}
          className="mt-8 flex-row items-center justify-center gap-1 py-2"
        >
          <Text className="text-sm font-semibold text-primary-700">
            {showTable ? 'Karşılaştırmayı gizle' : 'Tüm özellikleri gör'}
          </Text>
          {showTable ? (
            <ChevronUp size={18} color={palette.primary} />
          ) : (
            <ChevronDown size={18} color={palette.primary} />
          )}
        </Pressable>

        {showTable ? (
          <Card>
            <View className="flex-row border-b border-border pb-2">
              <Text className="flex-1 pr-1 text-[11px] font-semibold text-muted">Özellik</Text>
              <Text className="w-12 text-center text-[11px] font-semibold text-muted">Free</Text>
              <Text className="w-12 text-center text-[11px] font-semibold text-muted">Pro</Text>
              <Text className="w-16 text-center text-[11px] font-semibold text-primary-700">
                Business
              </Text>
            </View>
            {FEATURE_MATRIX.map((row) => (
              <View
                key={row.label}
                className="flex-row items-center border-b border-border/50 py-2.5"
              >
                <Text className="flex-1 pr-1 text-[11px] leading-4 text-foreground">
                  {row.label}
                </Text>
                <View className="w-12 items-center">
                  <Cell value={row.free} />
                </View>
                <View className="w-12 items-center">
                  <Cell value={row.pro} />
                </View>
                <View className="w-16 items-center">
                  <Cell value={row.business} />
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        <View className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <Text className="text-center text-sm text-muted">
            Fiyatlar yıllık faturalanır. Uygulama içi satın alma yakında etkinleştirilecek;
            şimdiden yükseltmek için bizimle iletişime geçebilirsiniz.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BillingTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-6 py-2 ${active ? 'bg-primary' : ''}`}
    >
      <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function PlanCard({
  plan,
  isMonthly,
  current,
}: {
  plan: PlanInfo;
  isMonthly: boolean;
  current: boolean;
}) {
  const popular = !!plan.recommended;
  const amount = plan.price
    ? isMonthly
      ? plan.price.monthlyEquivalent
      : plan.price.yearly
    : null;

  return (
    <View className={popular ? 'mt-3' : ''}>
      <View className="relative">
        {popular ? (
          <View className="absolute -top-3 left-0 right-0 z-10 items-center">
            <View className="flex-row items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 shadow-sm shadow-primary/30">
              <Star size={14} color="#FFFFFF" fill="#FFFFFF" />
              <Text className="text-xs font-semibold text-white">En Popüler</Text>
            </View>
          </View>
        ) : null}

        <View
          className={`rounded-3xl bg-surface p-6 ${
            popular
              ? 'border-2 border-primary shadow-lg shadow-black/10'
              : 'border border-border'
          }`}
        >
          {/* Ad + açıklama */}
          <View className="items-center">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-bold text-foreground">{plan.name}</Text>
              {current ? (
                <View className="rounded-full bg-success-soft px-2 py-0.5">
                  <Text className="text-[11px] font-semibold text-success">Mevcut</Text>
                </View>
              ) : null}
            </View>
            <Text className="mt-1.5 text-center text-sm text-muted">{plan.tagline}</Text>
          </View>

          {/* Fiyat */}
          <View className="mt-5 items-center">
            {amount !== null ? (
              <View className="flex-row items-baseline gap-1">
                <Text className="text-4xl font-extrabold tracking-tight text-foreground">
                  {formatCurrency(amount)}
                </Text>
                <Text className="text-sm font-semibold text-muted">
                  /{isMonthly ? 'ay' : 'yıl'}
                </Text>
              </View>
            ) : (
              <Text className="text-4xl font-extrabold tracking-tight text-foreground">
                Ücretsiz
              </Text>
            )}
            <Text className="mt-1 text-xs text-muted">
              {plan.price
                ? isMonthly
                  ? 'Yıllık faturalanır'
                  : 'Tek ödeme / yıl'
                : 'Süre sınırı yok'}
            </Text>
          </View>

          {/* Özellikler */}
          <View className="mt-6 gap-3">
            {plan.features.map((f) => (
              <View key={f} className="flex-row items-start gap-3">
                <Check size={18} color={palette.primary} />
                <Text className="flex-1 text-sm leading-5 text-foreground">{f}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <View className="mt-7">
            {current ? (
              <View className="items-center rounded-2xl border border-border bg-background py-3">
                <Text className="text-base font-semibold text-muted">Mevcut Planınız</Text>
              </View>
            ) : (
              <View
                className={`items-center rounded-2xl py-3 ${
                  popular ? 'bg-primary' : 'border border-primary bg-surface'
                }`}
              >
                <Text
                  className={`text-base font-semibold ${
                    popular ? 'text-white' : 'text-primary-700'
                  }`}
                >
                  {plan.id === 'free' ? 'Ücretsiz Başla' : `${plan.name}'a Yükselt`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
