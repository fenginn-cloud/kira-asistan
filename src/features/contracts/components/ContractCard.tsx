import { Pressable, Text, View } from 'react-native';
import { Building2, CalendarDays, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { CardNote } from '@/features/contracts/components/CardNote';
import { BalanceBadge, ContractBadge, LedgerBadge } from '@/components/ui/StatusBadge';
import {
  formatCurrency,
  formatShortDate,
  getInitials,
  paymentDayLabel,
} from '@/lib/utils/format';
import { formatCurrencyTRY, type ContractBalance, type LedgerStatus } from '@/lib/ledger/ledger';
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

/** Ay durumuna göre avatar/progress rengi (Stitch semantic palette). */
interface Tone {
  avatarBg: string;
  avatarText: string;
  bar: string;
}
const DEFAULT_TONE: Tone = { avatarBg: 'bg-primary-50', avatarText: 'text-primary-700', bar: 'bg-primary' };
const TONE: Record<string, Tone> = {
  paid: { avatarBg: 'bg-success-soft', avatarText: 'text-success', bar: 'bg-success' },
  overpaid: { avatarBg: 'bg-success-soft', avatarText: 'text-success', bar: 'bg-success' },
  partial: { avatarBg: 'bg-warning-soft', avatarText: 'text-warning', bar: 'bg-warning' },
  overdue: { avatarBg: 'bg-danger-soft', avatarText: 'text-danger', bar: 'bg-danger' },
  pending: DEFAULT_TONE,
  upcoming: DEFAULT_TONE,
};

export function ContractCard({
  contract,
  balance,
  onPress,
  onMarkReceived,
  showLedger = false,
}: ContractCardProps) {
  const location = [contract.block, contract.unit].filter(Boolean).join(' · ');
  const propertyLine = [contract.propertyName, location].filter(Boolean).join(' · ');
  const status: LedgerStatus = balance?.currentMonth.status ?? 'pending';
  const tone = TONE[status] ?? DEFAULT_TONE;
  const received = status === 'paid' || status === 'overpaid';

  const due = balance?.currentMonth.due ?? 0;
  const paid = balance?.currentMonth.paid ?? 0;
  const remaining = balance?.currentMonth.remaining ?? 0;
  const progress = due > 0 ? Math.min(paid / due, 1) : paid > 0 ? 1 : 0;

  return (
    <Card onPress={onPress} className="mb-3">
      {/* Üst: avatar + kiracı + mülk + durum */}
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 flex-row items-center gap-3">
          <View className={`h-11 w-11 items-center justify-center rounded-2xl ${tone.avatarBg}`}>
            <Text className={`text-sm font-extrabold ${tone.avatarText}`}>
              {getInitials(contract.tenantName)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {contract.tenantName}
            </Text>
            <View className="mt-0.5 flex-row items-center gap-1">
              <Building2 size={12} color={palette.muted} />
              <Text className="flex-1 text-sm text-muted" numberOfLines={1}>
                {propertyLine}
              </Text>
            </View>
          </View>
        </View>
        {balance ? (
          showLedger ? (
            <BalanceBadge status={balance.status} />
          ) : (
            <LedgerBadge status={status} />
          )
        ) : (
          <ContractBadge status={contract.status} />
        )}
      </View>

      {/* İç ödeme kartı — aylık kira / ödenen / kalan + progress */}
      {balance ? (
        <View className="mt-3 rounded-2xl bg-background p-3.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted">Aylık Kira Bedeli</Text>
            <Text className="text-base font-extrabold text-foreground">
              {formatCurrency(contract.rentAmount)}
              <Text className="text-xs font-medium text-muted"> / ay</Text>
            </Text>
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-success">
              {formatCurrencyTRY(paid)} Ödendi
            </Text>
            <Text
              className={`text-xs font-semibold ${
                remaining > 0
                  ? status === 'overdue'
                    ? 'text-danger'
                    : 'text-foreground'
                  : 'text-success'
              }`}
            >
              {remaining > 0 ? `${formatCurrencyTRY(remaining)} Kaldı` : '₺0 Kaldı'}
            </Text>
          </View>
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-border/60">
            <View
              className={`h-2 rounded-full ${tone.bar}`}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </View>
        </View>
      ) : null}

      {/* Alt: vade/bitiş + aksiyon */}
      <View className="mt-3 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-1.5 pr-2">
          <CalendarDays size={13} color={palette.muted} />
          <Text className="flex-1 text-xs text-muted" numberOfLines={1}>
            Vade: {paymentDayLabel(contract.paymentDay)}
            {contract.endDate ? ` · Bitiş ${formatShortDate(contract.endDate)}` : ''}
          </Text>
        </View>
        {balance && onMarkReceived && !received ? (
          <Pressable
            onPress={onMarkReceived}
            className="flex-row items-center gap-1.5 rounded-xl bg-success px-3.5 py-2 active:opacity-80"
          >
            <CheckCircle2 size={14} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">Tahsilat Gir</Text>
          </Pressable>
        ) : received && balance ? (
          <View className="flex-row items-center gap-1 rounded-xl bg-success-soft px-3 py-2">
            <CheckCircle2 size={14} color={palette.success} />
            <Text className="text-xs font-bold text-success">Alındı</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-0.5">
            <Text className="text-xs font-bold text-primary-700">Detay</Text>
            <ChevronRight size={14} color={palette.primary} />
          </View>
        )}
      </View>

      {/* Yönetici: genel cari bakiye (korunan bilgi) */}
      {balance && showLedger && balance.totalBalance !== 0 ? (
        <Text
          className={`mt-2 text-[11px] font-semibold ${
            balance.totalBalance < 0 ? 'text-danger' : 'text-success'
          }`}
        >
          Genel bakiye: {formatCurrencyTRY(balance.totalBalance)}
        </Text>
      ) : null}

      {/* Kart notu — detaya girmeden yazılır/görünür */}
      <CardNote contract={contract} />
    </Card>
  );
}
