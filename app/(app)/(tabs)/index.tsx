import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Building2,
  CheckCircle2,
  FilePlus2,
  Inbox,
  Lock,
  Search,
  Send,
  TimerReset,
  Wallet,
} from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ContractExpiryRow } from '@/features/dashboard/components/ContractExpiryRow';
import { HeroSummaryCard } from '@/features/dashboard/components/HeroSummaryCard';
import { FinancialInsight } from '@/features/dashboard/components/FinancialInsight';
import { QuickActions, type QuickAction } from '@/features/dashboard/components/QuickActions';
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

  // Hızlı İşlemler — yalnızca gerçek ürün akışları (bağımsız AI Danışman YOK).
  const quickActions: QuickAction[] = [
    {
      key: 'collect',
      label: 'Tahsilat',
      icon: Wallet,
      color: '#2563EB',
      chip: 'bg-primary-50',
      onPress: () => router.push('/contracts'),
    },
    {
      key: 'new',
      label: 'Yeni Sözleşme',
      icon: FilePlus2,
      color: '#16A34A',
      chip: 'bg-success-soft',
      onPress: () => router.push(gate.allowed ? '/(app)/contracts/new' : '/(app)/paywall'),
    },
    {
      key: 'form',
      label: 'Form Paylaş',
      icon: Send,
      color: '#D97706',
      chip: 'bg-warning-soft',
      onPress: () => router.push('/(app)/tenant-forms/new'),
    },
    {
      key: 'properties',
      label: 'Mülkler',
      icon: Building2,
      color: '#2563EB',
      chip: 'bg-primary-50',
      onPress: () => router.push('/properties'),
    },
  ];

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
        {/* Header — gerçek kullanıcı bilgisi (initials avatar), arama + bildirim */}
        <View className="flex-row items-center gap-3 pt-2">
          <Avatar name={user?.fullName ?? 'K'} size={44} />
          <View className="flex-1">
            <Text className="text-sm text-muted">Hoş geldiniz,</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-bold text-foreground" numberOfLines={1}>
                {user?.fullName ?? 'Kullanıcı'}
              </Text>
              {canSeeLedger ? (
                <Text className="text-xs font-semibold text-primary-700">
                  {contracts.length} Sözleşme
                </Text>
              ) : null}
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/contracts')}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface border border-border/60 active:opacity-80"
          >
            <Search size={18} color={palette.muted} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/notification-settings')}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface border border-border/60 active:opacity-80"
          >
            <Bell size={18} color={palette.muted} />
          </Pressable>
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

            {/* Hızlı İşlemler (Stitch) — bağımsız AI Danışman kaldırıldı */}
            <QuickActions actions={quickActions} />

            {/* Finansal Öngörü (Stitch) — bağlamsal içgörü, gerçek veriden.
                Yalnızca Pro/Business finansal özet açıkken gösterilir. */}
            {entitlement.limits.stats ? (
              <FinancialInsight
                finance={finance}
                overdue={overdue}
                upcoming={upcoming}
                onPress={() => router.push('/stats')}
              />
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
            {/* Stitch Hero — bu ayın tahsilat özeti (beklenen/tahsil/kalan + oran) */}
            <HeroSummaryCard
              expected={finance.expectedThisMonth}
              collected={finance.collectedThisMonth}
              remaining={finance.remainingThisMonth}
              onRecord={() => router.push('/contracts')}
              onReport={() => router.push('/stats')}
            />

            <SectionHeader title="Cari Hesap" />
            <View className="gap-3">
              <View className="flex-row gap-3">
                <StatCard
                  label="Net Bakiye"
                  value={formatCurrencyTRY(finance.netBalance)}
                  icon={Wallet}
                  tone={finance.netBalance < 0 ? 'danger' : 'success'}
                />
                <StatCard
                  label="Geciken Sözleşme"
                  value={`${finance.overdueContracts}`}
                  icon={TimerReset}
                  tone="danger"
                />
              </View>
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
                  label="Kısmi Ödeyen"
                  value={`${finance.partialContracts}`}
                  icon={Wallet}
                  tone="warning"
                />
                <View className="flex-1" />
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
