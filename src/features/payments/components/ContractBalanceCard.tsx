import { Pressable, Text, View } from 'react-native';
import { Download, Plus, ShieldCheck } from 'lucide-react-native';
import { formatCurrencyTRY, type ContractBalance } from '@/lib/ledger/ledger';

interface Props {
  balance: ContractBalance;
  deposit: number;
  paymentDay: number;
  /** Sözleşme geneli tahsil edilen / beklenen (yıllık performans için). */
  collected: number;
  expected: number;
  onRecord?: () => void;
  onStatement?: () => void;
}

/**
 * Sözleşme detayı — Cari Hesap Bakiyesi (Stitch mavi hero). Kalan borç,
 * yıllık tahsilat performansı, Aylık Kira ve Teminat Depozitosu alt kartları.
 * Tüm değerler gerçek ledger verisinden.
 */
export function ContractBalanceCard({
  balance,
  deposit,
  paymentDay,
  collected,
  expected,
  onRecord,
  onStatement,
}: Props) {
  const { totalBalance, monthlyRent } = balance;
  // Kiracının borcu = negatif bakiye; alacağı/fazlası = pozitif bakiye.
  const debt = totalBalance < 0 ? Math.abs(totalBalance) : 0;
  const credit = totalBalance > 0 ? totalBalance : 0;
  const perfPct = expected > 0 ? Math.round((collected / expected) * 100) : 100;

  return (
    <View
      className="overflow-hidden rounded-[26px] bg-primary p-5"
      style={{
        shadowColor: '#2563EB',
        shadowOpacity: 0.28,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-white/80">Cari Hesap Bakiyesi</Text>
        <View className="flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: debt > 0 ? '#F87171' : '#4ADE80' }}
          />
          <Text className="text-xs font-semibold text-white">
            {debt > 0
              ? `${formatCurrencyTRY(debt)} Kalan Borç`
              : credit > 0
                ? `${formatCurrencyTRY(credit)} Alacak`
                : 'Güncel'}
          </Text>
        </View>
      </View>

      <View className="mt-1 flex-row items-end gap-2">
        <Text className="text-4xl font-extrabold text-white">
          {formatCurrencyTRY(debt > 0 ? debt : credit)}
        </Text>
        <Text className="pb-1.5 text-sm font-medium text-white/70">
          {debt > 0 ? 'Geciken / Kalan' : credit > 0 ? 'Fazla Ödeme' : 'Borç Yok'}
        </Text>
      </View>

      {/* Yıllık tahsilat performansı */}
      <View className="mt-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-white/70">Tahsilat Performansı</Text>
          <Text className="text-xs font-semibold text-white">
            %{perfPct} ({formatCurrencyTRY(collected)} / {formatCurrencyTRY(expected)})
          </Text>
        </View>
        <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
          <View
            className="h-2 rounded-full"
            style={{ width: `${Math.min(perfPct, 100)}%`, backgroundColor: '#4ADE80' }}
          />
        </View>
      </View>

      {/* Aylık Kira / Teminat Depozitosu */}
      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-white/10 p-3">
          <Text className="text-[11px] font-medium uppercase tracking-wide text-white/60">
            Aylık Kira
          </Text>
          <Text className="mt-1 text-lg font-extrabold text-white" numberOfLines={1}>
            {formatCurrencyTRY(monthlyRent)}
          </Text>
          <Text className="text-[11px] text-white/60">{`Her ayın ${paymentDay}'i`}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-white/10 p-3">
          <Text className="text-[11px] font-medium uppercase tracking-wide text-white/60">
            Teminat Depozitosu
          </Text>
          <Text className="mt-1 text-lg font-extrabold text-white" numberOfLines={1}>
            {formatCurrencyTRY(deposit)}
          </Text>
          <View className="flex-row items-center gap-1">
            <ShieldCheck size={11} color="#4ADE80" />
            <Text className="text-[11px] text-white/60">Kasada Güvende</Text>
          </View>
        </View>
      </View>

      {/* Aksiyonlar */}
      {onRecord || onStatement ? (
        <View className="mt-4 flex-row gap-3">
          {onRecord ? (
            <Pressable
              onPress={onRecord}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-white py-3 active:opacity-90"
            >
              <Plus size={17} color="#2563EB" />
              <Text className="text-sm font-bold text-primary">Tahsilat Gir</Text>
            </Pressable>
          ) : null}
          {onStatement ? (
            <Pressable
              onPress={onStatement}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-white/15 py-3 active:opacity-80"
            >
              <Download size={17} color="#FFFFFF" />
              <Text className="text-sm font-bold text-white">Ekstre</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
