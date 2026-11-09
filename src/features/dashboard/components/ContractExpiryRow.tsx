import { Pressable, Text, View } from 'react-native';
import { CalendarX2 } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatShortDate } from '@/lib/utils/format';
import { expiryLabel, type ExpiringContract } from '@/lib/utils/contractExpiry';
import { palette } from '@/lib/theme/colors';

import { CONTRACT_PHASE_LABEL, contractPhase } from '@/lib/ledger/accrual';

interface Props {
  item: ExpiringContract;
  onPress: () => void;
  /** "Uzat" — uzatma penceresini açar. */
  onRenew?: () => void;
  /** "Çıkış" — kiracı çıkışı penceresini açar. */
  onExit?: () => void;
}

export function ContractExpiryRow({ item, onPress, onRenew, onExit }: Props) {
  const phase = contractPhase(item.contract);
  const { contract, daysLeft } = item;
  const location = [contract.block, contract.unit].filter(Boolean).join(' ');
  const tone = daysLeft < 0 ? 'text-danger' : daysLeft <= 15 ? 'text-warning' : 'text-primary-700';

  return (
    <Card onPress={onPress} className="mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-3 pr-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-warning-soft">
            <CalendarX2 size={18} color={palette.warning} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
              {contract.propertyName} {location}
            </Text>
            <Text className="text-sm text-muted" numberOfLines={1}>
              {contract.tenantName} • Bitiş: {formatShortDate(contract.endDate!)}
            </Text>
            <Text className={`mt-1 text-xs font-medium ${tone}`}>
              {expiryLabel(daysLeft)}
              {daysLeft < 0 ? ` · ${CONTRACT_PHASE_LABEL[phase]}` : ''}
            </Text>
          </View>
        </View>
        <Text className="text-sm font-bold text-primary-700">
          {formatCurrency(contract.rentAmount)}
        </Text>
      </View>
      {onRenew || onExit ? (
        <View className="mt-3 flex-row gap-2 border-t border-border/60 pt-3">
          {onRenew ? (
            <Pressable
              onPress={onRenew}
              className="flex-1 items-center rounded-2xl bg-primary-50 py-2.5 active:opacity-80"
            >
              <Text className="text-sm font-semibold text-primary-700">Uzat</Text>
            </Pressable>
          ) : null}
          {onExit ? (
            <Pressable
              onPress={onExit}
              className="flex-1 items-center rounded-2xl bg-background py-2.5 active:opacity-80"
            >
              <Text className="text-sm font-semibold text-foreground">Kiracı Çıkışı</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
