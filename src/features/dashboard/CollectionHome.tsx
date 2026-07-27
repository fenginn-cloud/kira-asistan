import { Text, View } from 'react-native';
import { CalendarCheck, CalendarClock, CheckCircle2, TimerReset } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { CollectionCard } from './components/CollectionCard';
import type { Contract } from '@/types';
import type { OpenItem, UpcomingBuckets } from '@/features/notifications/reminders';

interface Props {
  overdue: OpenItem[];
  upcoming: UpcomingBuckets;
  onContractPress: (id: string) => void;
  /** Personel: kartlarda Ara / WhatsApp. */
  showContact?: boolean;
  /** Yönetici: kartlarda tek tuş "Alındı". */
  onMarkReceived?: (contract: Contract) => void;
}

/**
 * Ortak "tahsilat takibi" listesi. Sıra: Bugün → Geciken → Bu hafta.
 * Kart aksiyonları role göre: personel Ara/WhatsApp, yönetici Alındı.
 */
export function CollectionHome({
  overdue,
  upcoming,
  onContractPress,
  showContact,
  onMarkReceived,
}: Props) {
  const todayList = [...overdue, ...upcoming.in1, ...upcoming.in3, ...upcoming.in7].filter(
    (i) => i.daysUntil === 0
  );
  const overdueList = overdue
    .filter((i) => i.daysUntil < 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  const upcomingList = [...upcoming.in1, ...upcoming.in3, ...upcoming.in7]
    .filter((i) => i.daysUntil > 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const nothing =
    todayList.length === 0 && overdueList.length === 0 && upcomingList.length === 0;

  const Section = ({
    icon,
    color,
    title,
    items,
  }: {
    icon: typeof TimerReset;
    color: string;
    title: string;
    items: OpenItem[];
  }) => {
    if (items.length === 0) return null;
    const Icon = icon;
    return (
      <>
        <View className="mb-2 mt-6 flex-row items-center gap-2">
          <Icon size={18} color={color} />
          <Text className="text-lg font-bold text-foreground">{title}</Text>
        </View>
        {items.map((item) => (
          <CollectionCard
            key={item.contract.id}
            item={item}
            onPress={() => onContractPress(item.contract.id)}
            showContact={showContact}
            onMarkReceived={onMarkReceived}
          />
        ))}
      </>
    );
  };

  return (
    <View className="mt-4">
      <View className="flex-row gap-3">
        <SummaryTile icon={CalendarCheck} color="#D97706" label="Bugün" value={todayList.length} tone="text-warning" />
        <SummaryTile icon={TimerReset} color="#DC2626" label="Geciken" value={overdueList.length} tone="text-danger" />
        <SummaryTile icon={CalendarClock} color="#2563EB" label="Bu hafta" value={upcomingList.length} tone="text-primary-700" />
      </View>

      {nothing ? (
        <View className="mt-6">
          <EmptyState
            icon={CheckCircle2}
            title="Takip edilecek tahsilat yok"
            description="Bugün, geciken veya bu hafta ödenecek kira görünmüyor."
          />
        </View>
      ) : null}

      <Section icon={CalendarCheck} color="#D97706" title="Bugün Ödenecekler" items={todayList} />
      <Section icon={TimerReset} color="#DC2626" title="Geciken Tahsilatlar" items={overdueList} />
      <Section icon={CalendarClock} color="#2563EB" title="Bu Hafta Ödenecekler" items={upcomingList} />
    </View>
  );
}

function SummaryTile({
  icon: Icon,
  color,
  label,
  value,
  tone,
}: {
  icon: typeof TimerReset;
  color: string;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-center gap-1.5">
        <Icon size={16} color={color} />
        <Text className="text-xs text-muted">{label}</Text>
      </View>
      <Text className={`mt-1 text-2xl font-bold ${tone}`}>{value}</Text>
    </View>
  );
}
