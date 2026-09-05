import { Pressable, Text, View } from 'react-native';
import { Building2, CheckCircle2, MessageCircle, Phone } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { CardNote } from '@/features/contracts/components/CardNote';
import { StatusPill, type PillTone } from '@/features/dashboard/components/StatusPill';
import { formatCurrency } from '@/lib/utils/format';
import { remainingDebt } from '@/lib/utils/payments';
import { callPhone, openWhatsApp } from '@/lib/utils/contact';
import { buildMessage } from '@/lib/utils/message';
import { palette } from '@/lib/theme/colors';
import type { OpenItem } from '@/features/notifications/reminders';

function statusPill(days: number): { tone: PillTone; label: string } {
  if (days < 0) return { tone: 'overdue', label: `${Math.abs(days)} gün gecikti` };
  if (days === 0) return { tone: 'pending', label: 'Bugün ödeme günü' };
  return { tone: 'info', label: `${days} gün kaldı` };
}

interface Props {
  item: OpenItem;
  onPress: () => void;
  /** Personel: kiracıyı Ara / WhatsApp butonları. */
  showContact?: boolean;
  /** Yönetici: tek tuş "Alındı" — kartta gösterilen ay/ödeme işaretlenir. */
  onMarkReceived?: (item: OpenItem) => void;
}

/** Tahsilat kartı: kiracı + tutar + role göre aksiyon (Ara/WhatsApp veya Alındı). */
export function CollectionCard({ item, onPress, showContact, onMarkReceived }: Props) {
  const { contract, payment, daysUntil } = item;
  const location = [contract.block, contract.unit].filter(Boolean).join(' / ');
  const title = location || contract.propertyName;
  const subtitle = location
    ? `${contract.propertyName} • ${contract.tenantName}`
    : contract.tenantName;
  const st = statusPill(daysUntil);

  const message = () =>
    openWhatsApp(
      contract.tenantPhone,
      buildMessage(daysUntil < 0 ? 'overdue' : 'upcoming', contract, payment)
    );

  const hasActions = showContact || !!onMarkReceived;

  return (
    <Card onPress={onPress} className="mb-2.5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row items-start gap-3">
          {/* Mülk rozeti (44px) */}
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
            <Building2 size={20} color={palette.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {title}
            </Text>
            <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>
        <View className="items-end gap-1.5">
          <Text className="text-base font-bold text-foreground">
            {formatCurrency(remainingDebt(payment))}
          </Text>
          <StatusPill tone={st.tone} label={st.label} />
        </View>
      </View>

      {hasActions ? (
        <View className="mt-3 flex-row gap-2 border-t border-border/60 pt-3">
          {showContact ? (
            <>
              <Pressable
                onPress={() => callPhone(contract.tenantPhone)}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary-50 py-2.5 active:opacity-80"
              >
                <Phone size={16} color={palette.primary} />
                <Text className="text-sm font-semibold text-primary-700">Ara</Text>
              </Pressable>
              <Pressable
                onPress={message}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-success-soft py-2.5 active:opacity-80"
              >
                <MessageCircle size={16} color={palette.success} />
                <Text className="text-sm font-semibold text-success">WhatsApp</Text>
              </Pressable>
            </>
          ) : null}
          {onMarkReceived ? (
            <Pressable
              onPress={() => onMarkReceived(item)}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-success py-2.5 active:opacity-80"
            >
              <CheckCircle2 size={16} color="#FFFFFF" />
              <Text className="text-sm font-semibold text-white">Alındı</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Kart notu — detaya girmeden yazılır/görünür */}
      <CardNote contract={contract} />
    </Card>
  );
}
