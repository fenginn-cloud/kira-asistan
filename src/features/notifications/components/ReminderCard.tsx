import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Copy, MessageCircle } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils/format';
import { remainingDebt } from '@/lib/utils/payments';
import { buildMessage } from '@/lib/utils/message';
import { copyText, openWhatsApp } from '@/lib/utils/contact';
import { useReminderStore } from '@/store/reminderStore';
import { palette } from '@/lib/theme/colors';
import type { Contract, MessageKind, Payment } from '@/types';

interface ReminderCardProps {
  id: string;
  contract: Contract;
  payment: Payment;
  daysUntil: number;
  kind: MessageKind;
}

function dayBadge(daysUntil: number): { text: string; bg: string; text2: string } {
  if (daysUntil === 0) return { text: 'Bugün', bg: 'bg-warning-soft', text2: 'text-warning' };
  if (daysUntil > 0)
    return { text: `${daysUntil} gün kaldı`, bg: 'bg-primary-50', text2: 'text-primary-700' };
  return { text: `${Math.abs(daysUntil)} gün gecikti`, bg: 'bg-danger-soft', text2: 'text-danger' };
}

export function ReminderCard({ id, contract, payment, daysUntil, kind }: ReminderCardProps) {
  const router = useRouter();
  const toast = useToast();
  const { isDone, markDone, undo } = useReminderStore();
  const done = isDone(id);

  const badge = dayBadge(daysUntil);
  const location = [contract.block, contract.unit].filter(Boolean).join(' ');
  const message = buildMessage(kind, contract, payment);

  const handleCopy = async () => {
    await copyText(message);
    toast.success('Mesaj kopyalandı');
  };

  const handleWhatsApp = async () => {
    await openWhatsApp(contract.tenantPhone, message);
  };

  const handleComplete = () => {
    if (done) {
      undo(id);
      toast.show('Geri alındı', 'info');
    } else {
      markDone(id);
      toast.success('Tamamlandı olarak işaretlendi');
    }
  };

  return (
    <Card className={`mb-3 ${done ? 'opacity-60' : ''}`}>
      <Pressable onPress={() => router.push(`/(app)/contracts/${contract.id}`)}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {contract.propertyName} {location}
            </Text>
            <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
              Kiracı: {contract.tenantName}
            </Text>
            <Text className="text-sm text-muted" numberOfLines={1}>
              {contract.tenantPhone}
            </Text>
          </View>
          <View className={`rounded-full px-3 py-1 ${badge.bg}`}>
            <Text className={`text-xs font-semibold ${badge.text2}`}>{badge.text}</Text>
          </View>
        </View>

        <View className="mt-3 flex-row items-center justify-between border-t border-border/60 pt-3">
          <Text className="text-xs text-muted">
            {kind === 'overdue' ? 'Güncel Borç' : 'Kira Tutarı'}
          </Text>
          <Text className="text-base font-bold text-foreground">
            {kind === 'overdue'
              ? formatCurrency(remainingDebt(payment))
              : formatCurrency(contract.rentAmount + contract.duesAmount)}
          </Text>
        </View>
      </Pressable>

      {/* Actions */}
      <View className="mt-3 flex-row gap-2">
        <ActionButton icon={Copy} label="Kopyala" onPress={handleCopy} />
        <ActionButton icon={MessageCircle} label="WhatsApp" tone="whatsapp" onPress={handleWhatsApp} />
        <ActionButton
          icon={Check}
          label={done ? 'Yapıldı' : 'Tamamla'}
          tone={done ? 'done' : 'default'}
          onPress={handleComplete}
        />
      </View>
    </Card>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onPress,
  tone = 'default',
}: {
  icon: typeof Copy;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'whatsapp' | 'done';
}) {
  const styles = {
    default: { bg: 'bg-background', color: palette.primary, text: 'text-foreground' },
    whatsapp: { bg: 'bg-[#E7F8EF]', color: '#1FA855', text: 'text-[#1FA855]' },
    done: { bg: 'bg-success-soft', color: palette.success, text: 'text-success' },
  }[tone];

  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl py-2.5 active:opacity-80 ${styles.bg}`}
    >
      <Icon size={16} color={styles.color} />
      <Text className={`text-xs font-semibold ${styles.text}`}>{label}</Text>
    </Pressable>
  );
}
