import { Text, View } from 'react-native';
import { CalendarCheck, CalendarClock, CheckCircle2, TimerReset } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { CollectionCard } from './components/CollectionCard';
import type { OpenItem, UpcomingBuckets } from '@/features/notifications/reminders';

interface Props {
  overdue: OpenItem[];
  upcoming: UpcomingBuckets;
  onContractPress: (id: string) => void;
  /** Personel: kartlarda Ara / WhatsApp. */
  showContact?: boolean;
  /** Yönetici: kartlarda tek tuş "Alındı" — o kartın ayı/ödemesi işaretlenir. */
  onMarkReceived?: (item: OpenItem) => void;
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
        <SummaryTile icon={CalendarCheck} color="#D97706" chip="bg-warning-soft" label="Bugün" value={todayList.length} tone="text-warning" />
        <SummaryTile icon={TimerReset} color="#DC2626" chip="bg-danger-soft" label="Geciken" value={overdueList.length} tone="text-danger" />
        <SummaryTile icon={CalendarClock} color="#2563EB" chip="bg-primary-50" label="Bu hafta" value={upcomingList.length} tone="text-primary-700" />
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
  chip,
  label,
  value,
  tone,
}: {
  icon: typeof TimerReset;
  color: string;
  chip: string;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <View className="flex-1 rounded-3xl border border-border/60 bg-surface p-3.5 shadow-sm shadow-black/5">
      <View className={`h-8 w-8 items-center justify-center rounded-2xl ${chip}`}>
        <Icon size={16} color={color} />
      </View>
      <Text className={`mt-2.5 text-2xl font-extrabold ${tone}`}>{value}</Text>
      <Text className="mt-0.5 text-xs font-medium text-muted">{label}</Text>
    </View>
  );
}
