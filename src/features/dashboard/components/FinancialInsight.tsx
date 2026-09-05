import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Zap } from 'lucide-react-native';
import { remainingDebt } from '@/lib/utils/payments';
import { formatCurrencyTRY, type DashboardFinance } from '@/lib/ledger/ledger';
import type { OpenItem, UpcomingBuckets } from '@/features/notifications/reminders';
import { palette } from '@/lib/theme/colors';

interface Props {
  finance: DashboardFinance;
  overdue: OpenItem[];
  upcoming: UpcomingBuckets;
  onPress?: () => void;
}

type Tone = 'success' | 'warning' | 'danger' | 'info';

const TONE: Record<Tone, { chip: string; icon: string }> = {
  success: { chip: 'bg-success-soft', icon: palette.success },
  warning: { chip: 'bg-warning-soft', icon: palette.warning },
  danger: { chip: 'bg-danger-soft', icon: palette.danger },
  info: { chip: 'bg-primary-50', icon: palette.primary },
};

/**
 * Finansal Öngörü (Stitch "AI Finansal Öngörü") — bağımsız AI sayfası
 * kaldırıldı ama bağlamsal içgörü korundu. Mesaj TÜMÜYLE gerçek veriden
 * türetilir (uydurma yüzde/SMS yok): geciken tahsilat, yakın vade ve bu ayın
 * tahsilat oranı. Öncelik sırası: gecikme > yakın vade > tamamlandı > oran.
 */
export function FinancialInsight({ finance, overdue, upcoming, onPress }: Props) {
  const insight = useMemo(() => {
    const rate =
      finance.expectedThisMonth > 0
        ? Math.round((finance.collectedThisMonth / finance.expectedThisMonth) * 100)
        : null;

    if (overdue.length > 0) {
      const total = overdue.reduce((s, i) => s + remainingDebt(i.payment), 0);
      return {
        tone: 'danger' as Tone,
        title: `${overdue.length} tahsilat gecikmede`,
        body: `Toplam ${formatCurrencyTRY(total)} geciken alacak var. Hatırlatma göndererek takibi hızlandırabilirsiniz.`,
      };
    }

    const dueSoon = upcoming.in1.length;
    if (dueSoon > 0) {
      return {
        tone: 'warning' as Tone,
        title: `${dueSoon} ödeme yarın vadeli`,
        body: 'Yaklaşan tahsilatlar için otomatik hatırlatmalar planlandı; bugünden takip edebilirsiniz.',
      };
    }

    if (rate !== null && rate >= 100) {
      return {
        tone: 'success' as Tone,
        title: 'Bu ayın tahsilatı tamamlandı',
        body: 'Beklenen kiraların tamamı tahsil edildi. Geciken veya bekleyen ödeme görünmüyor.',
      };
    }

    if (rate !== null) {
      return {
        tone: 'info' as Tone,
        title: `Bu ay tahsilatın %${rate}'i tamamlandı`,
        body:
          finance.remainingThisMonth > 0
            ? `${formatCurrencyTRY(finance.remainingThisMonth)} tahsil edilmeyi bekliyor.`
            : 'Bu ay için bekleyen tahsilat kalmadı.',
      };
    }

    return null;
  }, [finance, overdue, upcoming]);

  if (!insight) return null;
  const t = TONE[insight.tone];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="mt-6 flex-row items-start gap-3 rounded-3xl border border-border/60 bg-surface p-4 shadow-sm shadow-black/5 active:opacity-90"
    >
      <View className={`h-10 w-10 items-center justify-center rounded-2xl ${t.chip}`}>
        <Zap size={18} color={t.icon} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
            Finansal Öngörü
          </Text>
          {onPress ? (
            <Text className="text-xs font-semibold text-primary-700">Detaylar</Text>
          ) : null}
        </View>
        <Text className="mt-1 text-sm font-bold text-foreground">{insight.title}</Text>
        <Text className="mt-0.5 text-xs leading-5 text-muted">{insight.body}</Text>
      </View>
    </Pressable>
  );
}
