import { Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { LedgerBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatMonth, formatShortDate } from '@/lib/utils/format';
import { remainingDebt } from '@/lib/utils/payments';
import { getPaymentStatus } from '@/lib/ledger/ledger';
import type { Payment } from '@/types';

interface PaymentItemProps {
  payment: Payment;
  onPress?: () => void;
}

export function PaymentItem({ payment, onPress }: PaymentItemProps) {
  const remaining = remainingDebt(payment);
  // Live status: a month is only "borç/gecikme" once its due date has passed.
  const status = getPaymentStatus(
    payment.amountDue,
    payment.amountPaid,
    payment.dueDate
  );
  const isOverdue = status === 'overdue';

  return (
    <Card onPress={onPress}>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-base font-semibold capitalize text-foreground">
            {formatMonth(payment.periodMonth)}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">
            Son ödeme: {formatShortDate(payment.dueDate)}
          </Text>
        </View>
        <LedgerBadge status={status} />
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-border/60 pt-3">
        <View>
          <Text className="text-xs text-muted">Tahsil edilen</Text>
          <Text className="text-sm font-semibold text-foreground">
            {formatCurrency(payment.amountPaid)} / {formatCurrency(payment.amountDue)}
          </Text>
        </View>
        {remaining > 0 ? (
          <View className="items-end">
            {/* Vadesi gelmemiş ay borç değildir: "Kalan" (nötr); geçmişse "Kalan borç" (kırmızı) */}
            <Text className="text-xs text-muted">{isOverdue ? 'Kalan borç' : 'Kalan'}</Text>
            <Text
              className={`text-sm font-bold ${isOverdue ? 'text-danger' : 'text-foreground'}`}
            >
              {formatCurrency(remaining)}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
