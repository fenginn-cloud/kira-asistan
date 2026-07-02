import { Text, View } from 'react-native';
import type { ContractStatus, PaymentStatus } from '@/types';
import { CONTRACT_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@/lib/utils/payments';
import {
  CONTRACT_LEDGER_LABEL,
  LEDGER_STATUS_LABEL,
  type ContractLedgerStatus,
  type LedgerStatus,
} from '@/lib/ledger/ledger';

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

// --- Ledger (cari hesap) badges -------------------------------------------

const ledgerStyles: Record<LedgerStatus, { bg: string; text: string }> = {
  paid: { bg: 'bg-success-soft', text: 'text-success' },
  partial: { bg: 'bg-warning-soft', text: 'text-warning' },
  pending: { bg: 'bg-primary-50', text: 'text-primary-700' },
  overdue: { bg: 'bg-danger-soft', text: 'text-danger' },
  overpaid: { bg: 'bg-success-soft', text: 'text-success' },
  upcoming: { bg: 'bg-primary-50', text: 'text-primary-700' },
};

/** Monthly ledger row status (Ödendi / Kısmi / Ödenmedi / Gecikmiş / Fazla). */
export function LedgerBadge({ status }: { status: LedgerStatus }) {
  const s = ledgerStyles[status];
  return (
    <View className={`rounded-full px-3 py-1 ${s.bg}`}>
      <Text className={`text-xs font-semibold ${s.text}`}>
        {LEDGER_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

const balanceStyles: Record<ContractLedgerStatus, { bg: string; text: string }> = {
  settled: { bg: 'bg-success-soft', text: 'text-success' },
  debtor: { bg: 'bg-danger-soft', text: 'text-danger' },
  overdue: { bg: 'bg-danger-soft', text: 'text-danger' },
  creditor: { bg: 'bg-success-soft', text: 'text-success' },
};

/** Contract-level balance status (Güncel / Borçlu / Gecikmiş / Alacaklı). */
export function BalanceBadge({ status }: { status: ContractLedgerStatus }) {
  const s = balanceStyles[status];
  return (
    <View className={`rounded-full px-3 py-1 ${s.bg}`}>
      <Text className={`text-xs font-semibold ${s.text}`}>
        {CONTRACT_LEDGER_LABEL[status]}
      </Text>
    </View>
  );
}
