import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FileSearch, Plus, Search } from 'lucide-react-native';
import { ContractCard } from '@/features/contracts/components/ContractCard';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments } from '@/features/payments/hooks';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useScrollToTop } from '@/lib/scrollToTop';
import { openPaymentFor } from '@/features/notifications/reminders';
import { daysUntilDue } from '@/lib/utils/payments';
import type { Contract, Payment } from '@/types';

type Filter = 'all' | 'active' | 'passive' | 'overdue' | 'upcoming' | 'paid';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'active', label: 'Aktif' },
  { key: 'passive', label: 'Pasif' },
  { key: 'overdue', label: 'Gecikenler' },
  { key: 'upcoming', label: 'Yaklaşanlar' },
  { key: 'paid', label: 'Ödenenler' },
];

export default function ContractsScreen() {
  const router = useRouter();
  const listRef = useScrollToTop<FlatList>('contracts');
  const { data: contracts = [], isLoading } = useContracts();
  const { data: payments = [] } = useAllPayments();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const byContract = new Map<string, Payment[]>();
    for (const p of payments) {
      const arr = byContract.get(p.contractId);
      if (arr) arr.push(p);
      else byContract.set(p.contractId, [p]);
    }

    const q = query.trim().toLowerCase();
    return contracts.filter((c) => {
      const matchesQuery =
        !q ||
        c.propertyName.toLowerCase().includes(q) ||
        c.tenantName.toLowerCase().includes(q) ||
        c.tenantPhone.toLowerCase().includes(q);
      if (!matchesQuery) return false;

      const cp = byContract.get(c.id) ?? [];
      const statuses = new Set(cp.map((p) => p.status)); // live-normalized
      const open = openPaymentFor(cp);
      const daysUntil = open ? daysUntilDue(open) : null;

      switch (filter) {
        case 'active':
          return c.status === 'active';
        case 'passive':
          return c.status === 'passive';
        case 'overdue':
          // Ödeme günü geçmiş + ödenmemiş
          return statuses.has('overdue');
        case 'upcoming':
          // Ödeme gününe 1–7 gün kalan
          return daysUntil !== null && daysUntil >= 1 && daysUntil <= 7;
        case 'paid':
          // İlgili dönem için ödeme alınmış
          return statuses.has('paid');
        default:
          return true;
      }
    });
  }, [contracts, payments, query, filter]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-foreground">Sözleşmeler</Text>
          <Pressable
            onPress={() => router.push('/(app)/contracts/new')}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-primary active:opacity-80"
          >
            <Plus size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Search */}
        <View className="mt-4 flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-4">
          <Search size={18} color="#6B7280" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Mülk, kiracı veya telefon ara"
            placeholderTextColor="#9CA3AF"
            className="h-12 flex-1 text-base text-foreground"
          />
        </View>

        {/* Filters */}
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.key}
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const active = filter === item.key;
            return (
              <Pressable
                onPress={() => setFilter(item.key)}
                className={`rounded-full px-4 py-2 ${
                  active ? 'bg-primary' : 'bg-surface border border-border'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    active ? 'text-white' : 'text-muted'
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
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
          renderItem={({ item }) => (
            <ContractCard
              contract={item}
              onPress={() => router.push(`/(app)/contracts/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
