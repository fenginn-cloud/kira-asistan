import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowDownUp, BarChart3, FileSearch, Plus, Search, SlidersHorizontal } from 'lucide-react-native';
import { ContractCard } from '@/features/contracts/components/ContractCard';
import { MarkReceivedSheet } from '@/features/payments/components/MarkReceivedSheet';
import { useContracts } from '@/features/contracts/hooks';
import { useContractGate } from '@/features/subscription/useContractGate';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { useAllPayments, useMarkReceived } from '@/features/payments/hooks';
import { notifyTeamPaymentReceived } from '@/services/notifyTeam';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/utils/error';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ActionSheet, type ActionSheetItem } from '@/components/ui/ActionSheet';
import { FilterBottomSheet } from '@/features/contracts/components/FilterBottomSheet';
import { useAuthStore } from '@/store/authStore';
import { useScrollToTop } from '@/lib/scrollToTop';
import { useThemeColors } from '@/lib/theme/useThemeColors';
import { palette } from '@/lib/theme/colors';
import { formatCurrencyTRY, getContractBalance, type ContractBalance } from '@/lib/ledger/ledger';
import { daysUntilEnd } from '@/lib/utils/contractExpiry';
import { buildingName, foldSearch } from '@/lib/utils/property';
import { conflictingContractIds } from '@/features/contracts/duplicates';
import { useDesktopShell } from '@/lib/useDesktopShell';
import {
  SORT_LABELS,
  useContractsViewStore,
  type SortKey,
  type StatusFilter,
} from '@/store/contractsViewStore';
import type { Contract, Payment } from '@/types';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'active', label: 'Aktif' },
  { key: 'passive', label: 'Pasif' },
  { key: 'overdue', label: 'Gecikenler' },
  { key: 'debtor', label: 'Borcu Olanlar' },
  { key: 'creditor', label: 'Fazla Ödeyenler' },
  { key: 'paid_month', label: 'Bu Ay Ödeyenler' },
  { key: 'partial_month', label: 'Bu Ay Eksik' },
  { key: 'unpaid_month', label: 'Bu Ay Ödemeyenler' },
  { key: 'expiring', label: 'Bitişi Yaklaşan' },
  { key: 'conflicts', label: 'Çakışan' },
];

const SORT_ORDER: SortKey[] = [
  'date_desc',
  'date_asc',
  'name_asc',
  'name_desc',
  'rent_desc',
  'rent_asc',
  'debt_desc',
  'debt_asc',
  'over_desc',
];

function contractName(c: Contract): string {
  return [c.propertyName, c.block, c.unit].filter(Boolean).join(' ');
}

function sortContracts(
  list: Contract[],
  sort: SortKey,
  balances: Map<string, ContractBalance>
): Contract[] {
  const arr = [...list];
  const debt = (c: Contract) => balances.get(c.id)?.totalDebt ?? 0;
  const credit = (c: Contract) => balances.get(c.id)?.totalCredit ?? 0;
  switch (sort) {
    case 'date_asc':
      return arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'name_asc':
      return arr.sort((a, b) =>
        contractName(a).localeCompare(contractName(b), 'tr', { numeric: true })
      );
    case 'name_desc':
      return arr.sort((a, b) =>
        contractName(b).localeCompare(contractName(a), 'tr', { numeric: true })
      );
    case 'rent_desc':
      return arr.sort((a, b) => b.rentAmount - a.rentAmount);
    case 'rent_asc':
      return arr.sort((a, b) => a.rentAmount - b.rentAmount);
    case 'debt_desc':
      return arr.sort((a, b) => debt(b) - debt(a));
    case 'debt_asc':
      return arr.sort((a, b) => debt(a) - debt(b));
    case 'over_desc':
      return arr.sort((a, b) => credit(b) - credit(a));
    case 'date_desc':
    default:
      return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export default function ContractsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const listRef = useScrollToTop<FlatList>('contracts');
  const { data: contracts = [], isLoading } = useContracts();
  const gate = useContractGate();
  // Blok bazlı filtre yalnızca legacy profiller için.
  const isLegacy = useEntitlement().isLegacy;
  const onNewContract = () =>
    router.push(gate.allowed ? '/(app)/contracts/new' : '/(app)/paywall?reason=limit');
  const { data: payments = [] } = useAllPayments();
  const [query, setQuery] = useState('');
  const [block, setBlock] = useState('all');
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<Contract | null>(null);
  const toast = useToast();
  const markReceived = useMarkReceived();
  const role = useAuthStore((s) => s.user?.role);
  // Cari hesap (bakiye/borç) yalnızca yöneticide; personel sade checklist görür.
  const canSeeLedger = role === 'admin' || role === 'super_admin';
  // Geniş ekran (yönetici masaüstü kabuğu): kartları ızgara olarak göster.
  const { enabled: desktopShell } = useDesktopShell();
  const { width } = useWindowDimensions();
  const numColumns = desktopShell ? (width >= 1500 ? 3 : 2) : 1;

  const { status, property, sort, setStatus, setProperty, setSort } =
    useContractsViewStore();

  const confirmReceived = (note: string | null) => {
    const contract = receiveTarget;
    if (!contract) return;
    markReceived.mutate(
      { contract, note },
      {
        onSuccess: () => {
          setReceiveTarget(null);
          toast.success('Kira alındı olarak işaretlendi');
          void notifyTeamPaymentReceived(contract.id, note).then((r) => {
            if (r.ok && r.sent > 0) {
              toast.info(`${r.sent} kişiye bildirim gönderildi`);
            } else if (r.ok && r.sent === 0) {
              toast.info('Bildirim alacak (izin vermiş) başka kullanıcı yok');
            } else if (r.error) {
              toast.error(`Bildirim gönderilemedi: ${r.error}`);
            }
          });
        },
        onError: (e) => toast.error(errorMessage(e, 'İşaretlenemedi')),
      }
    );
  };

  // Bina bazlı otomatik mülk filtreleri (EGE İREM, ELİZE APT, Dream Rezidans…).
  const propertyOptions = useMemo(() => {
    const names = [
      ...new Set(contracts.map((c) => buildingName(c.propertyName)).filter(Boolean)),
    ];
    names.sort((a, b) => a.localeCompare(b, 'tr'));
    return ['all', ...names];
  }, [contracts]);

  // Seçili mülkün blokları (blok filtresi yalnızca legacy'de gösterilir).
  const blockOptions = useMemo(() => {
    if (property === 'all') return [] as string[];
    const blocks = [
      ...new Set(
        contracts
          .filter((c) => buildingName(c.propertyName) === property)
          .map((c) => (c.block ?? '').trim())
          .filter(Boolean)
      ),
    ];
    blocks.sort((a, b) => a.localeCompare(b, 'tr'));
    return blocks.length ? ['all', ...blocks] : [];
  }, [contracts, property]);

  // Mülk değişince blok filtresini sıfırla.
  useEffect(() => {
    setBlock('all');
  }, [property]);

  // Per-contract cari hesap balances, computed once from all payments.
  const balances = useMemo(() => {
    const byContract = new Map<string, Payment[]>();
    for (const p of payments) {
      const arr = byContract.get(p.contractId);
      if (arr) arr.push(p);
      else byContract.set(p.contractId, [p]);
    }
    const map = new Map<string, ContractBalance>();
    for (const c of contracts) {
      map.set(c.id, getContractBalance(c, byContract.get(c.id) ?? []));
    }
    return map;
  }, [contracts, payments]);

  // Çakışan sözleşmeler (aynı daire aktif ya da aynı isim).
  const conflictIds = useMemo(() => conflictingContractIds(contracts), [contracts]);

  // Header özeti (Stitch): aktif sayısı, aylık hacim, geciken tutar/adet.
  const headerStats = useMemo(() => {
    let active = 0;
    let monthlyVolume = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    for (const c of contracts) {
      if (c.status === 'active') {
        active += 1;
        monthlyVolume += c.rentAmount + c.duesAmount;
      }
      const b = balances.get(c.id);
      if (b?.hasOverdue) {
        overdueCount += 1;
        overdueAmount += b.totalDebt;
      }
    }
    return { all: contracts.length, active, monthlyVolume, overdueAmount, overdueCount };
  }, [contracts, balances]);

  const filterCount: Partial<Record<StatusFilter, number>> = {
    all: headerStats.all,
    active: headerStats.active,
    overdue: headerStats.overdueCount,
  };

  const filtered = useMemo(() => {
    // Türkçe-duyarlı, aksan/büyük-küçük harf duyarsız arama.
    const q = foldSearch(query.trim());
    const result = contracts.filter((c) => {
      // Arama: mülk + blok + daire + kiracı + telefon
      if (q) {
        const hay = foldSearch(
          [c.propertyName, c.block, c.unit, c.tenantName, c.tenantPhone]
            .filter(Boolean)
            .join(' ')
        );
        if (!hay.includes(q)) return false;
      }
      // Bina filtresi (mülk adının bina kısmına göre)
      if (property !== 'all' && buildingName(c.propertyName) !== property) return false;
      // Blok filtresi (yalnızca legacy + mülk seçiliyken)
      if (isLegacy && property !== 'all' && block !== 'all' && (c.block ?? '').trim() !== block)
        return false;

      // Status / cari hesap filter
      const bal = balances.get(c.id);
      switch (status) {
        case 'active':
          return c.status === 'active';
        case 'passive':
          return c.status === 'passive';
        case 'overdue':
          return !!bal?.hasOverdue;
        case 'debtor':
          return (bal?.totalBalance ?? 0) < 0;
        case 'creditor':
          return (bal?.totalBalance ?? 0) > 0;
        case 'paid_month':
          return bal?.currentMonth.status === 'paid' || bal?.currentMonth.status === 'overpaid';
        case 'partial_month':
          return bal?.currentMonth.status === 'partial';
        case 'unpaid_month':
          return bal?.currentMonth.status === 'pending' || bal?.currentMonth.status === 'overdue';
        case 'expiring': {
          const d = daysUntilEnd(c);
          return d !== null && d <= 30;
        }
        case 'conflicts':
          return conflictIds.has(c.id);
        default:
          return true;
      }
    });

    return sortContracts(result, sort, balances);
  }, [contracts, balances, conflictIds, query, status, property, block, isLegacy, sort]);

  // Muhasebe odaklı filtre/sıralamalar yalnızca yöneticide görünür.
  const LEDGER_FILTERS: StatusFilter[] = ['debtor', 'creditor'];
  const LEDGER_SORTS: SortKey[] = ['debt_desc', 'debt_asc', 'over_desc'];
  const statusFilters = canSeeLedger
    ? STATUS_FILTERS
    : STATUS_FILTERS.filter((f) => !LEDGER_FILTERS.includes(f.key));
  const sortOrder = canSeeLedger
    ? SORT_ORDER
    : SORT_ORDER.filter((k) => !LEDGER_SORTS.includes(k));

  const sortItems: ActionSheetItem[] = sortOrder.map((key) => ({
    label: SORT_LABELS[key] + (sort === key ? '  ✓' : ''),
    onPress: () => setSort(key),
  }));

  const summary = `${property === 'all' ? 'Tüm mülkler' : property} · ${filtered.length} sözleşme · ${SORT_LABELS[sort]}`;

  // Filtre bottom sheet için aktif (varsayılandan farklı) filtre sayısı.
  const activeFilterCount =
    (status !== 'all' ? 1 : 0) + (property !== 'all' ? 1 : 0) + (sort !== 'name_asc' ? 1 : 0);
  const clearFilters = () => {
    setStatus('all');
    setProperty('all');
    setSort('name_asc');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl font-bold text-foreground">Sözleşmeler</Text>
            <View className="rounded-full bg-primary-50 px-2.5 py-1">
              <Text className="text-xs font-bold text-primary-700">{headerStats.active} Aktif</Text>
            </View>
          </View>
          <Pressable
            onPress={onNewContract}
            className="h-11 flex-row items-center gap-1.5 rounded-2xl bg-primary px-4 active:opacity-80"
          >
            <Plus size={18} color="#FFFFFF" />
            <Text className="text-sm font-bold text-white">Yeni Ekle</Text>
          </Pressable>
        </View>

        {/* Özet şeridi (Stitch) — yalnızca yönetici */}
        {canSeeLedger ? (
          <View className="mt-4 flex-row rounded-3xl bg-[#131B2E] p-4">
            <View className="flex-1">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
                Aylık Hacim
              </Text>
              <Text className="mt-1 text-lg font-extrabold text-white" numberOfLines={1}>
                {formatCurrencyTRY(headerStats.monthlyVolume)}
              </Text>
            </View>
            <View className="mx-3 w-px bg-white/10" />
            <View className="flex-1">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
                Geciken
              </Text>
              <Text className="mt-1 text-lg font-extrabold text-danger" numberOfLines={1}>
                {formatCurrencyTRY(headerStats.overdueAmount)}
              </Text>
              <Text className="text-[11px] text-white/50">{headerStats.overdueCount} sözleşme</Text>
            </View>
            <View className="mx-3 w-px bg-white/10" />
            <View className="flex-1">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
                Aktif
              </Text>
              <Text className="mt-1 text-lg font-extrabold text-success" numberOfLines={1}>
                {headerStats.active}
              </Text>
              <Text className="text-[11px] text-white/50">/ {headerStats.all} toplam</Text>
            </View>
          </View>
        ) : null}

        {/* Search + Filtrele (Stitch) */}
        <View className="mt-4 flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-4">
            <Search size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Kiracı, mülk veya blok ara"
              placeholderTextColor={colors.textMuted}
              className="h-12 flex-1 text-base text-foreground"
            />
          </View>
          <Pressable
            onPress={() => setFilterOpen(true)}
            className="h-12 flex-row items-center gap-1.5 rounded-2xl border border-border bg-surface px-3.5 active:opacity-80"
          >
            <SlidersHorizontal size={16} color={colors.text} />
            <Text className="text-sm font-semibold text-foreground">Filtrele</Text>
            {activeFilterCount > 0 ? (
              <View className="h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1">
                <Text className="text-[11px] font-bold text-white">{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Status filters */}
        <FlatList
          horizontal
          data={statusFilters}
          keyExtractor={(f) => f.key}
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const active = status === item.key;
            const count = filterCount[item.key];
            return (
              <Pressable
                onPress={() => setStatus(item.key)}
                className={`flex-row items-center gap-1.5 rounded-full px-4 py-2 ${
                  active ? 'bg-primary' : 'bg-surface border border-border'
                }`}
              >
                <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted'}`}>
                  {item.label}
                </Text>
                {count !== undefined ? (
                  <Text className={`text-xs font-bold ${active ? 'text-white/80' : 'text-muted/70'}`}>
                    {count}
                  </Text>
                ) : null}
              </Pressable>
            );
          }}
        />

        {/* Property filters (auto-generated) */}
        {propertyOptions.length > 2 ? (
          <FlatList
            horizontal
            data={propertyOptions}
            keyExtractor={(p) => p}
            showsHorizontalScrollIndicator={false}
            className="mt-2"
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => {
              const active = property === item;
              const label = item === 'all' ? 'Tüm Mülkler' : item;
              return (
                <Pressable
                  onPress={() => setProperty(item)}
                  className={`rounded-full px-4 py-2 ${
                    active ? 'bg-primary-700' : 'bg-surface border border-border'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted'}`}>
                    {label}
                  </Text>
                </Pressable>
              );
            }}
          />
        ) : null}

        {/* Blok filtreleri — yalnızca legacy + bir mülk seçiliyken */}
        {isLegacy && blockOptions.length > 1 ? (
          <FlatList
            horizontal
            data={blockOptions}
            keyExtractor={(b) => b}
            showsHorizontalScrollIndicator={false}
            className="mt-2"
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => {
              const active = block === item;
              const label = item === 'all' ? 'Tüm Bloklar' : `Blok ${item}`;
              return (
                <Pressable
                  onPress={() => setBlock(item)}
                  className={`rounded-full px-4 py-2 ${
                    active ? 'bg-primary' : 'bg-surface border border-border'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted'}`}>
                    {label}
                  </Text>
                </Pressable>
              );
            }}
          />
        ) : null}

        {/* Summary + sort */}
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="flex-1 pr-3 text-xs text-muted" numberOfLines={1}>
            {summary}
          </Text>
          <Pressable
            onPress={() => setSortOpen(true)}
            className="flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 active:opacity-80"
          >
            <ArrowDownUp size={15} color={colors.text} />
            <Text className="text-sm font-semibold text-foreground">Sırala</Text>
          </Pressable>
        </View>

        {/* Mülk seçiliyken: o mülkün aylık performans raporu (yönetici) */}
        {canSeeLedger && property !== 'all' ? (
          <Pressable
            onPress={() =>
              router.push(`/(app)/property-report?name=${encodeURIComponent(property)}`)
            }
            className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary-50 px-4 py-3 active:opacity-80"
          >
            <BarChart3 size={18} color={palette.primary} />
            <Text className="text-sm font-semibold text-primary-700">
              {property} · Performans Raporu
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View className="gap-3 px-5 pt-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={filtered}
          // numColumns değişince FlatList yeniden kurulmalı (key değişimi).
          key={`cols-${numColumns}`}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
          keyExtractor={(c: Contract) => c.id}
          contentContainerClassName="px-5 pt-4 pb-10 gap-3"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={FileSearch}
              title="Sonuç bulunamadı"
              description="Arama veya filtre kriterlerinize uygun sözleşme yok."
            />
          }
          renderItem={({ item }) => {
            const card = (
              <ContractCard
                contract={item}
                balance={balances.get(item.id)}
                showLedger={canSeeLedger}
                onPress={() => router.push(`/(app)/contracts/${item.id}`)}
                onMarkReceived={canSeeLedger ? () => setReceiveTarget(item) : undefined}
              />
            );
            // Izgarada her hücre eşit genişlik kaplasın.
            return numColumns > 1 ? <View style={{ flex: 1 }}>{card}</View> : card;
          }}
        />
      )}

      <ActionSheet
        visible={sortOpen}
        title="Sırala"
        items={sortItems}
        onClose={() => setSortOpen(false)}
      />

      <FilterBottomSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        statusFilters={statusFilters}
        status={status}
        onStatus={setStatus}
        propertyOptions={propertyOptions}
        property={property}
        onProperty={setProperty}
        sortOrder={sortOrder}
        sort={sort}
        sortLabels={SORT_LABELS}
        onSort={setSort}
        onClear={clearFilters}
      />

      <MarkReceivedSheet
        contract={receiveTarget}
        submitting={markReceived.isPending}
        onClose={() => setReceiveTarget(null)}
        onConfirm={confirmReceived}
      />
    </SafeAreaView>
  );
}
