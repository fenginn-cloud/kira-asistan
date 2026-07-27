import { Text, View } from 'react-native';
import { CalendarCheck, CalendarClock, CheckCircle2, TimerReset } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { CollectionCard } from './components/CollectionCard';
import type { OpenItem, UpcomingBuckets } from '@/features/notifications/reminders';

interface Props {
  overdue: OpenItem[];
  upcoming: UpcomingBuckets;
  onContractPress: (id: string) => void;
}

/**
 * Personel ana sayfası — sade "tahsilat takibi" listesi.
 * Sıra: Bugün → Geciken → Bu hafta. Her kartta tek tuş Ara / WhatsApp.
 * Cari hesap / bakiye / istatistik yok.
 */
export function PersonnelHome({ overdue, upcoming, onContractPress }: Props) {
  // Bugün ödeme günü olanlar (vadesi bugün).
  const todayList = [...overdue, ...upcoming.in1, ...upcoming.in3, ...upcoming.in7].filter(
    (i) => i.daysUntil === 0
  );
  // Gecikenler (vadesi geçmiş, ödenmemiş), en çok geciken önce.
  const overdueList = overdue
    .filter((i) => i.daysUntil < 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  // Bu hafta yaklaşanlar (1–7 gün), en yakın önce.
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
          />
        ))}
      </>
    );
  };

  return (
    <View className="mt-4">
      {/* Özet */}
      <View className="flex-row gap-3">
        <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row items-center gap-1.5">
            <CalendarCheck size={16} color="#D97706" />
            <Text className="text-xs text-muted">Bugün</Text>
          </View>
          <Text className="mt-1 text-2xl font-bold text-warning">{todayList.length}</Text>
        </View>
        <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row items-center gap-1.5">
            <TimerReset size={16} color="#DC2626" />
            <Text className="text-xs text-muted">Geciken</Text>
          </View>
          <Text className="mt-1 text-2xl font-bold text-danger">{overdueList.length}</Text>
        </View>
        <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row items-center gap-1.5">
            <CalendarClock size={16} color="#2563EB" />
            <Text className="text-xs text-muted">Bu hafta</Text>
          </View>
          <Text className="mt-1 text-2xl font-bold text-primary-700">{upcomingList.length}</Text>
        </View>
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
