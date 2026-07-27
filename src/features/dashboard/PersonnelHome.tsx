import { Text, View } from 'react-native';
import { CalendarClock, CheckCircle2, TimerReset } from 'lucide-react-native';
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
 * Sadece geciken + yaklaşan kiralar; her kartta tek tuş Ara / WhatsApp.
 * Cari hesap / bakiye / istatistik yok.
 */
export function PersonnelHome({ overdue, upcoming, onContractPress }: Props) {
  const upcomingList = [...upcoming.in1, ...upcoming.in3, ...upcoming.in7].sort(
    (a, b) => a.daysUntil - b.daysUntil
  );
  const nothing = overdue.length === 0 && upcomingList.length === 0;

  return (
    <View className="mt-4">
      {/* Özet */}
      <View className="flex-row gap-3">
        <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row items-center gap-1.5">
            <TimerReset size={16} color="#DC2626" />
            <Text className="text-xs text-muted">Geciken</Text>
          </View>
          <Text className="mt-1 text-2xl font-bold text-danger">{overdue.length}</Text>
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
            description="Geciken veya bu hafta ödenecek kira görünmüyor."
          />
        </View>
      ) : null}

      {/* Gecikenler — önce ve en acil */}
      {overdue.length > 0 ? (
        <>
          <View className="mb-2 mt-6 flex-row items-center gap-2">
            <TimerReset size={18} color="#DC2626" />
            <Text className="text-lg font-bold text-foreground">Geciken Tahsilatlar</Text>
          </View>
          {overdue.map((item) => (
            <CollectionCard
              key={item.contract.id}
              item={item}
              onPress={() => onContractPress(item.contract.id)}
            />
          ))}
        </>
      ) : null}

      {/* Bu hafta yaklaşanlar */}
      {upcomingList.length > 0 ? (
        <>
          <View className="mb-2 mt-6 flex-row items-center gap-2">
            <CalendarClock size={18} color="#2563EB" />
            <Text className="text-lg font-bold text-foreground">Bu Hafta Ödenecekler</Text>
          </View>
          {upcomingList.map((item) => (
            <CollectionCard
              key={item.contract.id}
              item={item}
              onPress={() => onContractPress(item.contract.id)}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}
