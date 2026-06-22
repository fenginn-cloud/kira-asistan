import { Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/format';
import { remainingDebt } from '@/lib/utils/payments';
import type { PaymentWithContract } from '../useDashboard';

interface Props {
  item: PaymentWithContract;
  onPress: () => void;
}

function dueLabel(days: number): { text: string; tone: string } {
  if (days === 0) return { text: 'Bugün', tone: 'text-warning' };
  if (days > 0) return { text: `${days} gün kaldı`, tone: 'text-primary-700' };
  return { text: `${Math.abs(days)} gün gecikti`, tone: 'text-danger' };
}

export function DashboardPaymentRow({ item, onPress }: Props) {
  const { contract, payment, daysUntil } = item;
  const location = [contract.block, contract.unit].filter(Boolean).join(' ');
  const label = dueLabel(daysUntil);

  return (
    <Card onPress={onPress} className="mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {contract.propertyName} {location}
          </Text>
          <Text className="text-sm text-muted" numberOfLines={1}>
            {contract.tenantName}
          </Text>
          <Text className={`mt-1 text-xs font-medium ${label.tone}`}>
            {label.text}
          </Text>
        </View>
        <Text className="text-base font-bold text-foreground">
          {formatCurrency(remainingDebt(payment))}
        </Text>
      </View>
    </Card>
  );
}
