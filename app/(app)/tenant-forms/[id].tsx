import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ArrowLeft,
  Car,
  Copy,
  FileText,
  Link2,
  MessageCircle,
  Trash2,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { ReviewEditor } from '@/features/tenant-forms/components/ReviewEditor';
import {
  useDeleteTenantForm,
  useLinkTenantForm,
  useTenantForm,
} from '@/features/tenant-forms/hooks';
import { useContract, useContracts } from '@/features/contracts/hooks';
import {
  FORM_STEPS,
  DOC_TYPE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
} from '@/features/tenant-forms/config';
import { documentUrl, publicFormLinkFor } from '@/services/tenantForms';
import { copyText, openWhatsApp } from '@/lib/utils/contact';
import { formatCurrency } from '@/lib/utils/format';
import { errorMessage } from '@/lib/utils/error';
import { ActionSheet, type ActionSheetItem } from '@/components/ui/ActionSheet';
import { fgColor } from '@/lib/theme/useThemeColors';
import { palette } from '@/lib/theme/colors';
import type { FieldDef } from '@/features/tenant-forms/config';
import type { TenantFormStatus, TenantFormVehicle } from '@/types';

function displayValue(field: FieldDef, raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return '—';
  if (field.type === 'bool') return raw === true ? 'Evet' : 'Hayır';
  if (field.type === 'money') return formatCurrency(Number(raw) || 0);
  if (field.type === 'date') {
    try {
      return format(new Date(String(raw)), 'd MMMM yyyy', { locale: tr });
    } catch {
      return String(raw);
    }
  }
  return String(raw);
}

export default function TenantFormDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: form, isLoading } = useTenantForm(id);
  const { data: contracts = [] } = useContracts();
  const { data: linkedContract } = useContract(form?.contractId ?? '');
  const del = useDeleteTenantForm();
  const linkMut = useLinkTenantForm();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [contractPickerOpen, setContractPickerOpen] = useState(false);

  const submitted = !!form?.submittedAt;

  const incomeRatio = useMemo(() => {
    const rent = linkedContract ? linkedContract.rentAmount + linkedContract.duesAmount : 0;
    const income = Number((form?.responses.employment as any)?.netIncome ?? 0);
    if (!rent || !income) return null;
    return income / rent;
  }, [linkedContract, form]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="gap-3 px-5 pt-6">
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }
  if (!form) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-base text-muted">Form bulunamadı.</Text>
      </SafeAreaView>
    );
  }

  const status = form.status as TenantFormStatus;
  const sc = STATUS_COLORS[status];
  const link = publicFormLinkFor(form.token);
  const vehicles = (form.responses.vehicles as TenantFormVehicle[] | undefined) ?? [];

  const shareOnWhatsApp = () => {
    const msg = `Merhaba${form.tenantName ? ' ' + form.tenantName : ''}, kiralama işlemleriniz kapsamında aşağıdaki Kiracı Bilgi Formunu doldurmanızı rica ederiz.\n\n${link}`;
    void openWhatsApp(form.tenantPhone ?? '', msg);
  };

  const contractItems: ActionSheetItem[] = [
    { label: 'Bağlantıyı kaldır', onPress: () => doLink(null) },
    ...contracts.map((c) => ({
      label: [c.propertyName, c.block, c.unit].filter(Boolean).join(' ') + ` — ${c.tenantName}`,
      onPress: () => doLink(c.id),
    })),
  ];
  function doLink(contractId: string | null) {
    linkMut.mutate(
      { id: form!.id, contractId },
      {
        onSuccess: () => toast.success(contractId ? 'Sözleşmeye bağlandı' : 'Bağlantı kaldırıldı'),
        onError: (e) => toast.error(errorMessage(e, 'İşlem başarısız')),
      }
    );
  }

  const openDoc = async (path: string) => {
    const url = await documentUrl(path);
    if (url) Linking.openURL(url);
    else toast.error('Belge açılamadı');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={fgColor()} />
        </Pressable>
        <Text className="flex-1 text-xl font-bold text-foreground" numberOfLines={1}>
          {form.tenantName || 'Kiracı Formu'}
        </Text>
        <Pressable onPress={() => setConfirmDelete(true)} hitSlop={8}>
          <Trash2 size={20} color={palette.danger} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-12 pt-4" showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View className="flex-row items-center gap-2">
          <View className={`rounded-full px-3 py-1 ${sc.bg}`}>
            <Text className={`text-xs font-semibold ${sc.text}`}>{STATUS_LABELS[status]}</Text>
          </View>
          {form.submittedAt ? (
            <Text className="text-xs text-muted">
              {format(new Date(form.submittedAt), 'd MMM yyyy HH:mm', { locale: tr })} tarihinde gönderildi
            </Text>
          ) : null}
        </View>

        {/* Share link (always available) */}
        <SectionHeader title="Form Linki" />
        <Card>
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
              <Link2 size={20} color={palette.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-muted" numberOfLines={1}>
                {link}
              </Text>
            </View>
          </View>
          <View className="mt-3 flex-row gap-2 border-t border-border/60 pt-3">
            <Pressable
              onPress={async () => {
                await copyText(link);
                toast.success('Link kopyalandı');
              }}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary-50 py-2.5 active:opacity-80"
            >
              <Copy size={16} color={palette.primary} />
              <Text className="text-xs font-semibold text-primary-700">Kopyala</Text>
            </Pressable>
            <Pressable
              onPress={shareOnWhatsApp}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-success-soft py-2.5 active:opacity-80"
            >
              <MessageCircle size={16} color={palette.success} />
              <Text className="text-xs font-semibold text-success">WhatsApp</Text>
            </Pressable>
          </View>
        </Card>

        {/* Linked contract */}
        <SectionHeader title="Sözleşme Bağlantısı" />
        <Card onPress={() => setContractPickerOpen(true)}>
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-base text-foreground" numberOfLines={1}>
              {linkedContract
                ? [linkedContract.propertyName, linkedContract.block, linkedContract.unit].filter(Boolean).join(' ')
                : 'Sözleşmeye bağlı değil'}
            </Text>
            <Text className="text-sm font-semibold text-primary-700">
              {linkedContract ? 'Değiştir' : 'Bağla'}
            </Text>
          </View>
        </Card>

        {!submitted ? (
          <View className="mt-6 rounded-2xl border border-warning/30 bg-warning-soft p-4">
            <Text className="text-sm font-medium text-foreground">
              Form henüz doldurulmadı.
            </Text>
            <Text className="mt-1 text-xs text-muted">
              Kiracı linki açıp gönderdiğinde yanıtlar burada görünecek.
            </Text>
          </View>
        ) : (
          <>
            {/* Responses */}
            {FORM_STEPS.map((step) => {
              const group = (form.responses[step.key] as Record<string, unknown>) ?? {};
              const visibleFields = step.fields.filter(
                (f) => !(step.key === 'vehicle' && f.key === 'hasVehicle')
              );
              const hasAny = visibleFields.some((f) => {
                const v = group[f.key];
                return v !== undefined && v !== null && v !== '';
              });
              if (step.key === 'vehicle') {
                return (
                  <View key={step.key}>
                    <SectionHeader title="Araçlar" />
                    {vehicles.length === 0 ? (
                      <Card>
                        <Text className="text-sm text-muted">Araç belirtilmedi.</Text>
                      </Card>
                    ) : (
                      <View className="gap-2">
                        {vehicles.map((v, i) => (
                          <Card key={i}>
                            <View className="flex-row items-center gap-3">
                              <Car size={18} color={palette.primary} />
                              <View>
                                <Text className="text-base font-semibold text-foreground">{v.plate || '—'}</Text>
                                {v.brandModel ? (
                                  <Text className="text-sm text-muted">{v.brandModel}</Text>
                                ) : null}
                              </View>
                            </View>
                          </Card>
                        ))}
                      </View>
                    )}
                  </View>
                );
              }
              return (
                <View key={step.key}>
                  <SectionHeader title={step.title} />
                  <Card>
                    {!hasAny ? (
                      <Text className="text-sm text-muted">Bilgi girilmedi.</Text>
                    ) : (
                      visibleFields.map((f, idx) => (
                        <View
                          key={f.key}
                          className={`flex-row justify-between gap-3 py-2.5 ${idx > 0 ? 'border-t border-border/50' : ''}`}
                        >
                          <Text className="flex-1 text-sm text-muted">{f.label}</Text>
                          <Text className="flex-[1.2] text-right text-sm font-medium text-foreground">
                            {displayValue(f, group[f.key])}
                          </Text>
                        </View>
                      ))
                    )}
                  </Card>
                </View>
              );
            })}

            {/* Documents */}
            <SectionHeader title="Belgeler" />
            {form.documents && form.documents.length > 0 ? (
              <View className="gap-2">
                {form.documents.map((d) => (
                  <Card key={d.id} onPress={() => openDoc(d.storagePath)}>
                    <View className="flex-row items-center gap-3">
                      <FileText size={18} color={palette.primary} />
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                          {d.fileName || 'Belge'}
                        </Text>
                        <Text className="text-xs text-muted">
                          {DOC_TYPE_LABELS[d.documentType ?? 'other'] ?? 'Belge'}
                        </Text>
                      </View>
                      <Text className="text-xs font-semibold text-primary-700">Aç</Text>
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              <Card>
                <Text className="text-sm text-muted">Belge yüklenmedi.</Text>
              </Card>
            )}

            {/* Declaration */}
            <SectionHeader title="Beyan ve Onay" />
            <Card>
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-muted">Beyan onayı</Text>
                <Text className="text-sm font-medium text-foreground">
                  {(form.responses.declaration as any)?.accepted ? 'Onaylandı' : '—'}
                </Text>
              </View>
              <View className="flex-row justify-between border-t border-border/50 py-1.5">
                <Text className="text-sm text-muted">Beyan eden</Text>
                <Text className="text-sm font-medium text-foreground">
                  {(form.responses.declaration as any)?.declarantName || '—'}
                </Text>
              </View>
              <View className="flex-row justify-between border-t border-border/50 py-1.5">
                <Text className="text-sm text-muted">Tarih</Text>
                <Text className="text-sm font-medium text-foreground">
                  {(form.responses.declaration as any)?.date
                    ? format(new Date((form.responses.declaration as any).date), 'd MMM yyyy HH:mm', { locale: tr })
                    : '—'}
                </Text>
              </View>
            </Card>

            {/* Consultant review (never public) */}
            <SectionHeader title="Danışman Değerlendirmesi" />
            <ReviewEditor form={form} incomeRatio={incomeRatio} />
          </>
        )}
      </ScrollView>

      <ConfirmModal
        visible={confirmDelete}
        title="Formu sil"
        message="Bu form ve tüm yanıtları kalıcı olarak silinecek. Emin misiniz?"
        confirmLabel="Sil"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          del.mutate(form.id, {
            onSuccess: () => {
              toast.success('Form silindi');
              router.replace('/(app)/tenant-forms');
            },
            onError: (e) => toast.error(errorMessage(e, 'Silinemedi')),
          });
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <ActionSheet
        visible={contractPickerOpen}
        onClose={() => setContractPickerOpen(false)}
        title="Sözleşme Seç"
        items={contractItems}
      />
    </SafeAreaView>
  );
}
