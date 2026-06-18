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
import type { Contract } from '@/types';

type Filter = 'all' | 'active' | 'overdue' | 'upcoming' | 'paid' | 'passive';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'active', label: 'Aktif' },
  { key: 'overdue', label: 'Gecikenler' },
  { key: 'upcoming', label: 'Yaklaşanlar' },
  { key: 'paid', label: 'Ödenenler' },
  { key: 'passive', label: 'Pasif' },
];

export default function ContractsScreen() {
  const router = useRouter();
  const listRef = useScrollToTop<FlatList>('contracts');
  const { data: contracts = [], isLoading } = useContracts();
  const { data: payments = [] } = useAllPayments();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const statusByContract = new Map<string, Set<string>>();
    for (const p of payments) {
      if (!statusByContract.has(p.contractId)) {
        statusByContract.set(p.contractId, new Set());
      }
      statusByContract.get(p.contractId)!.add(p.status);
    }

    const q = query.trim().toLowerCase();
    return contracts.filter((c) => {
      const matchesQuery =
        !q ||
        c.propertyName.toLowerCase().includes(q) ||
        c.tenantName.toLowerCase().includes(q) ||
        c.tenantPhone.toLowerCase().includes(q);
      if (!matchesQuery) return false;

      const statuses = statusByContract.get(c.id) ?? new Set();
      switch (filter) {
        case 'active':
          return c.status === 'active';
        case 'passive':
          return c.status === 'passive';
        case 'overdue':
          return statuses.has('overdue');
        case 'upcoming':
          return statuses.has('pending');
        case 'paid':
          return statuses.has('paid') && !statuses.has('overdue');
        default:
          return true;
      }
    });
  }, [contracts, payments, query, filter]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-[#0B1220]">Sözleşmeler</Text>
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
            className="h-12 flex-1 text-base text-[#0B1220]"
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
