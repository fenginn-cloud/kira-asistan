import { Text, View } from 'react-native';
import { BalanceBadge } from '@/components/ui/StatusBadge';
import { formatCurrencyTRY, type ContractBalance } from '@/lib/ledger/ledger';

function balanceColor(n: number): string {
  if (n < 0) return 'text-danger';
  if (n > 0) return 'text-success';
  return 'text-foreground';
}

/** Top summary card on the contract detail screen. */
export function ContractBalanceCard({ balance }: { balance: ContractBalance }) {
  const { currentMonth, totalBalance } = balance;
  return (
    <View className="rounded-3xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-muted">Cari Hesap Özeti</Text>
        <BalanceBadge status={balance.status} />
      </View>

      <View className="mt-3 gap-2">
        <Row label="Aylık kira" value={formatCurrencyTRY(balance.monthlyRent)} />
        <Row label="Bu ay ödenmesi gereken" value={formatCurrencyTRY(currentMonth.due)} />
        <Row label="Bu ay ödenen" value={formatCurrencyTRY(currentMonth.paid)} />
        <Row
          label="Bu ay kalan"
          value={formatCurrencyTRY(currentMonth.remaining)}
          valueClass={
            currentMonth.status === 'overdue'
              ? 'text-danger'
              : currentMonth.remaining > 0
                ? 'text-foreground'
                : 'text-success'
          }
        />
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-border/60 pt-3">
        <Text className="text-sm font-semibold text-foreground">Genel Bakiye</Text>
        <Text className={`text-lg font-bold ${balanceColor(totalBalance)}`}>
          {formatCurrencyTRY(totalBalance)}
        </Text>
      </View>
      {totalBalance !== 0 ? (
        <Text className="mt-1 text-xs text-muted">
          {totalBalance < 0
            ? `Kiracının ${formatCurrencyTRY(Math.abs(totalBalance))} borcu var.`
            : `Kiracının ${formatCurrencyTRY(totalBalance)} alacağı / fazla ödemesi var.`}
        </Text>
      ) : (
        <Text className="mt-1 text-xs text-muted">Hesap güncel, borç yok.</Text>
      )}
    </View>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className={`text-sm font-semibold ${valueClass ?? 'text-foreground'}`}>
        {value}
      </Text>
    </View>
  );
}
