import { Text, View } from 'react-native';
import { Building2, Phone } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { BalanceBadge, ContractBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/lib/utils/format';
import { formatCurrencyTRY, type ContractBalance } from '@/lib/ledger/ledger';
import type { Contract } from '@/types';

interface ContractCardProps {
  contract: Contract;
  /** Cari hesap özeti — verilirse kartta bu ay + genel bakiye gösterilir. */
  balance?: ContractBalance;
  onPress: () => void;
}

export function ContractCard({ contract, balance, onPress }: ContractCardProps) {
  const location = [contract.block, contract.unit].filter(Boolean).join(' / ');
  return (
    <Card onPress={onPress}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
            <Building2 size={20} color="#2563EB" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
              {contract.propertyName}
            </Text>
            <Text className="text-sm text-muted" numberOfLines={1}>
              {location ? `${location} • ` : ''}
              {contract.tenantName}
            </Text>
          </View>
        </View>
        {balance ? (
          <BalanceBadge status={balance.status} />
        ) : (
          <ContractBadge status={contract.status} />
        )}
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Phone size={14} color="#6B7280" />
          <Text className="text-xs text-muted">{contract.tenantPhone}</Text>
        </View>
        <Text className="text-base font-bold text-primary-700">
          {formatCurrency(contract.rentAmount)}
        </Text>
      </View>

      {balance ? (
        <View className="mt-3 flex-row items-center justify-between border-t border-border/60 pt-3">
          <View>
            <Text className="text-[11px] text-muted">Bu ay ödenen</Text>
            <Text className="text-sm font-semibold text-foreground">
              {formatCurrencyTRY(balance.currentMonth.paid)}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-[11px] text-muted">Bu ay kalan</Text>
            <Text
              className={`text-sm font-semibold ${
                balance.currentMonth.status === 'overdue'
                  ? 'text-danger'
                  : balance.currentMonth.remaining > 0
                    ? 'text-foreground'
                    : 'text-success'
              }`}
            >
              {formatCurrencyTRY(balance.currentMonth.remaining)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[11px] text-muted">Genel bakiye</Text>
            <Text
              className={`text-sm font-bold ${
                balance.totalBalance < 0
                  ? 'text-danger'
                  : balance.totalBalance > 0
                    ? 'text-success'
                    : 'text-foreground'
              }`}
            >
              {formatCurrencyTRY(balance.totalBalance)}
            </Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
}
