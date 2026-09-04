import { Pressable, Text, View } from 'react-native';
import { CheckCircle2, MessageCircle, Phone } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { CardNote } from '@/features/contracts/components/CardNote';
import { formatCurrency } from '@/lib/utils/format';
import { remainingDebt } from '@/lib/utils/payments';
import { callPhone, openWhatsApp } from '@/lib/utils/contact';
import { buildMessage } from '@/lib/utils/message';
import { palette } from '@/lib/theme/colors';
import type { OpenItem } from '@/features/notifications/reminders';

function statusLabel(days: number): { text: string; tone: string } {
  if (days < 0) return { text: `${Math.abs(days)} gün gecikti`, tone: 'text-danger' };
  if (days === 0) return { text: 'Bugün ödeme günü', tone: 'text-warning' };
  return { text: `${days} gün kaldı`, tone: 'text-primary-700' };
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
  const st = statusLabel(daysUntil);

  const message = () =>
    openWhatsApp(
      contract.tenantPhone,
      buildMessage(daysUntil < 0 ? 'overdue' : 'upcoming', contract, payment)
    );

  const hasActions = showContact || !!onMarkReceived;

  return (
    <Card onPress={onPress} className="mb-2">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-foreground">{title}</Text>
          <Text className="mt-0.5 text-sm text-muted">{subtitle}</Text>
          <Text className={`mt-1 text-xs font-semibold ${st.tone}`}>{st.text}</Text>
        </View>
        <Text className="text-base font-bold text-foreground">
          {formatCurrency(remainingDebt(payment))}
        </Text>
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
