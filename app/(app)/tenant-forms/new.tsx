import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  MessageCircle,
} from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Button } from '@/components/ui/Button';
import { ActionSheet, type ActionSheetItem } from '@/components/ui/ActionSheet';
import { useToast } from '@/components/ui/Toast';
import { useContracts } from '@/features/contracts/hooks';
import { useCreateTenantForm } from '@/features/tenant-forms/hooks';
import { publicFormLinkFor } from '@/services/tenantForms';
import { copyText, openWhatsApp } from '@/lib/utils/contact';
import { errorMessage } from '@/lib/utils/error';
import { fgColor } from '@/lib/theme/useThemeColors';
import { palette } from '@/lib/theme/colors';
import type { TenantForm } from '@/types';

const VALIDITY: { label: string; days: number | null }[] = [
  { label: '3 gün', days: 3 },
  { label: '7 gün', days: 7 },
  { label: '14 gün', days: 14 },
  { label: '30 gün', days: 30 },
  { label: 'Süresiz', days: null },
];

export default function NewTenantFormScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data: contracts = [] } = useContracts();
  const create = useCreateTenantForm();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contractId, setContractId] = useState<string | null>(null);
  const [validityIdx, setValidityIdx] = useState(1); // 7 gün
  const [contractPickerOpen, setContractPickerOpen] = useState(false);

  const [created, setCreated] = useState<TenantForm | null>(null);

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === contractId) ?? null,
    [contracts, contractId]
  );

  const contractItems: ActionSheetItem[] = useMemo(
    () => [
      { label: 'Sözleşme seçilmedi', onPress: () => setContractId(null) },
      ...contracts.map((c) => ({
        label: [c.propertyName, c.block, c.unit].filter(Boolean).join(' ') + ` — ${c.tenantName}`,
        onPress: () => {
          setContractId(c.id);
          if (!name) setName(c.tenantName);
          if (!phone) setPhone(c.tenantPhone);
        },
      })),
    ],
    [contracts, name, phone]
  );

  const onCreate = () => {
    const v = VALIDITY[validityIdx]!;
    const expiresAt = v.days
      ? new Date(Date.now() + v.days * 24 * 60 * 60 * 1000).toISOString()
      : null;
    create.mutate(
      {
        tenantName: name.trim() || undefined,
        tenantPhone: phone.trim() || undefined,
        tenantEmail: email.trim() || undefined,
        contractId,
        expiresAt,
      },
      {
        onSuccess: (form) => setCreated(form),
        onError: (e) => toast.error(errorMessage(e, 'Form oluşturulamadı')),
      }
    );
  };

  // ---- Share view (after creation) --------------------------------------
  if (created) {
    const link = publicFormLinkFor(created.token);
    const shareOnWhatsApp = () => {
      const msg = `Merhaba${name ? ' ' + name : ''}, kiralama işlemleriniz kapsamında aşağıdaki Kiracı Bilgi Formunu doldurmanızı rica ederiz.\n\n${link}`;
      void openWhatsApp(phone || '', msg);
    };
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="items-center pt-8">
            <CheckCircle2 size={56} color={palette.success} />
            <Text className="mt-4 text-xl font-bold text-foreground">Form hazır</Text>
            <Text className="mt-1 text-center text-sm text-muted">
              Aşağıdaki güvenli linki kiracınıza gönderin. Kiracı hesap oluşturmadan doldurur.
            </Text>
          </View>

          <View className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-xs text-muted" numberOfLines={2}>
              {link}
            </Text>
          </View>

          <View className="mt-3 flex-row gap-2">
            <Pressable
              onPress={async () => {
                await copyText(link);
                toast.success('Link kopyalandı');
              }}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary-50 py-3.5 active:opacity-80"
            >
              <Copy size={16} color={palette.primary} />
              <Text className="text-sm font-semibold text-primary-700">Kopyala</Text>
            </Pressable>
            <Pressable
              onPress={shareOnWhatsApp}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-success-soft py-3.5 active:opacity-80"
            >
              <MessageCircle size={16} color={palette.success} />
              <Text className="text-sm font-semibold text-success">{"WhatsApp'ta Gönder"}</Text>
            </Pressable>
          </View>

          <View className="mt-6 gap-2">
            <Button label="Formu Görüntüle" variant="secondary" onPress={() => router.replace(`/(app)/tenant-forms/${created.id}`)} />
            <Button label="Kiracı Formlarına Dön" variant="ghost" onPress={() => router.replace('/(app)/tenant-forms')} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Create form ------------------------------------------------------
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-3 px-5 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={fgColor()} />
        </Pressable>
        <Text className="flex-1 text-2xl font-bold text-foreground">Yeni Form Gönder</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-10 pt-4 gap-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text className="text-sm text-muted">
          Aşağıdaki alanların tümü opsiyoneldir. Sözleşme seçmek zorunlu değildir — formu kiracı
          adayına da gönderebilirsiniz.
        </Text>

        <Input label="Kiracı Ad Soyad" value={name} onChangeText={setName} placeholder="Opsiyonel" />
        <PhoneInput label="Telefon" value={phone} onChange={setPhone} />
        <Input
          label="E-posta"
          value={email}
          onChangeText={setEmail}
          placeholder="Opsiyonel"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Contract picker */}
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-muted">İlgili Sözleşme (opsiyonel)</Text>
          <Pressable
            onPress={() => setContractPickerOpen(true)}
            className="h-14 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 active:opacity-80"
          >
            <Text className={`text-base ${selectedContract ? 'text-foreground' : 'text-muted'}`} numberOfLines={1}>
              {selectedContract
                ? [selectedContract.propertyName, selectedContract.block, selectedContract.unit].filter(Boolean).join(' ')
                : 'Sözleşme seçilmedi'}
            </Text>
            <ChevronDown size={18} color={palette.muted} />
          </Pressable>
        </View>

        {/* Validity */}
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-muted">Form Geçerlilik Süresi</Text>
          <View className="flex-row flex-wrap gap-2">
            {VALIDITY.map((v, i) => {
              const active = validityIdx === i;
              return (
                <Pressable
                  key={v.label}
                  onPress={() => setValidityIdx(i)}
                  className={`flex-row items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 ${
                    active ? 'border-primary bg-primary-50' : 'border-border bg-surface'
                  }`}
                >
                  {active ? <Check size={14} color={palette.primary} /> : null}
                  <Text className={`text-sm font-medium ${active ? 'text-primary-700' : 'text-muted'}`}>
                    {v.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mt-2">
          <Button label="Form Oluştur ve Link Al" onPress={onCreate} loading={create.isPending} />
        </View>
      </ScrollView>

      <ActionSheet
        visible={contractPickerOpen}
        onClose={() => setContractPickerOpen(false)}
        title="Sözleşme Seç"
        items={contractItems}
      />
    </SafeAreaView>
  );
}
