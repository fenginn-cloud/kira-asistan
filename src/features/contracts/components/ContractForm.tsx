import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { addMonths, format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Info } from 'lucide-react-native';
import { monthStart } from '@/lib/ledger/accrual';
import { suggestedTrackingStart } from '../form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { DateField } from '@/components/ui/DateField';
import { useContracts } from '@/features/contracts/hooks';
import { foldSearch } from '@/lib/utils/property';
import { contractFormSchema, type ContractFormValues } from '../schema';
import { palette } from '@/lib/theme/colors';

interface ContractFormProps {
  defaultValues: ContractFormValues;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (values: ContractFormValues) => void;
  /** 'edit' → başlangıç bakiyesi gizlenir; kira değişirse geçerlilik ayı sorulur. */
  mode?: 'create' | 'edit';
}

export function ContractForm({
  defaultValues,
  submitLabel,
  submitting,
  onSubmit,
  mode = 'create',
}: ContractFormProps) {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues,
  });
  const [startDate, trackingStart, rentAmount, duesAmount] = useWatch({
    control,
    name: ['startDate', 'trackingStart', 'rentAmount', 'duesAmount'],
  });
  const startMonth = startDate ? monthStart(startDate) : '';
  // Yeni sözleşmede takip başlangıcı otomatik önerilir; kullanıcı değiştirebilir.
  const effectiveTracking =
    trackingStart && startMonth && trackingStart >= startMonth
      ? trackingStart
      : suggestedTrackingStart(startDate);
  const trackingOptions = useMemo(() => monthOptions(startMonth), [startMonth]);
  const rentChanged =
    mode === 'edit' &&
    (Number(rentAmount) !== defaultValues.rentAmount ||
      Number(duesAmount) !== defaultValues.duesAmount);
  const effectiveOptions = useMemo(
    () => monthOptions(defaultValues.trackingStart || startMonth, 6),
    [defaultValues.trackingStart, startMonth]
  );

  return (
    <View>
      <SectionHeader title="Mülk" />
      <View className="gap-3">
        <PropertyNameField control={control} errors={errors} />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field control={control} name="block" label="Blok" errors={errors} />
          </View>
          <View className="flex-1">
            <Field control={control} name="unit" label="Daire" errors={errors} />
          </View>
        </View>
      </View>

      <SectionHeader title="Kiracı" />
      <View className="gap-3">
        <Field control={control} name="tenantName" label="Kiracı Adı *" errors={errors} />
        <PhoneField control={control} name="tenantPhone" label="Kiracı Telefonu *" errors={errors} />
        <Field control={control} name="tenantNationalId" label="TC Kimlik (opsiyonel)" keyboardType="number-pad" errors={errors} />
      </View>

      <SectionHeader title="Mülk Sahibi" />
      <View className="gap-3">
        <Field control={control} name="ownerName" label="Mülk Sahibi *" errors={errors} />
        <PhoneField control={control} name="ownerPhone" label="Mülk Sahibi Telefonu *" errors={errors} />
      </View>

      <SectionHeader title="Finansal" />
      <View className="gap-3">
        <MoneyField control={control} name="rentAmount" label="Kira Bedeli *" errors={errors} />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <MoneyField control={control} name="duesAmount" label="Aidat" errors={errors} />
          </View>
          <View className="flex-1">
            <MoneyField control={control} name="depositAmount" label="Depozito" errors={errors} />
          </View>
        </View>
        <MoneyField
          control={control}
          name="commissionAmount"
          label="Komisyon Tutarı (opsiyonel)"
          errors={errors}
        />
      </View>

      <SectionHeader title="Sözleşme Koşulları" />
      <View className="gap-3">
        <DateFieldControlled control={control} name="startDate" label="Başlangıç Tarihi *" errors={errors} />
        <DateFieldControlled control={control} name="endDate" label="Bitiş Tarihi" optional errors={errors} />
        <Field control={control} name="paymentDay" label="Ödeme Günü (1-31) *" keyboardType="number-pad" errors={errors} />
        <Field control={control} name="notes" label="Notlar" errors={errors} />
        <Card>
          <ToggleRow
            control={control}
            name="autoRenew"
            label="Bitişte aynı koşullarla uzasın"
          />
          <Text className="pb-1 text-xs text-muted">
            Açıkken bitiş tarihinden sonra da kira takibi sürer; süre dolunca size “Uzatıldı
            mı, kiracı çıktı mı?” diye sorulur.
          </Text>
        </Card>
      </View>

      {rentChanged ? (
        <View className="mt-4 rounded-2xl border border-warning/40 bg-warning-soft p-4">
          <Text className="text-sm font-bold text-foreground">Yeni kira hangi aydan geçerli?</Text>
          <Text className="mb-2 mt-0.5 text-xs text-muted">
            Önceki aylar ve alınan tahsilatlar değişmez.
          </Text>
          <Controller
            control={control}
            name="rentEffectiveMonth"
            render={({ field: { value, onChange } }) => (
              <MonthChips options={effectiveOptions} value={value || monthStart(new Date())} onChange={onChange} />
            )}
          />
        </View>
      ) : null}

      <SectionHeader title="Kira Takibi" />
      <Card>
        <Text className="text-sm font-semibold text-foreground">
          Hangi aydan itibaren takip edilsin?
        </Text>
        <Text className="mb-2 mt-0.5 text-xs text-muted">
          Seçilen aydan önceki aylar için otomatik borç veya tahsilat yazılmaz.
        </Text>
        {startMonth ? (
          <MonthChips
            options={trackingOptions}
            value={effectiveTracking}
            onChange={(v) => setValue('trackingStart', v, { shouldDirty: true })}
          />
        ) : (
          <Text className="text-xs text-muted">Önce başlangıç tarihini seçin.</Text>
        )}
        {mode === 'create' ? (
          <View className="mt-3">
            <MoneyField
              control={control}
              name="openingBalance"
              label="Takip öncesinden kalan borç (varsa)"
              errors={errors}
            />
            <Text className="mt-1 text-xs text-muted">
              Girerseniz “Başlangıç bakiyesi” olarak tek satırda borca eklenir.
            </Text>
          </View>
        ) : null}
      </Card>

      {/* Bildirimler: neyin otomatik olduğunu açıkça söyle (sahte ayar yok). */}
      <SectionHeader title="Hatırlatmalar" />
      <Card>
        <View className="flex-row gap-2">
          <Info size={16} color={palette.primary} />
          <View className="flex-1 gap-1">
            <Text className="text-sm text-foreground">
              Ödeme günü yaklaşınca ve geciktiğinde hatırlatma <Text className="font-bold">size ve ekibinize</Text> bildirim olarak gelir (Bildirim Ayarları).
            </Text>
            <Text className="text-sm text-foreground">
              Kiracıya veya mülk sahibine <Text className="font-bold">otomatik mesaj gönderilmez</Text>. Mesajı sözleşme ekranındaki “Mesaj” ile WhatsApp üzerinden siz gönderirsiniz.
            </Text>
          </View>
        </View>
      </Card>

      <View className="mt-6">
        <Button label={submitLabel} onPress={handleSubmit(onSubmit)} loading={submitting} />
      </View>
    </View>
  );
}

function Field({
  control,
  name,
  label,
  errors,
  keyboardType,
}: {
  control: any;
  name: keyof ContractFormValues;
  label: string;
  errors: any;
  keyboardType?: 'numeric' | 'phone-pad' | 'number-pad';
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <Input
          label={label}
          value={value === undefined || value === null ? '' : String(value)}
          onChangeText={onChange}
          onBlur={onBlur}
          keyboardType={keyboardType}
          error={errors[name]?.message as string | undefined}
        />
      )}
    />
  );
}

function PhoneField({
  control,
  name,
  label,
  errors,
}: {
  control: any;
  name: keyof ContractFormValues;
  label: string;
  errors: any;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <PhoneInput
          label={label}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          error={errors[name]?.message as string | undefined}
        />
      )}
    />
  );
}

function MoneyField({
  control,
  name,
  label,
  errors,
}: {
  control: any;
  name: keyof ContractFormValues;
  label: string;
  errors: any;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <MoneyInput
          label={label}
          value={Number(value) || 0}
          onChangeNumber={onChange}
          error={errors[name]?.message as string | undefined}
        />
      )}
    />
  );
}

/**
 * Mülk Adı — geçmiş sözleşmelerdeki mülk isimlerinden autocomplete öneren alan.
 * Öneriler kullanıcının kendi (RLS ile şirketine ait) sözleşmelerinden gelir;
 * Türkçe/aksan duyarsız, tekilleştirilmiş, orijinal yazım korunur. Kullanıcı
 * öneriden seçebilir ya da tamamen yeni bir isim yazabilir.
 */
function PropertyNameField({ control, errors }: { control: any; errors: any }) {
  const { data: contracts = [] } = useContracts();
  const suggestions = useMemo(() => {
    const seen = new Map<string, string>(); // foldKey -> orijinal yazım (ilk görülen)
    for (const c of contracts) {
      const name = (c.propertyName ?? '').trim();
      if (!name) continue;
      const key = foldSearch(name);
      if (key && !seen.has(key)) seen.set(key, name);
    }
    return [...seen.values()];
  }, [contracts]);

  const [open, setOpen] = useState(false);

  return (
    <Controller
      control={control}
      name="propertyName"
      render={({ field: { onChange, onBlur, value } }) => {
        const val = typeof value === 'string' ? value : '';
        const q = foldSearch(val.trim());
        const matches =
          q.length >= 1
            ? suggestions
                .filter((s) => {
                  const k = foldSearch(s);
                  return k.includes(q) && k !== q; // tam eşleşme zaten yazılmış
                })
                .slice(0, 6)
            : [];
        const showList = open && matches.length > 0;
        return (
          <View style={{ zIndex: 20 }}>
            <Input
              label="Mülk Adı *"
              value={val}
              onChangeText={(t) => {
                onChange(t);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                onBlur();
                // Dokunuşun kaydı için kapanışı hafif geciktir.
                setTimeout(() => setOpen(false), 150);
              }}
              error={errors.propertyName?.message as string | undefined}
            />
            {showList ? (
              <View
                className="absolute left-0 right-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm shadow-black/10"
                style={{ top: 82, zIndex: 30, elevation: 6 }}
              >
                {matches.map((s, i) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      onChange(s);
                      setOpen(false);
                    }}
                    className={`px-4 py-3 active:bg-background ${
                      i > 0 ? 'border-t border-border/60' : ''
                    }`}
                  >
                    <Text className="text-base text-foreground">{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

function DateFieldControlled({
  control,
  name,
  label,
  errors,
  optional,
}: {
  control: any;
  name: keyof ContractFormValues;
  label: string;
  errors: any;
  optional?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <DateField
          label={label}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          optional={optional}
          error={errors[name]?.message as string | undefined}
        />
      )}
    />
  );
}

function ToggleRow({
  control,
  name,
  label,
  border = false,
}: {
  control: any;
  name: 'autoRenew';
  label: string;
  border?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View
          className={`flex-row items-center justify-between py-3 ${
            border ? 'border-t border-border/60' : ''
          }`}
        >
          <Text className="text-base text-foreground">{label}</Text>
          <Switch
            value={!!value}
            onValueChange={onChange}
            trackColor={{ true: palette.primary, false: palette.border }}
          />
        </View>
      )}
    />
  );
}

/** Takip / geçerlilik ayı seçenekleri: `from` ayından (en fazla son 12 ay) → bugün + `ahead`. */
function monthOptions(from: string, ahead = 1): { value: string; label: string }[] {
  const cur = monthStart(new Date());
  const end = monthStart(addMonths(new Date(), ahead));
  const out: { value: string; label: string }[] = [];
  if (!from) return out;
  const earliest = monthStart(addMonths(new Date(), -12));
  let m = from > earliest ? from : earliest;
  if (from < earliest) out.push({ value: from, label: `${fmtMonth(from)} (başlangıç)` });
  if (from > end) return [{ value: from, label: `${fmtMonth(from)} (başlangıç)` }];
  for (let i = 0; m <= end && i < 40; i++) {
    out.push({
      value: m,
      label: m === from ? `${fmtMonth(m)} (başlangıç)` : m === cur ? `${fmtMonth(m)} (bu ay)` : fmtMonth(m),
    });
    m = monthStart(addMonths(parseISO(m), 1));
  }
  return out;
}

function fmtMonth(iso: string): string {
  return format(parseISO(iso), 'MMM yyyy', { locale: tr });
}

export function MonthChips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  // Seçili ay ekran dışında kalmasın: ilk yerleşimde ona kaydır.
  const scrollRef = useRef<ScrollView>(null);
  const scrolled = useRef(false);
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onLayout={
              active
                ? (e) => {
                    if (scrolled.current) return;
                    scrolled.current = true;
                    scrollRef.current?.scrollTo({
                      x: Math.max(e.nativeEvent.layout.x - 16, 0),
                      animated: false,
                    });
                  }
                : undefined
            }
            onPress={() => onChange(o.value)}
            accessibilityState={{ selected: active }}
            className={`rounded-2xl px-3.5 py-2 ${active ? 'bg-primary' : 'bg-background'}`}
          >
            <Text className={`text-sm font-semibold capitalize ${active ? 'text-white' : 'text-foreground'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
