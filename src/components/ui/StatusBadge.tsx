import { Text, View } from 'react-native';
import type { ContractStatus, PaymentStatus } from '@/types';
import { CONTRACT_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@/lib/utils/payments';

const paymentStyles: Record<PaymentStatus, { bg: string; text: string }> = {
  paid: { bg: 'bg-success-soft', text: 'text-success' },
  partial: { bg: 'bg-warning-soft', text: 'text-warning' },
  pending: { bg: 'bg-primary-50', text: 'text-primary-700' },
  overdue: { bg: 'bg-danger-soft', text: 'text-danger' },
};

const contractStyles: Record<ContractStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-success-soft', text: 'text-success' },
  passive: { bg: 'bg-primary-50', text: 'text-muted' },
  terminated: { bg: 'bg-danger-soft', text: 'text-danger' },
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const s = paymentStyles[status];
  return (
    <View className={`rounded-full px-3 py-1 ${s.bg}`}>
      <Text className={`text-xs font-semibold ${s.text}`}>
        {PAYMENT_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

export function ContractBadge({ status }: { status: ContractStatus }) {
  const s = contractStyles[status];
  return (
    <View className={`rounded-full px-3 py-1 ${s.bg}`}>
      <Text className={`text-xs font-semibold ${s.text}`}>
        {CONTRACT_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}
