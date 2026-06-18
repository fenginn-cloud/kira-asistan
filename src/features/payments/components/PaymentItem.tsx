import { Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { PaymentBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatMonth, formatShortDate } from '@/lib/utils/format';
import { remainingDebt } from '@/lib/utils/payments';
import type { Payment } from '@/types';

interface PaymentItemProps {
  payment: Payment;
  onPress?: () => void;
}

export function PaymentItem({ payment, onPress }: PaymentItemProps) {
  const remaining = remainingDebt(payment);
  return (
    <Card onPress={onPress}>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-base font-semibold capitalize text-[#0B1220]">
            {formatMonth(payment.periodMonth)}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">
            Son ödeme: {formatShortDate(payment.dueDate)}
          </Text>
        </View>
        <PaymentBadge status={payment.status} />
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-border/60 pt-3">
        <View>
          <Text className="text-xs text-muted">Tahsil edilen</Text>
          <Text className="text-sm font-semibold text-[#0B1220]">
            {formatCurrency(payment.amountPaid)} / {formatCurrency(payment.amountDue)}
          </Text>
        </View>
        {remaining > 0 ? (
          <View className="items-end">
            <Text className="text-xs text-muted">Kalan borç</Text>
            <Text className="text-sm font-bold text-danger">
              {formatCurrency(remaining)}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
