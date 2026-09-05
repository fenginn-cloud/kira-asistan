import { Text, View } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { formatCurrencyTRY } from '@/lib/ledger/ledger';

interface Props {
  expected: number;
  collected: number;
  remaining: number;
}

/**
 * Stitch "Hero Balance Card" — solid royal cobalt (Level-2) özet kartı.
 * Bu ayın tahsilat özetini glanceable gösterir. Veriler dashboard'un mevcut
 * finansal özetinden gelir (yeni hesap/veri eklemez).
 */
export function HeroSummaryCard({ expected, collected, remaining }: Props) {
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
  return (
    <View
      className="mt-6 rounded-3xl bg-primary p-5"
      style={{
        shadowColor: '#2563EB',
        shadowOpacity: 0.28,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-white/80">Bu ay tahsil edilen</Text>
        <View className="flex-row items-center gap-1 rounded-full bg-white/20 px-2.5 py-1">
          <TrendingUp size={13} color="#FFFFFF" />
          <Text className="text-xs font-bold text-white">%{rate} tahsilat</Text>
        </View>
      </View>

      <Text className="mt-1.5 text-4xl font-extrabold text-white" numberOfLines={1}>
        {formatCurrencyTRY(collected)}
      </Text>

      {/* Tahsilat oranı ilerleme çubuğu */}
      <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
        <View
          className="h-2 rounded-full bg-white"
          style={{ width: `${Math.min(Math.max(rate, 0), 100)}%` }}
        />
      </View>

      {/* Frosted mini-metrikler */}
      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-white/15 px-3 py-2.5">
          <Text className="text-[11px] text-white/70">Beklenen</Text>
          <Text className="mt-0.5 text-base font-bold text-white" numberOfLines={1}>
            {formatCurrencyTRY(expected)}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl bg-white/15 px-3 py-2.5">
          <Text className="text-[11px] text-white/70">Kalan</Text>
          <Text className="mt-0.5 text-base font-bold text-white" numberOfLines={1}>
            {formatCurrencyTRY(remaining)}
          </Text>
        </View>
      </View>
    </View>
  );
}
