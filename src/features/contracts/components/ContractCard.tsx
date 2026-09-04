import { Pressable, Text, View } from 'react-native';
import { Building2, CalendarDays, CheckCircle2, Phone } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { CardNote } from '@/features/contracts/components/CardNote';
import { BalanceBadge, ContractBadge, LedgerBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, paymentDayLabel } from '@/lib/utils/format';
import { formatCurrencyTRY, type ContractBalance } from '@/lib/ledger/ledger';
import { palette } from '@/lib/theme/colors';
import type { Contract } from '@/types';

interface ContractCardProps {
  contract: Contract;
  /** Cari hesap özeti — verilirse kartta bu ay + genel bakiye gösterilir. */
  balance?: ContractBalance;
  onPress: () => void;
  /** Tek dokunuş "Alındı" — verilirse bu ay alınmadıysa buton gösterilir. */
  onMarkReceived?: () => void;
  /** Cari hesap detayları (bakiye, kalan) yalnızca yöneticide gösterilir. */
  showLedger?: boolean;
}

export function ContractCard({
  contract,
  balance,
  onPress,
  onMarkReceived,
  showLedger = false,
}: ContractCardProps) {
  const location = [contract.block, contract.unit].filter(Boolean).join(' / ');
  // Blok/daire varsa onu başlık yap (öne çıksın); yoksa mülk adı başlık olur.
  const title = location || contract.propertyName;
  const subtitle = location
    ? `${contract.propertyName} • ${contract.tenantName}`
    : contract.tenantName;
  const received =
    balance?.currentMonth.status === 'paid' || balance?.currentMonth.status === 'overpaid';
  return (
    <Card onPress={onPress}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
            <Building2 size={20} color="#2563EB" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-sm text-muted" numberOfLines={1}>
              {subtitle}
            </Text>
            <View className="mt-1.5 flex-row">
              <View className="flex-row items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1">
                <CalendarDays size={12} color={palette.primary} />
                <Text className="text-[11px] font-bold text-primary-700">
                  {paymentDayLabel(contract.paymentDay)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        {balance ? (
          showLedger ? (
            <BalanceBadge status={balance.status} />
          ) : (
            // Personel: muhasebe dili yok — sadece bu ayın durumu
            <LedgerBadge status={balance.currentMonth.status} />
          )
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

      {balance && showLedger ? (
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

      {/* Tek dokunuş "Alındı" */}
      {balance && onMarkReceived ? (
        received ? (
          <View className="mt-3 flex-row items-center justify-center gap-1.5 rounded-2xl bg-success-soft py-2.5">
            <CheckCircle2 size={16} color={palette.success} />
            <Text className="text-sm font-semibold text-success">Bu ay alındı</Text>
          </View>
        ) : (
          <Pressable
            onPress={onMarkReceived}
            className="mt-3 flex-row items-center justify-center gap-1.5 rounded-2xl bg-success py-2.5 active:opacity-80"
          >
            <CheckCircle2 size={16} color="#FFFFFF" />
            <Text className="text-sm font-semibold text-white">Alındı</Text>
          </Pressable>
        )
      ) : null}

      {/* Kart notu — detaya girmeden yazılır/görünür */}
      <CardNote contract={contract} />
    </Card>
  );
}
