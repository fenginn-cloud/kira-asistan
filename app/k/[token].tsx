import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useLocalSearchParams, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Building2, CheckCircle2, Camera, X, ShieldCheck } from 'lucide-react-native';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Button } from '@/components/ui/Button';
import {
  fetchPortal,
  submitClaim,
  type PortalView,
} from '@/services/tenantPortal';
import { palette } from '@/lib/theme/colors';

export default function TenantPortalScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [view, setView] = useState<PortalView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // claim form
  const [formOpen, setFormOpen] = useState(false);
  const [period, setPeriod] = useState('');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<{ base64: string; name: string; mime: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchPortal(token)
      .then((v) => {
        setView(v);
        setPeriod(v.current_month.period_month);
        setAmount(v.current_month.remaining);
      })
      .catch((e) => setError(e?.message ?? 'Bağlantı açılamadı.'))
      .finally(() => setLoading(false));
  }, [token]);

  const pickReceipt = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    });
    const a = res.assets?.[0];
    if (!res.canceled && a?.base64) {
      setReceipt({
        base64: a.base64,
        name: a.fileName ?? `dekont_${Date.now()}.jpg`,
        mime: a.mimeType ?? 'image/jpeg',
      });
    }
  };

  const submit = async () => {
    if (!token || amount <= 0) {
      setError('Geçerli bir tutar girin.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitClaim({
        token,
        periodMonth: period,
        amount,
        note: note.trim() || undefined,
        receiptBase64: receipt?.base64,
        receiptName: receipt?.name,
        receiptMime: receipt?.mime,
      });
      setDone(true);
      setFormOpen(false);
    } catch (e: any) {
      setError(e?.message ?? 'Gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (error && !view) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background p-6">
        <X size={40} color={palette.danger} />
        <Text className="mt-3 text-center text-base font-semibold text-foreground">
          {error}
        </Text>
        <Text className="mt-1 text-center text-sm text-muted">
          Bağlantı geçersiz veya süresi dolmuş olabilir.
        </Text>
      </SafeAreaView>
    );
  }

  if (!view) return null;

  const owes = view.total_balance < 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="px-5 pb-12" showsVerticalScrollIndicator={false}>
        {/* Brand header + güven rozeti */}
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary">
              <Building2 size={20} color="#FFFFFF" />
            </View>
            <View>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-base font-bold text-foreground">Kira Asistan</Text>
                <View className="rounded-full bg-primary-50 px-1.5 py-0.5">
                  <Text className="text-[9px] font-bold tracking-wide text-primary-700">PORTAL</Text>
                </View>
              </View>
              <Text className="text-[11px] text-muted">Güvenli Kiracı Ödeme Ekranı</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1 rounded-full bg-success-soft px-2.5 py-1">
            <ShieldCheck size={12} color={palette.success} />
            <Text className="text-[10px] font-bold text-success">Güvenli</Text>
          </View>
        </View>

        {/* Doğrulanmış kiracı kartı */}
        <View className="mt-4 rounded-3xl border border-border/60 bg-surface p-4 shadow-sm shadow-black/5">
          <Text className="text-[11px] font-bold uppercase tracking-wide text-primary-700">
            Doğrulanmış Kiracı
          </Text>
          <Text className="mt-1 text-xl font-bold text-foreground">Sn. {view.tenant_name}</Text>
          <View className="mt-1 flex-row items-center gap-1.5">
            <Building2 size={13} color={palette.muted} />
            <Text className="flex-1 text-sm text-muted" numberOfLines={1}>
              {[view.property_name, view.location].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View className="mt-3 flex-row items-center justify-between border-t border-border/50 pt-3">
            <Text className="text-xs text-muted">Yönetici / Mülk Sahibi</Text>
            <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
              {view.company_name}
            </Text>
          </View>
        </View>

        {/* Cobalt bakiye hero — ödenmesi gereken tutar */}
        <View
          className="mt-4 rounded-[26px] bg-primary p-5"
          style={{
            shadowColor: '#2563EB',
            shadowOpacity: 0.28,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1">
              <View
                style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: owes ? '#FBBF24' : '#4ADE80' }}
              />
              <Text className="text-xs font-bold text-white">{view.current_month.label} Kirası</Text>
            </View>
            <Text className="text-xs font-semibold text-white/80">
              {owes ? 'Ödeme bekleniyor' : 'Güncel'}
            </Text>
          </View>

          <Text className="mt-3 text-xs font-semibold uppercase tracking-wide text-white/60">
            Ödenmesi Gereken Tutar
          </Text>
          <Text className="mt-0.5 text-4xl font-extrabold text-white" numberOfLines={1}>
            {view.current_month.remaining > 0
              ? view.current_month.remaining_text
              : view.current_month.due_text}
          </Text>

          <View className="mt-4 flex-row items-center justify-between border-t border-white/15 pt-3">
            <View>
              <Text className="text-[11px] text-white/60">Bu ay ödenen</Text>
              <Text className="text-sm font-bold text-white">{view.current_month.paid_text}</Text>
            </View>
            <View className="items-end">
              <Text className="text-[11px] text-white/60">Toplam kira</Text>
              <Text className="text-sm font-bold text-white">{view.current_month.due_text}</Text>
            </View>
          </View>
        </View>

        {done ? (
          <View className="mt-5 flex-row items-center gap-3 rounded-2xl bg-success-soft p-4">
            <CheckCircle2 size={22} color={palette.success} />
            <Text className="flex-1 text-sm font-medium text-foreground">
              Ödeme bildiriminiz alındı. Mülk sahibi onayladığında hesabınıza işlenecek.
            </Text>
          </View>
        ) : !formOpen ? (
          <View className="mt-5">
            <Button label="Ödeme Bildir" onPress={() => setFormOpen(true)} />
          </View>
        ) : (
          <View className="mt-5 gap-3 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-base font-bold text-foreground">Ödeme Bildir</Text>

            {/* Month chips */}
            <Text className="text-sm font-medium text-muted">Hangi Ay</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {view.rows.map((r) => {
                const active = r.period_month === period;
                return (
                  <Pressable
                    key={r.period_month}
                    onPress={() => {
                      setPeriod(r.period_month);
                      setAmount(r.remaining);
                    }}
                    className={`rounded-2xl px-4 py-2.5 ${active ? 'bg-primary' : 'bg-background'}`}
                  >
                    <Text className={`text-sm font-semibold capitalize ${active ? 'text-white' : 'text-muted'}`}>
                      {r.label}
                    </Text>
                    <Text className={`text-xs ${active ? 'text-white/80' : 'text-muted'}`}>
                      {r.remaining > 0 ? `Kalan ${r.remaining_text}` : 'Ödendi'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <MoneyInput label="Ödediğiniz Tutar" value={amount} onChangeNumber={setAmount} />

            <View className="gap-1.5">
              <Text className="text-sm font-medium text-muted">Not (opsiyonel)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Havale/EFT açıklaması vb."
                placeholderTextColor={palette.muted}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground"
              />
            </View>

            {/* Receipt */}
            {receipt ? (
              <View className="flex-row items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
                <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
                  {receipt.name}
                </Text>
                <Pressable onPress={() => setReceipt(null)} hitSlop={8}>
                  <X size={18} color={palette.danger} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickReceipt}
                className="flex-row items-center justify-center gap-2 rounded-2xl bg-background py-3 active:opacity-80"
              >
                <Camera size={16} color={palette.primary} />
                <Text className="text-sm font-semibold text-primary-700">Dekont Ekle (opsiyonel)</Text>
              </Pressable>
            )}

            {error ? <Text className="text-xs text-danger">{error}</Text> : null}

            <Button label="Bildirimi Gönder" onPress={submit} loading={submitting} />
            <Pressable onPress={() => setFormOpen(false)} className="items-center py-1">
              <Text className="text-sm text-muted">Vazgeç</Text>
            </Pressable>
          </View>
        )}

        {/* Months ledger */}
        <Text className="mt-6 mb-2 text-base font-bold text-foreground">Aylık Durum</Text>
        <View className="gap-2">
          {view.rows.map((r) => (
            <View
              key={r.period_month}
              className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
            >
              <View>
                <Text className="text-sm font-semibold capitalize text-foreground">{r.label}</Text>
                <Text className="text-xs text-muted">{r.status}</Text>
              </View>
              <View className="items-end">
                <Text className="text-sm font-semibold text-foreground">{r.paid} / {r.due}</Text>
                {r.remaining > 0 ? (
                  <Text className="text-xs text-danger">Kalan {r.remaining_text}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {/* Trust footer */}
        <View className="mt-6 flex-row items-start gap-2">
          <ShieldCheck size={14} color={palette.muted} />
          <Text className="flex-1 text-[11px] leading-4 text-muted">
            Bu sayfa size özeldir. Bildirdiğiniz ödeme, mülk sahibi onayladıktan sonra
            hesabınıza işlenir. Sorularınız için mülk sahibinizle iletişime geçin.
          </Text>
        </View>
        <Link href={'/yasal/gizlilik' as Href} asChild>
          <Pressable className="mt-2">
            <Text className="text-[11px] text-primary-700">Gizlilik Politikası</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
