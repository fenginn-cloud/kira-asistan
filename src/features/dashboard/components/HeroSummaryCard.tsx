import { Pressable, Text, View } from 'react-native';
import { FileText, Plus, TrendingUp } from 'lucide-react-native';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { formatCurrencyTRY } from '@/lib/ledger/ledger';

interface Props {
  expected: number;
  collected: number;
  remaining: number;
  /** "Tahsilat Gir" — mevcut tahsilat akışına götürür (Sözleşmeler). */
  onRecord: () => void;
  /** "Rapor Al" — Analiz ekranına götürür (bağımsız AI değil). */
  onReport: () => void;
}

/**
 * Stitch "Hero Balance Card" — solid royal cobalt (Level-2) tahsilat özeti.
 * Veriler dashboard'un mevcut finansal özetinden gelir (yeni hesap yok).
 */
export function HeroSummaryCard({ expected, collected, remaining, onRecord, onReport }: Props) {
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
  const monthLabel = format(new Date(), 'MMMM yyyy', { locale: tr });
  return (
    <View
      className="mt-6 rounded-[26px] bg-primary p-5"
      style={{
        shadowColor: '#2563EB',
        shadowOpacity: 0.28,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-white/80">
          Toplam Tahsilat ({monthLabel})
        </Text>
        <View className="flex-row items-center gap-1 rounded-full bg-white/20 px-2.5 py-1">
          <TrendingUp size={13} color="#FFFFFF" />
          <Text className="text-xs font-bold text-white">%{rate} Tahsil Edildi</Text>
        </View>
      </View>

      <View className="mt-1.5 flex-row items-baseline gap-1.5">
        <Text className="text-4xl font-extrabold text-white" numberOfLines={1}>
          {formatCurrencyTRY(collected)}
        </Text>
        <Text className="text-base font-medium text-white/60" numberOfLines={1}>
          / {formatCurrencyTRY(expected)}
        </Text>
      </View>

      {/* Tahsilat oranı ilerleme çubuğu */}
      <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
        <View
          className="h-2 rounded-full bg-white"
          style={{ width: `${Math.min(Math.max(rate, 0), 100)}%` }}
        />
      </View>

      {/* Aksiyonlar (frosted) */}
      <View className="mt-4 flex-row gap-3">
        <Pressable
          onPress={onRecord}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-white py-3 active:opacity-90"
        >
          <Plus size={16} color="#2563EB" />
          <Text className="text-sm font-bold text-primary-700">Tahsilat Gir</Text>
        </Pressable>
        <Pressable
          onPress={onReport}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-white/15 py-3 active:opacity-80"
        >
          <FileText size={16} color="#FFFFFF" />
          <Text className="text-sm font-bold text-white">Rapor Al</Text>
        </Pressable>
      </View>

      {/* Kalan bilgisi */}
      <Text className="mt-3 text-xs text-white/70">
        Bu ay kalan tahsilat: {formatCurrencyTRY(remaining)}
      </Text>
    </View>
  );
}
