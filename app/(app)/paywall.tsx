import { Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Minus, RotateCcw, Star } from 'lucide-react-native';
import { fgColor } from '@/lib/theme/useThemeColors';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { palette } from '@/lib/theme/colors';
import { formatCurrency } from '@/lib/utils/format';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import {
  PLANS,
  FEATURE_MATRIX,
  type FeatureRow,
  type PlanInfo,
} from '@/features/subscription/plans';
import {
  purchasesAvailable,
  usePackageFor,
  usePaywallActions,
  purchaseErrorMessage,
} from '@/features/subscription/usePurchases';
import type { PaidPlanId } from '@/services/purchases';

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
      title: 'Sözleşme sınırına ulaştınız',
      subtitle: 'Portföyünüzü büyütün. Size uygun planı seçin.',
    };
  }
  return {
    title: 'Planınızı yükseltin',
    subtitle: 'Portföyünüzü büyütün, tüm özelliklerin kilidini açın.',
  };
}

// Kartlarda gösterilecek planlar (üstten alta).
const CARDS: PlanInfo[] = [PLANS.free, PLANS.pro, PLANS.business];

export default function PaywallScreen() {
  const router = useRouter();
  const toast = useToast();
  const entitlement = useEntitlement();
  const params = useLocalSearchParams<{ feature?: string; reason?: string }>();
  const header = paywallHeader(params.feature, params.reason, entitlement.plan);
  const [showTable, setShowTable] = useState(false);
  const { buy, restore, buying, restoring, buyingPlan } = usePaywallActions();

  async function handleBuy(planId: PaidPlanId) {
    try {
      const outcome = await buy(planId);
      if (outcome.status === 'success') {
        toast.success(planId === 'pro' ? 'Pro planınız aktif!' : 'Business planınız aktif!');
        router.back();
      } else if (outcome.status === 'pending') {
        toast.info('Satın alma onay bekliyor. Onaylandığında planınız açılacak.');
      } else if (outcome.status === 'error') {
        toast.error(purchaseErrorMessage(outcome));
      }
      // 'cancelled' → kullanıcı vazgeçti; sessiz geç (hata gösterme).
    } catch {
      toast.error('Satın alma tamamlanamadı. Lütfen tekrar deneyin.');
    }
  }

  async function handleRestore() {
    try {
      const active = await restore();
      if (active.length > 0) {
        toast.success('Aboneliğiniz geri yüklendi.');
        router.back();
      } else {
        toast.info('Geri yüklenecek aktif abonelik bulunamadı.');
      }
    } catch {
      toast.error('Geri yükleme başarısız. Lütfen tekrar deneyin.');
    }
  }

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

        {/* Web / satın alma kapalı bilgilendirmesi */}
        {!purchasesAvailable ? (
          <View className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-center text-sm text-muted">
              Planınızı <Text className="font-semibold text-foreground">mobil uygulama</Text>{' '}
              üzerinden yükseltebilirsiniz. Satın aldığınız plan bu hesapla web dahil her yerde
              geçerli olur.
            </Text>
          </View>
        ) : null}

        {/* Plan kartları */}
        <View className="mt-8 gap-6">
          {CARDS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={entitlement.plan === plan.id}
              buying={buying}
              buyingPlan={buyingPlan}
              onBuy={handleBuy}
            />
          ))}
        </View>

        {/* Satın alımları geri yükle (yalnızca satın alma etkinse) */}
        {purchasesAvailable ? (
          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            className="mt-6 flex-row items-center justify-center gap-2 py-2"
          >
            {restoring ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <RotateCcw size={16} color={palette.primary} />
            )}
            <Text className="text-sm font-semibold text-primary-700">
              Satın Alımları Geri Yükle
            </Text>
          </Pressable>
        ) : null}

        {/* Tüm özellikleri gör — karşılaştırma tablosu */}
        <Pressable
          onPress={() => setShowTable((v) => !v)}
          className="mt-4 flex-row items-center justify-center gap-1 py-2"
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
          <Text className="text-center text-xs text-muted">
            Abonelikler yıllık olarak faturalanır ve dönem sonunda otomatik yenilenir. Yenilemeyi
            istediğiniz zaman mağaza hesabınızdan iptal edebilirsiniz; erişiminiz dönem sonuna
            kadar devam eder.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  plan,
  current,
  buying,
  buyingPlan,
  onBuy,
}: {
  plan: PlanInfo;
  current: boolean;
  buying: boolean;
  buyingPlan: PaidPlanId | null;
  onBuy: (planId: PaidPlanId) => void;
}) {
  const popular = !!plan.recommended;
  const isPaid = plan.id === 'pro' || plan.id === 'business';
  // Mağazadan gelen LOKAL fiyat (varsa). Yoksa katalog fiyatı fallback olarak.
  const storePkg = usePackageFor(plan.id as PaidPlanId);
  const storePrice = isPaid ? storePkg?.priceString : undefined;
  const thisBuying = buying && buyingPlan === plan.id;

  // Satın alma butonu yalnızca: satın alma etkin + mağaza paketi (fiyatı) VAR +
  // bu plan mevcut değil. Fiyat mağazadan gelmiyorsa YANLIŞ fiyatla satmayız.
  const canBuy = purchasesAvailable && isPaid && !current && !!storePkg;

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
            {plan.price ? (
              <>
                <Text className="text-4xl font-extrabold tracking-tight text-foreground">
                  {storePrice ?? formatCurrency(plan.price.yearly)}
                </Text>
                <Text className="mt-1 text-xs text-muted">
                  yıllık{storePrice ? '' : ' • yaklaşık'}
                </Text>
              </>
            ) : (
              <>
                <Text className="text-4xl font-extrabold tracking-tight text-foreground">
                  Ücretsiz
                </Text>
                <Text className="mt-1 text-xs text-muted">Süre sınırı yok</Text>
              </>
            )}
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
            ) : plan.id === 'free' ? (
              <View className="items-center rounded-2xl border border-border bg-background py-3">
                <Text className="text-base font-semibold text-muted">Ücretsiz</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => canBuy && onBuy(plan.id as PaidPlanId)}
                disabled={!canBuy || thisBuying}
                className={`items-center justify-center rounded-2xl py-3 ${
                  popular ? 'bg-primary' : 'border border-primary bg-surface'
                } ${!canBuy ? 'opacity-60' : ''}`}
              >
                {thisBuying ? (
                  <ActivityIndicator size="small" color={popular ? '#FFFFFF' : palette.primary} />
                ) : (
                  <Text
                    className={`text-base font-semibold ${
                      popular ? 'text-white' : 'text-primary-700'
                    }`}
                  >
                    {!purchasesAvailable
                      ? 'Mobil uygulamadan yükseltin'
                      : !storePkg
                        ? 'Yakında'
                        : `${plan.name}'a Yükselt`}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
