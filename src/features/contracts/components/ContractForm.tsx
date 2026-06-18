import { Switch, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { DateField } from '@/components/ui/DateField';
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
        <Field control={control} name="propertyName" label="Mülk Adı *" errors={errors} />
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
          <Text className="text-base text-[#0B1220]">{label}</Text>
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
