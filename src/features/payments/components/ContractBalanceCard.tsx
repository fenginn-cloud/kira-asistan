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
  const progress = currentMonth.due > 0 ? Math.min(currentMonth.paid / currentMonth.due, 1) : currentMonth.paid > 0 ? 1 : 0;
  const barTone =
    currentMonth.status === 'overdue'
      ? 'bg-danger'
      : currentMonth.remaining > 0
        ? 'bg-primary'
        : 'bg-success';
  return (
    <View className="rounded-3xl border border-border/60 bg-surface p-4 shadow-sm shadow-black/5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-muted">Cari Hesap Özeti</Text>
        <BalanceBadge status={balance.status} />
      </View>

      {/* Genel bakiye — öne çıkan */}
      <View className="mt-2 flex-row items-end justify-between">
        <View>
          <Text className="text-xs text-muted">Genel Bakiye</Text>
          <Text className={`mt-0.5 text-3xl font-extrabold ${balanceColor(totalBalance)}`}>
            {formatCurrencyTRY(totalBalance)}
          </Text>
        </View>
      </View>

      {/* Bu ay ilerlemesi */}
      <View className="mt-3 h-2 overflow-hidden rounded-full bg-background">
        <View className={`h-2 rounded-full ${barTone}`} style={{ width: `${Math.round(progress * 100)}%` }} />
      </View>

      <View className="mt-3 gap-2 border-t border-border/60 pt-3">
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
