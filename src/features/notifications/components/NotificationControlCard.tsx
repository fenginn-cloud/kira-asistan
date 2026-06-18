import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { BellRing, Send } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments } from '@/features/payments/hooks';
import { useSettingsStore } from '@/store/settingsStore';
import { palette } from '@/lib/theme/colors';
import {
  NOTIFICATIONS_SUPPORTED,
  getPermissionStatus,
  getScheduledCount,
  requestPermissions,
  scheduleAllReminders,
  sendTestNotification,
  type PermissionStatus,
} from '../notificationService';

export function NotificationControlCard() {
  const toast = useToast();
  const prefs = useSettingsStore((s) => s.notifications);
  const { data: contracts = [] } = useContracts();
  const { data: payments = [] } = useAllPayments();

  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [scheduled, setScheduled] = useState<number>(0);

  const refresh = async () => {
    setStatus(await getPermissionStatus());
    setScheduled(await getScheduledCount());
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleEnable = async () => {
    const granted = await requestPermissions();
    if (granted) {
      const count = await scheduleAllReminders(contracts, payments, prefs);
      toast.success(`Bildirimler açıldı · ${count} hatırlatma planlandı`);
    } else {
      toast.error('Bildirim izni verilmedi');
    }
    refresh();
  };

  const handleTest = async () => {
    await sendTestNotification();
    toast.show('Test bildirimi 2 saniye içinde gelecek', 'info');
  };

  if (!NOTIFICATIONS_SUPPORTED) {
    return (
      <Card>
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
            <BellRing size={20} color={palette.primary} />
          </View>
          <Text className="flex-1 text-sm text-muted">
            Bildirimler yalnızca cihazda (iOS/Android) çalışır. Telefonda Expo Go ile
            test edebilirsiniz.
          </Text>
        </View>
      </Card>
    );
  }

  const granted = status === 'granted';

  return (
    <Card>
      <View className="flex-row items-center gap-3">
        <View
          className={`h-11 w-11 items-center justify-center rounded-2xl ${
            granted ? 'bg-success-soft' : 'bg-warning-soft'
          }`}
        >
          <BellRing size={20} color={granted ? palette.success : palette.warning} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-[#0B1220]">
            {granted ? 'Bildirimler açık' : 'Bildirimler kapalı'}
          </Text>
          <Text className="text-sm text-muted">
            {granted
              ? `${scheduled} hatırlatma planlandı`
              : 'Kira günlerini kaçırmamak için izin verin'}
          </Text>
        </View>
      </View>

      <View className="mt-3 gap-2 border-t border-border/60 pt-3">
        {!granted ? (
          <Button label="Bildirimlere İzin Ver" icon={BellRing} onPress={handleEnable} />
        ) : null}
        <Pressable
          onPress={handleTest}
          className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary-50 py-3 active:opacity-80"
        >
          <Send size={16} color={palette.primary} />
          <Text className="text-sm font-semibold text-primary-700">
            Test Bildirimi Gönder
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}
