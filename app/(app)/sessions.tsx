import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Laptop, LogOut, Monitor, Smartphone, Trash2 } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import {
  useDeviceSessions,
  useDeviceToken,
  useRevokeDevice,
  useRemoveDevice,
} from '@/features/security/hooks';
import { formatDateTime } from '@/lib/utils/format';
import { palette } from '@/lib/theme/colors';
import type { DeviceSession } from '@/services/repositories/types';

function DeviceIcon({ platform }: { platform: string | null }) {
  if (platform === 'ios' || platform === 'android')
    return <Smartphone size={20} color={palette.primary} />;
  if (platform === 'web') return <Monitor size={20} color={palette.primary} />;
  return <Laptop size={20} color={palette.primary} />;
}

export default function SessionsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data: sessions = [], isLoading } = useDeviceSessions();
  const myToken = useDeviceToken();
  const revoke = useRevokeDevice();
  const remove = useRemoveDevice();
  const [toRevoke, setToRevoke] = useState<DeviceSession | null>(null);

  // Bu cihaz üstte, sonra diğerleri (iptal edilmemişler).
  const active = sessions.filter((s) => !s.revoked || s.deviceToken === myToken);
  const sorted = [...active].sort((a, b) => {
    if (a.deviceToken === myToken) return -1;
    if (b.deviceToken === myToken) return 1;
    return b.lastActive.localeCompare(a.lastActive);
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface"
          >
            <ArrowLeft size={20} color={palette.muted} />
          </Pressable>
          <Text className="text-2xl font-bold text-foreground">Aktif Oturumlar</Text>
        </View>
        <Text className="mt-2 text-sm text-muted">
          Hesabının açık olduğu cihazlar. Tanımadığın bir cihazı kapatabilirsin; o cihaz
          çevrimiçi olduğunda oturumu otomatik sonlanır.
        </Text>

        {isLoading ? (
          <View className="mt-5 gap-3">
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : sorted.length === 0 ? (
          <View className="mt-10">
            <EmptyState icon={Monitor} title="Kayıtlı cihaz yok" />
          </View>
        ) : (
          <View className="mt-5 gap-3">
            {sorted.map((s) => {
              const isCurrent = s.deviceToken === myToken;
              return (
                <Card key={s.id}>
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                      <DeviceIcon platform={s.platform} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                          {s.label}
                        </Text>
                        {isCurrent ? (
                          <View className="rounded-full bg-success-soft px-2 py-0.5">
                            <Text className="text-[10px] font-bold text-success">Bu cihaz</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-xs text-muted">
                        Son aktif: {formatDateTime(s.lastActive)}
                      </Text>
                    </View>
                    {!isCurrent ? (
                      <Pressable
                        onPress={() => setToRevoke(s)}
                        className="flex-row items-center gap-1.5 rounded-full bg-danger-soft px-3 py-2 active:opacity-80"
                      >
                        <LogOut size={14} color={palette.danger} />
                        <Text className="text-xs font-semibold text-danger">Çıkış</Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => remove.mutate(s.id)} hitSlop={8} className="pl-1">
                        <Trash2 size={16} color={palette.muted} />
                      </Pressable>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={toRevoke !== null}
        title="Cihazı kapat"
        message={
          toRevoke
            ? `"${toRevoke.label}" cihazının oturumu kapatılsın mı? Bu cihaz çevrimiçi olduğunda otomatik çıkış yapılır.`
            : ''
        }
        confirmLabel="Kapat"
        destructive
        loading={revoke.isPending}
        onCancel={() => setToRevoke(null)}
        onConfirm={() =>
          toRevoke &&
          revoke.mutate(toRevoke.id, {
            onSuccess: () => {
              setToRevoke(null);
              toast.success('Cihaz oturumu kapatıldı');
            },
            onError: (e) => toast.error(e instanceof Error ? e.message : 'İşlem başarısız'),
          })
        }
      />
    </SafeAreaView>
  );
}
