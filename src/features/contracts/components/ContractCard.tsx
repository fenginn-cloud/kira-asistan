import { Text, View } from 'react-native';
import { Building2, Phone } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { ContractBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/lib/utils/format';
import type { Contract } from '@/types';

interface ContractCardProps {
  contract: Contract;
  onPress: () => void;
}

export function ContractCard({ contract, onPress }: ContractCardProps) {
  const location = [contract.block, contract.unit].filter(Boolean).join(' / ');
  return (
    <Card onPress={onPress}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
            <Building2 size={20} color="#2563EB" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-[#0B1220]" numberOfLines={1}>
              {contract.propertyName}
            </Text>
            <Text className="text-sm text-muted" numberOfLines={1}>
              {location ? `${location} • ` : ''}
              {contract.tenantName}
            </Text>
          </View>
        </View>
        <ContractBadge status={contract.status} />
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
    </Card>
  );
}
