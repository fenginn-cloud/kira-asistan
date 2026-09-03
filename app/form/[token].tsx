import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useLocalSearchParams, type Href } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FieldInput } from '@/features/tenant-forms/components/FieldInput';
import { FORM_STEPS } from '@/features/tenant-forms/config';
import {
  fetchPublicForm,
  submitPublicForm,
  type PublicFormView,
  type SubmitDocument,
} from '@/services/tenantForms';
import type { TenantFormResponses, TenantFormVehicle } from '@/types';
import { palette } from '@/lib/theme/colors';

const TOTAL_STEPS = FORM_STEPS.length + 1; // + beyan/onay adımı

const isEmpty = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

export default function PublicTenantFormScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [view, setView] = useState<PublicFormView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, Record<string, unknown>>>({});
  const [vehicles, setVehicles] = useState<TenantFormVehicle[]>([]);
  const [docs, setDocs] = useState<SubmitDocument[]>([]);

  // Beyan/onay
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Doğrulama: eksik alanların anahtarları + sallama animasyonu
  const [errors, setErrors] = useState<string[]>([]);
  const shakeX = useRef(new Animated.Value(0)).current;
  const runShake = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 12, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -12, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (!token) return;
    fetchPublicForm(token)
      .then((v) => {
        setView(v);
        // Ön-dolgu
        setValues((prev) => ({
          ...prev,
          personal: {
            fullName: v.prefill.tenant_name,
            phone: v.prefill.tenant_phone,
            email: v.prefill.tenant_email,
            ...(prev.personal ?? {}),
          },
          rentalRequest: {
            property: v.property?.name ?? '',
            paymentDayPref: v.property?.payment_day || '',
            ...(prev.rentalRequest ?? {}),
          },
        }));
      })
      .catch((e) => setError(e?.message ?? 'Bağlantı açılamadı.'))
      .finally(() => setLoading(false));
  }, [token]);

  const setField = (group: string, key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [group]: { ...(prev[group] ?? {}), [key]: value } }));
    // Kullanıcı düzeltince o alanın kırmızı işaretini kaldır.
    setErrors((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : prev));
  };

  const pickDoc = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    const a = res.assets?.[0];
    if (res.canceled || !a) return;
    try {
      const base64 = await new File(a.uri).base64();
      setDocs((prev) => [
        ...prev,
        {
          base64,
          name: a.name ?? `belge_${Date.now()}`,
          mime: a.mimeType ?? 'application/octet-stream',
          document_type: 'other',
        },
      ]);
    } catch {
      setError('Belge okunamadı.');
    }
  };

  const submit = async () => {
    if (!token) return;
    if (!accepted) {
      setError('Devam etmek için beyanı onaylayın.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const declName =
      (view?.prefill.tenant_name ?? '').trim() ||
      String((values.personal as Record<string, unknown> | undefined)?.fullName ?? '').trim();
    const responses: TenantFormResponses = {
      ...values,
      vehicles,
      hasVehicle: Boolean(values.vehicle?.hasVehicle),
      declaration: {
        accepted: true,
        declarantName: declName,
        date: new Date().toISOString(),
      },
    };
    try {
      await submitPublicForm({ token, responses, documents: docs });
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? 'Gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = useMemo(() => (step + 1) / TOTAL_STEPS, [step]);

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
        <Text className="mt-3 text-center text-base font-semibold text-foreground">{error}</Text>
        <Text className="mt-1 text-center text-sm text-muted">
          Bağlantı geçersiz veya süresi dolmuş olabilir.
        </Text>
      </SafeAreaView>
    );
  }
  if (!view) return null;

  if (done || view.status === 'submitted') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background p-6">
        <CheckCircle2 size={56} color={palette.success} />
        <Text className="mt-4 text-center text-xl font-bold text-foreground">
          Bilgileriniz başarıyla iletildi.
        </Text>
        <Text className="mt-2 text-center text-sm text-muted">Bu sayfayı kapatabilirsiniz.</Text>
      </SafeAreaView>
    );
  }

  if (view.status === 'expired') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background p-6">
        <X size={40} color={palette.danger} />
        <Text className="mt-3 text-center text-base font-semibold text-foreground">
          Bu formun süresi dolmuş.
        </Text>
        <Text className="mt-1 text-center text-sm text-muted">
          Lütfen sizinle iletişime geçen kişiden yeni bir bağlantı isteyin.
        </Text>
      </SafeAreaView>
    );
  }

  const isDeclaration = step === FORM_STEPS.length;
  const stepDef = isDeclaration ? null : FORM_STEPS[step]!;
  const groupValues = stepDef ? values[stepDef.key] ?? {} : {};
  // Beyan adımındaki ad-soyad: baştaki isim (yoksa Adım 1'deki), düzenlenemez.
  const declarantName =
    (view.prefill.tenant_name ?? '').trim() ||
    String((values.personal as Record<string, unknown> | undefined)?.fullName ?? '').trim();

  // Bu adımdaki eksik zorunlu alanları bul.
  const missingFields = (): string[] => {
    if (!stepDef) return [];
    const miss: string[] = [];
    for (const f of stepDef.fields) {
      if (f.optional) continue;
      if (f.showIf && groupValues[f.showIf.key] !== f.showIf.equals) continue;
      if (isEmpty(groupValues[f.key])) miss.push(f.key);
    }
    // Araç adımı: "Evet" seçildiyse en az bir geçerli plaka gerekir.
    if (stepDef.vehicles && groupValues.hasVehicle === true) {
      if (!vehicles.some((v) => v.plate.trim() !== '')) miss.push('__vehicles__');
    }
    return miss;
  };

  const next = () => {
    const miss = missingFields();
    if (miss.length > 0) {
      setErrors(miss);
      setError('Lütfen zorunlu alanları doldurun.');
      runShake();
      return;
    }
    setErrors([]);
    setError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };
  const prev = () => {
    setErrors([]);
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header + progress */}
      <View className="px-5 pt-3">
        <View className="flex-row items-center gap-2">
          <View className="h-9 w-9 items-center justify-center rounded-2xl bg-primary">
            <Building2 size={18} color="#FFFFFF" />
          </View>
          <Text className="text-base font-bold text-foreground">{view.company_name}</Text>
        </View>
        <View className="mt-4 h-2 overflow-hidden rounded-full bg-border">
          <View
            className="h-2 rounded-full bg-primary"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </View>
        <Text className="mt-2 text-xs font-medium text-muted">
          Adım {step + 1} / {TOTAL_STEPS}
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-6 pt-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isDeclaration ? (
          <DeclarationStep
            accepted={accepted}
            setAccepted={setAccepted}
            declarantName={declarantName}
          />
        ) : (
          <>
            <Text className="text-2xl font-bold text-foreground">{stepDef!.title}</Text>

            <Animated.View className="mt-5 gap-4" style={{ transform: [{ translateX: shakeX }] }}>
              {stepDef!.fields.map((f) => {
                if (f.showIf && groupValues[f.showIf.key] !== f.showIf.equals) return null;
                return (
                  <FieldInput
                    key={f.key}
                    field={f}
                    value={groupValues[f.key]}
                    onChange={(v) => setField(stepDef!.key, f.key, v)}
                    error={errors.includes(f.key)}
                  />
                );
              })}

              {/* Araçlar (Adım 2) */}
              {stepDef!.vehicles && groupValues.hasVehicle === true ? (
                <VehiclesEditor
                  vehicles={vehicles}
                  setVehicles={(v) => {
                    setVehicles(v);
                    setErrors((prev) => prev.filter((k) => k !== '__vehicles__'));
                  }}
                  error={errors.includes('__vehicles__')}
                />
              ) : null}

              {/* Gelir belgesi (Adım 4) */}
              {stepDef!.documents ? (
                <DocumentsEditor docs={docs} setDocs={setDocs} onPick={pickDoc} />
              ) : null}
            </Animated.View>
          </>
        )}

        {error ? <Text className="mt-4 text-xs text-danger">{error}</Text> : null}
      </ScrollView>

      {/* Footer nav */}
      <View className="flex-row gap-3 border-t border-border bg-surface px-5 py-3">
        {step > 0 ? (
          <Pressable
            onPress={prev}
            className="flex-row items-center justify-center gap-1 rounded-2xl bg-background px-5 py-3.5 active:opacity-80"
          >
            <ChevronLeft size={18} color={palette.muted} />
            <Text className="text-sm font-semibold text-muted">Geri</Text>
          </Pressable>
        ) : null}
        {isDeclaration ? (
          <View className="flex-1">
            <Button label="Onayla ve Gönder" onPress={submit} loading={submitting} disabled={!accepted} />
          </View>
        ) : (
          <Pressable
            onPress={next}
            className="flex-1 flex-row items-center justify-center gap-1 rounded-2xl bg-primary py-3.5 active:opacity-80"
          >
            <Text className="text-base font-semibold text-white">Devam</Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------

function VehiclesEditor({
  vehicles,
  setVehicles,
  error,
}: {
  vehicles: TenantFormVehicle[];
  setVehicles: (v: TenantFormVehicle[]) => void;
  error?: boolean;
}) {
  const update = (i: number, patch: Partial<TenantFormVehicle>) =>
    setVehicles(vehicles.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  return (
    <View className="gap-3">
      {error ? (
        <Text className="text-xs font-medium text-danger">
          En az bir araç plakası girin.
        </Text>
      ) : null}
      {vehicles.map((v, i) => (
        <View
          key={i}
          className={`gap-3 rounded-2xl border bg-surface p-3 ${
            error && v.plate.trim() === '' ? 'border-danger' : 'border-border'
          }`}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-foreground">{i + 1}. Araç</Text>
            <Pressable onPress={() => setVehicles(vehicles.filter((_, idx) => idx !== i))} hitSlop={8}>
              <X size={18} color={palette.danger} />
            </Pressable>
          </View>
          <Input
            label="Araç Plakası"
            value={v.plate}
            onChangeText={(t) => update(i, { plate: t.toUpperCase() })}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Input
            label="Marka / Model (opsiyonel)"
            value={v.brandModel ?? ''}
            onChangeText={(t) => update(i, { brandModel: t })}
          />
        </View>
      ))}
      <Pressable
        onPress={() => setVehicles([...vehicles, { plate: '', brandModel: '' }])}
        className="flex-row items-center justify-center gap-1.5 rounded-2xl border border-dashed border-primary/50 bg-primary-50 py-3 active:opacity-80"
      >
        <Plus size={16} color={palette.primary} />
        <Text className="text-sm font-semibold text-primary-700">Başka Araç Ekle</Text>
      </Pressable>
    </View>
  );
}

function DocumentsEditor({
  docs,
  setDocs,
  onPick,
}: {
  docs: SubmitDocument[];
  setDocs: (d: SubmitDocument[]) => void;
  onPick: () => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted">Belge Yükle (opsiyonel)</Text>
      <Text className="text-xs text-muted">
        Maaş bordrosu, SGK hizmet dökümü, vergi levhası vb. (PDF veya görsel)
      </Text>
      {docs.map((d, i) => (
        <View
          key={i}
          className="flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-3"
        >
          <FileText size={16} color={palette.primary} />
          <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
            {d.name}
          </Text>
          <Pressable onPress={() => setDocs(docs.filter((_, idx) => idx !== i))} hitSlop={8}>
            <X size={16} color={palette.danger} />
          </Pressable>
        </View>
      ))}
      <Pressable
        onPress={onPick}
        className="flex-row items-center justify-center gap-1.5 rounded-2xl border border-dashed border-primary/50 bg-primary-50 py-3 active:opacity-80"
      >
        <Plus size={16} color={palette.primary} />
        <Text className="text-sm font-semibold text-primary-700">Belge Ekle</Text>
      </Pressable>
    </View>
  );
}

function DeclarationStep({
  accepted,
  setAccepted,
  declarantName,
}: {
  accepted: boolean;
  setAccepted: (v: boolean) => void;
  declarantName: string;
}) {
  return (
    <View>
      <Text className="text-2xl font-bold text-foreground">Beyan ve Onay</Text>

      <View className="mt-5 rounded-2xl border border-border bg-surface p-4">
        <Text className="text-sm leading-5 text-foreground">
          Yukarıda tarafımca verilen tüm bilgilerin doğru ve eksiksiz olduğunu beyan ederim.
          Kiralama sürecinde bu bilgilerin doğrulanabileceğini kabul ediyorum.
        </Text>
      </View>

      <Link href={'/yasal/kvkk' as Href} asChild>
        <Pressable className="mt-3 flex-row items-center gap-2">
          <ShieldCheck size={16} color={palette.primary} />
          <Text className="text-sm font-semibold text-primary-700">Aydınlatma Metnini Görüntüle</Text>
        </Pressable>
      </Link>

      <Pressable
        onPress={() => setAccepted(!accepted)}
        className="mt-5 flex-row items-start gap-3 rounded-2xl border border-border bg-surface p-4 active:opacity-80"
      >
        <View
          className={`mt-0.5 h-6 w-6 items-center justify-center rounded-lg border-2 ${
            accepted ? 'border-primary bg-primary' : 'border-border'
          }`}
        >
          {accepted ? <Check size={16} color="#FFFFFF" /> : null}
        </View>
        <Text className="flex-1 text-sm leading-5 text-foreground">
          Verdiğim bilgilerin doğru olduğunu beyan eder, kişisel verilerimin aydınlatma metnine
          uygun şekilde işlenmesine onay veririm.
        </Text>
      </Pressable>

      <View className="mt-5 gap-1.5">
        <Text className="text-sm font-medium text-muted">Kiracı Ad Soyad</Text>
        <View className="h-14 justify-center rounded-2xl border border-border bg-background px-4">
          <Text className="text-base font-medium text-foreground">
            {declarantName || '—'}
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-xs text-muted">
        Onay tarihi, formu gönderdiğinizde otomatik olarak kaydedilir.
      </Text>
    </View>
  );
}
