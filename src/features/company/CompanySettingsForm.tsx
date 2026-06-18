import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Button } from '@/components/ui/Button';
import type { Company } from '@/types';

export interface CompanyFormValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  taxOffice: string;
  taxNumber: string;
  currency: string;
  defaultNotificationDays: number[];
}

const CURRENCIES = ['TRY', 'USD', 'EUR'];
const NOTIFY_DAY_OPTIONS = [7, 3, 1];

export function companyToFormValues(c: Company): CompanyFormValues {
  return {
    name: c.name,
    phone: c.phone ?? '',
    email: c.email ?? '',
    address: c.address ?? '',
    taxOffice: c.taxOffice ?? '',
    taxNumber: c.taxNumber ?? '',
    currency: c.currency,
    defaultNotificationDays: c.defaultNotificationDays,
  };
}

interface Props {
  defaultValues: CompanyFormValues;
  submitting?: boolean;
  onSubmit: (values: CompanyFormValues) => void;
}

export function CompanySettingsForm({ defaultValues, submitting, onSubmit }: Props) {
  const [values, setValues] = useState<CompanyFormValues>(defaultValues);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof CompanyFormValues>(key: K, v: CompanyFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const toggleDay = (day: number) =>
    set(
      'defaultNotificationDays',
      values.defaultNotificationDays.includes(day)
        ? values.defaultNotificationDays.filter((d) => d !== day)
        : [...values.defaultNotificationDays, day].sort((a, b) => b - a)
    );

  const handleSubmit = () => {
    setError(null);
    if (!values.name.trim()) return setError('Şirket adı zorunludur.');
    onSubmit(values);
  };

  return (
    <View className="gap-3">
      <Input label="Şirket Adı" value={values.name} onChangeText={(v) => set('name', v)} error={error ?? undefined} />
      <PhoneInput label="Telefon" value={values.phone} onChange={(v) => set('phone', v)} />
      <Input label="E-posta" value={values.email} onChangeText={(v) => set('email', v)} autoCapitalize="none" keyboardType="email-address" />
      <Input label="Adres" value={values.address} onChangeText={(v) => set('address', v)} multiline />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input label="Vergi Dairesi" value={values.taxOffice} onChangeText={(v) => set('taxOffice', v)} />
        </View>
        <View className="flex-1">
          <Input label="Vergi No" value={values.taxNumber} onChangeText={(v) => set('taxNumber', v)} keyboardType="number-pad" />
        </View>
      </View>

      <Text className="mt-1 text-sm font-medium text-muted">Para Birimi</Text>
      <View className="flex-row gap-2">
        {CURRENCIES.map((cur) => {
          const active = values.currency === cur;
          return (
            <Pressable
              key={cur}
              onPress={() => set('currency', cur)}
              className={`flex-1 items-center rounded-2xl py-3 ${active ? 'bg-primary' : 'bg-background'}`}
            >
              <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted'}`}>{cur}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mt-1 text-sm font-medium text-muted">Varsayılan Bildirim Günleri</Text>
      <View className="flex-row gap-2">
        {NOTIFY_DAY_OPTIONS.map((day) => {
          const active = values.defaultNotificationDays.includes(day);
          return (
            <Pressable
              key={day}
              onPress={() => toggleDay(day)}
              className={`flex-1 items-center rounded-2xl py-3 ${active ? 'bg-primary' : 'bg-background'}`}
            >
              <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted'}`}>
                {day} gün kala
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-3">
        <Button label="Şirket Bilgilerini Kaydet" onPress={handleSubmit} loading={submitting} />
      </View>
    </View>
  );
}
