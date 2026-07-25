import { Text, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/format';
import { remainingDebt } from '@/lib/utils/payments';
import type { PaymentWithContract } from '../useDashboard';

interface Props {
  item: PaymentWithContract;
  onPress: () => void;
}

function dueLabel(days: number): { text: string; tone: string } {
  if (days === 0) return { text: 'Bugün ödeme günü', tone: 'text-warning' };
  if (days > 0) return { text: `${days} gün kaldı`, tone: 'text-primary-700' };
  return { text: `${Math.abs(days)} gün gecikti`, tone: 'text-danger' };
}

export function DashboardPaymentRow({ item, onPress }: Props) {
  const { contract, payment, daysUntil } = item;
  const location = [contract.block, contract.unit].filter(Boolean).join(' / ');
  // Blok/daire varsa başlık; mülk + kiracı alt satırda. Kesme yok.
  const title = location || contract.propertyName;
  const subtitle = location
    ? `${contract.propertyName} • ${contract.tenantName}`
    : contract.tenantName;
  const label = dueLabel(daysUntil);

  return (
    <Card onPress={onPress} className="mb-2">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-foreground">{title}</Text>
          <Text className="mt-0.5 text-sm text-muted">{subtitle}</Text>
        </View>
        <Text className="text-base font-bold text-foreground">
          {formatCurrency(remainingDebt(payment))}
        </Text>
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className={`text-xs font-semibold ${label.tone}`}>{label.text}</Text>
        <View className="flex-row items-center gap-1">
          <Phone size={12} color="#6B7280" />
          <Text className="text-xs text-muted">{contract.tenantPhone}</Text>
        </View>
      </View>
    </Card>
  );
}
