import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BellOff, BellRing, Send } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useContracts } from '@/features/contracts/hooks';
import { useAllPayments } from '@/features/payments/hooks';
import { useSettingsStore } from '@/store/settingsStore';
import { palette } from '@/lib/theme/colors';
import { computeTodayReminders } from '../reminders';
import {
  getPermission,
  notificationsSupported,
  requestPermission,
  sendTest,
  showDueReminders,
  type NotifPermission,
} from '../device';

export function NotificationControlCard() {
  const toast = useToast();
  const prefs = useSettingsStore((s) => s.notifications);
  const { data: contracts = [] } = useContracts();
  const { data: payments = [] } = useAllPayments();

  const [status, setStatus] = useState<NotifPermission>('default');

  const todayReminders = useMemo(
    () => computeTodayReminders({ contracts, payments, prefs }),
    [contracts, payments, prefs]
  );

  useEffect(() => {
    getPermission().then(setStatus);
  }, []);

  const handleEnable = async () => {
    const result = await requestPermission();
    setStatus(result);
    if (result === 'granted') {
      const count = await showDueReminders(todayReminders);
      toast.success(
        count > 0
          ? `Bildirimler açıldı · ${count} hatırlatma gönderildi`
          : 'Bildirimler açıldı'
      );
    } else if (result === 'denied') {
      toast.error('Bildirim izni reddedildi');
    }
  };

  const handleTest = async () => {
    await sendTest();
    toast.show('Test bildirimi gönderildi', 'info');
  };

  // Device / browser does not support notifications (e.g. iOS Safari tab).
  if (!notificationsSupported() || status === 'unsupported') {
    return (
      <Card>
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-warning-soft">
            <BellOff size={20} color={palette.warning} />
          </View>
          <Text className="flex-1 text-sm text-muted">
            Bu tarayıcı bildirim desteklemiyor. iPhone'da bildirim için uygulamayı
            önce <Text className="font-semibold text-[#0B1220]">"Ana Ekrana Ekle"</Text> ile
            kurun, sonra açın.
          </Text>
        </View>
      </Card>
    );
  }

  const granted = status === 'granted';
  const denied = status === 'denied';

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
              ? 'Kira günleri için otomatik hatırlatma alıyorsunuz.'
              : denied
                ? 'İzin reddedildi. Tarayıcı/ayarlardan izni açın.'
                : 'Kira günlerini kaçırmamak için bildirimleri açın.'}
          </Text>
        </View>
      </View>

      <View className="mt-3 gap-2 border-t border-border/60 pt-3">
        {!granted ? (
          <Button label="Bildirimleri Aktifleştir" icon={BellRing} onPress={handleEnable} />
        ) : null}
        <Pressable
          onPress={handleTest}
          disabled={!granted}
          className={`flex-row items-center justify-center gap-2 rounded-2xl bg-primary-50 py-3 active:opacity-80 ${
            granted ? '' : 'opacity-50'
          }`}
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
