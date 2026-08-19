import { useMemo, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
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
}

export function ContractForm({
  defaultValues,
  submitLabel,
  submitting,
  onSubmit,
}: ContractFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues,
  });

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
      </View>

      <SectionHeader title="Bildirim Ayarları" />
      <Card>
        <ToggleRow control={control} name="notifyOwner" label="Mülk sahibine bildirim" />
        <ToggleRow control={control} name="notifyTenant" label="Kiracıya bildirim" border />
        <ToggleRow control={control} name="notifyStaff" label="Personel bildirimi" border />
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
  name: 'notifyOwner' | 'notifyTenant' | 'notifyStaff';
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
