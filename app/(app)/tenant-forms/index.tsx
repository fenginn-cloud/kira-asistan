import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ArrowLeft, ClipboardList, Phone, Plus } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { fgColor } from '@/lib/theme/useThemeColors';
import { useTenantForms } from '@/features/tenant-forms/hooks';
import {
  RESULT_COLORS,
  RESULT_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
} from '@/features/tenant-forms/config';
import { palette } from '@/lib/theme/colors';
import type { TenantForm, TenantFormStatus } from '@/types';

type Filter = 'all' | 'pending' | 'completed' | 'reviewed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'pending', label: 'Bekleyen' },
  { key: 'completed', label: 'Tamamlanan' },
  { key: 'reviewed', label: 'Değerlendirilen' },
];

function matches(form: TenantForm, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'pending') return form.status === 'pending' || form.status === 'expired';
  return form.status === filter;
}

export default function TenantFormsScreen() {
  const router = useRouter();
  const { data: forms = [], isLoading } = useTenantForms();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => forms.filter((f) => matches(f, filter)), [forms, filter]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={fgColor()} />
        </Pressable>
        <Text className="flex-1 text-2xl font-bold text-foreground">Kiracı Formları</Text>
        <Pressable
          onPress={() => router.push('/(app)/tenant-forms/new')}
          className="h-10 w-10 items-center justify-center rounded-2xl bg-primary active:opacity-80"
        >
          <Plus size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Filters */}
      <View className="mt-4 flex-row flex-wrap gap-2 px-5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`rounded-full px-4 py-2 ${active ? 'bg-primary' : 'bg-surface border border-border'}`}
            >
              <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted'}`}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View className="gap-3 px-5 pt-4">
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            icon={ClipboardList}
            title="Henüz form yok"
            description="Kiracı veya kiracı adayına doldurması için güvenli bir bilgi formu gönderin."
          />
          <View className="mt-4 w-full max-w-xs">
            <Button
              label="Yeni Form Gönder"
              icon={Plus}
              onPress={() => router.push('/(app)/tenant-forms/new')}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(f) => f.id}
          contentContainerClassName="px-5 pb-10 pt-4 gap-3"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <FormCard form={item} onPress={() => router.push(`/(app)/tenant-forms/${item.id}`)} />}
        />
      )}
    </SafeAreaView>
  );
}

function FormCard({ form, onPress }: { form: TenantForm; onPress: () => void }) {
  const status = form.status as TenantFormStatus;
  const c = STATUS_COLORS[status];
  const created = form.createdAt ? format(new Date(form.createdAt), 'd MMM yyyy', { locale: tr }) : '';
  const result = form.reviewResult && form.reviewResult !== 'unrated' ? form.reviewResult : null;
  return (
    <Card onPress={onPress}>
      {/* Değerlendirme sonucu — kartın üstünde belirgin rozet */}
      {result ? (
        <View className={`mb-2 self-start rounded-full px-3 py-1 ${RESULT_COLORS[result].bg}`}>
          <Text className={`text-xs font-bold ${RESULT_COLORS[result].text}`}>
            {RESULT_LABELS[result]}
          </Text>
        </View>
      ) : null}
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">
            {form.tenantName || 'İsimsiz kiracı'}
          </Text>
          {form.tenantPhone ? (
            <View className="mt-1 flex-row items-center gap-1.5">
              <Phone size={13} color={palette.muted} />
              <Text className="text-sm text-muted">{form.tenantPhone}</Text>
            </View>
          ) : null}
          {form.propertyName ? (
            <Text className="mt-1 text-sm text-muted" numberOfLines={1}>
              {form.propertyName}
            </Text>
          ) : null}
        </View>
        <View className={`rounded-full px-3 py-1 ${c.bg}`}>
          <Text className={`text-xs font-semibold ${c.text}`}>{STATUS_LABELS[status]}</Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-center justify-between border-t border-border/50 pt-2.5">
        <Text className="text-xs text-muted">Oluşturuldu: {created}</Text>
        <Text className="text-xs font-semibold text-primary-700">Detay →</Text>
      </View>
    </Card>
  );
}
