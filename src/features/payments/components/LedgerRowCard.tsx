import { Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { LedgerBadge } from '@/components/ui/StatusBadge';
import { formatCurrencyTRY, type LedgerRow } from '@/lib/ledger/ledger';

function balanceColor(n: number): string {
  if (n < 0) return 'text-danger';
  if (n > 0) return 'text-success';
  return 'text-foreground';
}

/** One month of the cari hesap defteri. */
export function LedgerRowCard({
  row,
  onPress,
}: {
  row: LedgerRow;
  onPress?: () => void;
}) {
  return (
    <Card onPress={onPress}>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold capitalize text-foreground">
          {row.monthLabel}
          {row.isFuture ? (
            <Text className="text-xs font-normal text-muted">  (gelecek)</Text>
          ) : null}
        </Text>
        <LedgerBadge status={row.status} />
      </View>

      <View className="mt-3 gap-1.5 border-t border-border/60 pt-3">
        <Row label="Ödenmesi gereken" value={formatCurrencyTRY(row.due)} />
        <Row label="Ödenen" value={formatCurrencyTRY(row.paid)} />
        <Row
          label="Ay bakiyesi"
          value={formatCurrencyTRY(row.monthBalance)}
          valueClass={balanceColor(row.monthBalance)}
        />
        <Row
          label="Devreden bakiye"
          value={formatCurrencyTRY(row.carryForward)}
          valueClass={balanceColor(row.carryForward)}
        />
      </View>
    </Card>
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
