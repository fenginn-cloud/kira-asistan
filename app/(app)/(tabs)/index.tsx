import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Inbox,
  Lock,
  TimerReset,
  Wallet,
} from 'lucide-react-native';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ContractExpiryRow } from '@/features/dashboard/components/ContractExpiryRow';
import { CollectionHome } from '@/features/dashboard/CollectionHome';
import { useContractGate } from '@/features/subscription/useContractGate';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { MarkReceivedSheet } from '@/features/payments/components/MarkReceivedSheet';
import { useNotificationCenter } from '@/features/notifications/useNotificationCenter';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments, usePendingClaims, useSettlePayment } from '@/features/payments/hooks';
import { notifyTeamPaymentReceived } from '@/services/notifyTeam';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/utils/error';
import type { OpenItem } from '@/features/notifications/reminders';
import { useAuthStore } from '@/store/authStore';
import { useScrollToTop } from '@/lib/scrollToTop';
import { queryKeys } from '@/lib/query';
import { formatCurrency } from '@/lib/utils/format';
import { formatCurrencyTRY, getDashboardFinancialSummary } from '@/lib/ledger/ledger';
import { expiringContracts } from '@/lib/utils/contractExpiry';
import { palette } from '@/lib/theme/colors';

export default function HomeScreen() {
  const router = useRouter();
  const gate = useContractGate();
  const entitlement = useEntitlement();
  const showLimitStrip =
    gate.plan === 'free' &&
    !gate.isLegacy &&
    gate.limit !== null &&
    gate.count >= gate.limit - 1;
  const user = useAuthStore((s) => s.user);
  // Cari hesap / finansal özet yalnızca yöneticide.
  const canSeeLedger = user?.role === 'admin' || user?.role === 'super_admin';
  const scrollRef = useScrollToTop<ScrollView>('index');
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { isLoading, upcoming, overdue } = useNotificationCenter();
  const { data: contracts = [] } = useContracts();
  const { data: payments = [] } = useAllPayments();
  const finance = getDashboardFinancialSummary(contracts, payments);
  const expiring = expiringContracts(contracts);
  const { data: pendingClaims = [] } = usePendingClaims();
  const toast = useToast();
  const settlePayment = useSettlePayment();
  const [receiveTarget, setReceiveTarget] = useState<OpenItem | null>(null);

  const confirmReceived = (note: string | null) => {
    const item = receiveTarget;
    if (!item) return;
    settlePayment.mutate(
      { payment: item.payment, note },
      {
        onSuccess: () => {
          setReceiveTarget(null);
          toast.success('Kira alındı olarak işaretlendi');
          void notifyTeamPaymentReceived(item.contract.id, note);
        },
        onError: (e) => toast.error(errorMessage(e, 'İşaretlenemedi')),
      }
    );
  };

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

        {showLimitStrip ? (
          <Pressable
            onPress={() => router.push('/(app)/paywall?reason=limit')}
            className="mt-4 flex-row items-center justify-between rounded-2xl border border-primary/30 bg-primary-50 px-4 py-3 active:opacity-80"
          >
            <View className="flex-1 pr-3">
              <Text className="text-sm font-semibold text-primary-700">
                {gate.count}/{gate.limit} sözleşme kullanıldı
              </Text>
              <Text className="text-xs text-muted">
                Sınırsız sözleşme için planınızı yükseltin.
              </Text>
            </View>
            <Text className="text-sm font-semibold text-primary-700">Yükselt</Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <View className="mt-6 gap-3">
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : !canSeeLedger ? (
          // Personel: sade tahsilat takibi (Ara / WhatsApp)
          <CollectionHome
            overdue={overdue}
            upcoming={upcoming}
            onContractPress={goToContract}
            showContact
          />
        ) : (
          <>
            {/* 0 — Tenant-reported payments awaiting approval */}
            {canSeeLedger && pendingClaims.length > 0 ? (
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

            {/* Tahsilat takibi — Bugün / Geciken / Bu hafta (yöneticide "Alındı") */}
            <CollectionHome
              overdue={overdue}
              upcoming={upcoming}
              onContractPress={goToContract}
              onMarkReceived={(item) => setReceiveTarget(item)}
            />

            {/* Contracts ending soon (renewal / rent-increase opportunity) */}
            {canSeeLedger && expiring.length > 0 ? (
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

            {/* 4 — Aylık özet + cari hesap: yalnızca yönetici + Pro/Business.
                   Free yöneticide kilitli teaser gösterilir (içerik sezdirilir). */}
            {canSeeLedger && entitlement.limits.stats ? (
            <>
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
            ) : canSeeLedger ? (
              <LockedFinancialTeaser
                onUpgrade={() => router.push('/(app)/paywall?feature=stats')}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Yönetici: tek tuş "Alındı" onayı */}
      <MarkReceivedSheet
        contract={receiveTarget?.contract ?? null}
        submitting={settlePayment.isPending}
        onClose={() => setReceiveTarget(null)}
        onConfirm={confirmReceived}
      />
    </SafeAreaView>
  );
}

/**
 * Free planda yöneticiye gösterilen kilitli finansal teaser. Gerçek rakamlar
 * yerine soluk örnek kartlar + üstte kilit ve "Planları Gör" CTA — kullanıcı
 * içeriğin varlığını görür ama değerleri Pro/Business'ta açılır.
 */
function LockedFinancialTeaser({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <>
      <SectionHeader title="Aylık Özet & Cari Hesap" />
      <View className="relative">
        <View className="gap-3 opacity-40" pointerEvents="none">
          <View className="flex-row gap-3">
            <StatCard label="Bu Ay Beklenen" value="••••₺" icon={Wallet} tone="primary" />
            <StatCard label="Bu Ay Tahsil Edilen" value="••••₺" icon={CheckCircle2} tone="success" />
          </View>
          <View className="flex-row gap-3">
            <StatCard label="Net Bakiye" value="••••₺" icon={Wallet} tone="success" />
            <StatCard label="Kalan Alacak" value="••••₺" icon={TimerReset} tone="warning" />
          </View>
        </View>
        <View className="absolute inset-0 items-center justify-center px-4">
          <Pressable
            onPress={onUpgrade}
            className="items-center rounded-3xl border border-border bg-surface px-6 py-5 shadow-sm shadow-black/10 active:opacity-90"
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary-50">
              <Lock size={22} color={palette.primary} />
            </View>
            <Text className="mt-3 text-base font-bold text-foreground">Finansal Özet kilitli</Text>
            <Text className="mt-1 text-center text-xs text-muted">
              Aylık özet, cari hesap ve istatistikler Pro planına dahildir.
            </Text>
            <View className="mt-3 rounded-2xl bg-primary px-5 py-2.5">
              <Text className="text-sm font-semibold text-white">Planları Gör</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </>
  );
}
