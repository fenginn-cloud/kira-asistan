import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Inbox,
  TimerReset,
  Wallet,
} from 'lucide-react-native';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { DashboardPaymentRow } from '@/features/dashboard/components/DashboardPaymentRow';
import { ContractExpiryRow } from '@/features/dashboard/components/ContractExpiryRow';
import { ReminderCard } from '@/features/notifications/components/ReminderCard';
import { useNotificationCenter } from '@/features/notifications/useNotificationCenter';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments, usePendingClaims } from '@/features/payments/hooks';
import { useAuthStore } from '@/store/authStore';
import { useScrollToTop } from '@/lib/scrollToTop';
import { queryKeys } from '@/lib/query';
import { formatCurrency } from '@/lib/utils/format';
import { formatCurrencyTRY, getDashboardFinancialSummary } from '@/lib/ledger/ledger';
import { expiringContracts } from '@/lib/utils/contractExpiry';
import { palette } from '@/lib/theme/colors';
import type { OpenItem } from '@/features/notifications/reminders';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const scrollRef = useScrollToTop<ScrollView>('index');
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { isLoading, today, upcoming, overdue } = useNotificationCenter();
  const { data: contracts = [] } = useContracts();
  const { data: payments = [] } = useAllPayments();
  const finance = getDashboardFinancialSummary(contracts, payments);
  const expiring = expiringContracts(contracts);
  const { data: pendingClaims = [] } = usePendingClaims();

  // Pull-to-refresh: refetch contracts + payments (Supabase or mock).
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        qc.refetchQueries({ queryKey: queryKeys.contracts }),
        qc.refetchQueries({ queryKey: queryKeys.paymentsAll }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const goToContract = (id: string) => router.push(`/(app)/contracts/${id}`);
  const hasUpcoming =
    upcoming.in7.length + upcoming.in3.length + upcoming.in1.length > 0;

  const renderRows = (items: OpenItem[]) =>
    items.map((item) => (
      <DashboardPaymentRow
        key={item.contract.id}
        item={item}
        onPress={() => goToContract(item.contract.id)}
      />
    ));

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
      >
        <View className="pt-2">
          <Text className="text-sm text-muted">Hoş geldin,</Text>
          <Text className="text-2xl font-bold text-foreground">
            {user?.fullName ?? 'Kullanıcı'}
          </Text>
        </View>

        {isLoading ? (
          <View className="mt-6 gap-3">
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : (
          <>
            {/* 0 — Tenant-reported payments awaiting approval */}
            {pendingClaims.length > 0 ? (
              <View className="mt-6 gap-2">
                <View className="flex-row items-center gap-2">
                  <Inbox size={18} color="#D97706" />
                  <Text className="text-lg font-bold text-foreground">
                    Onayınızı Bekleyen Ödemeler
                  </Text>
                </View>
                {pendingClaims.map((claim) => (
                  <Pressable
                    key={claim.id}
                    onPress={() =>
                      router.push(`/(app)/contracts/${claim.contractId}?tab=odemeler`)
                    }
                    className="flex-row items-center justify-between rounded-2xl border border-warning/40 bg-warning-soft p-4 active:opacity-80"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                        {claim.tenantName ?? 'Kiracı'} • {claim.propertyName ?? ''}
                      </Text>
                      <Text className="text-xs text-muted">Kiracı ödeme bildirdi — onayla</Text>
                    </View>
                    <Text className="text-base font-bold text-foreground">
                      {formatCurrency(claim.amount)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* 1 — Today's reminders (the heart of the app) */}
            <View className="mb-1 mt-6 flex-row items-center gap-2">
              <BellRing size={18} color="#2563EB" />
              <Text className="text-lg font-bold text-foreground">
                Bugün İşlem Gerektirenler
              </Text>
            </View>
            {today.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Bugün gönderilecek bildirim yok"
                description="Yaklaşan veya geciken bir ödeme bildirimi bulunmuyor."
              />
            ) : (
              <View className="mt-2">
                {today.map((r) => (
                  <ReminderCard
                    key={r.id}
                    id={r.id}
                    contract={r.contract}
                    payment={r.payment}
                    daysUntil={r.daysUntil}
                    kind={r.kind}
                  />
                ))}
              </View>
            )}

            {/* 2 — Upcoming payments, grouped 7 / 3 / 1 */}
            <SectionHeader title="Yaklaşan Kira Ödemeleri" />
            {!hasUpcoming ? (
              <EmptyState icon={CalendarClock} title="Yaklaşan ödeme yok" />
            ) : (
              <View className="gap-1">
                {upcoming.in7.length > 0 ? (
                  <Bucket label="7 gün kala">{renderRows(upcoming.in7)}</Bucket>
                ) : null}
                {upcoming.in3.length > 0 ? (
                  <Bucket label="3 gün kala">{renderRows(upcoming.in3)}</Bucket>
                ) : null}
                {upcoming.in1.length > 0 ? (
                  <Bucket label="1 gün kala">{renderRows(upcoming.in1)}</Bucket>
                ) : null}
              </View>
            )}

            {/* 3 — Overdue */}
            <SectionHeader title="Gecikmiş Ödemeler" />
            {overdue.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Gecikme yok" description="Tüm ödemeler güncel." />
            ) : (
              renderRows(overdue)
            )}

            {/* 3.5 — Contracts ending soon (renewal / rent-increase opportunity) */}
            {expiring.length > 0 ? (
              <>
                <SectionHeader title="Yaklaşan Sözleşme Bitişleri" />
                {expiring.map((item) => (
                  <ContractExpiryRow
                    key={item.contract.id}
                    item={item}
                    onPress={() => goToContract(item.contract.id)}
                  />
                ))}
              </>
            ) : null}

            {/* 4 — Monthly + cari hesap summary */}
            <SectionHeader title="Aylık Özet" />
            <View className="gap-3">
              <View className="flex-row gap-3">
                <StatCard
                  label="Bu Ay Beklenen"
                  value={formatCurrencyTRY(finance.expectedThisMonth)}
                  icon={Wallet}
                  tone="primary"
                />
                <StatCard
                  label="Bu Ay Tahsil Edilen"
                  value={formatCurrencyTRY(finance.collectedThisMonth)}
                  icon={CheckCircle2}
                  tone="success"
                />
              </View>
              <View className="flex-row gap-3">
                <StatCard
                  label="Bu Ay Kalan"
                  value={formatCurrencyTRY(finance.remainingThisMonth)}
                  icon={TimerReset}
                  tone="warning"
                />
                <StatCard
                  label="Geciken Sözleşme"
                  value={`${finance.overdueContracts}`}
                  icon={TimerReset}
                  tone="danger"
                />
              </View>
            </View>

            <SectionHeader title="Cari Hesap" />
            <View className="gap-3">
              <View className="flex-row gap-3">
                <StatCard
                  label="Toplam Eksik Ödeme"
                  value={formatCurrencyTRY(finance.totalShort)}
                  icon={TimerReset}
                  tone="danger"
                />
                <StatCard
                  label="Toplam Fazla Ödeme"
                  value={formatCurrencyTRY(finance.totalOver)}
                  icon={CheckCircle2}
                  tone="success"
                />
              </View>
              <View className="flex-row gap-3">
                <StatCard
                  label="Net Bakiye"
                  value={formatCurrencyTRY(finance.netBalance)}
                  icon={Wallet}
                  tone={finance.netBalance < 0 ? 'danger' : 'success'}
                />
                <StatCard
                  label="Kısmi Ödeyen"
                  value={`${finance.partialContracts}`}
                  icon={Wallet}
                  tone="warning"
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Bucket({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-1">
      <Text className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </Text>
      {children}
    </View>
  );
}
