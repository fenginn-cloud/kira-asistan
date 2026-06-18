import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import {
  COUNTRIES,
  composePhone,
  formatNational,
  parsePhone,
  type Country,
} from '@/lib/utils/countries';

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/**
 * Phone field with a country-code selector (default +90) and live formatting.
 * Stores a canonical string like "+90 555 123 12 12".
 */
export function PhoneInput({ label, value, onChange, error }: PhoneInputProps) {
  const parsed = useMemo(() => parsePhone(value), [value]);
  const country =
    COUNTRIES.find((c) => c.dial === parsed.dial) ?? COUNTRIES[0]!;

  const [pickerOpen, setPickerOpen] = useState(false);

  const handleDigits = (text: string) => {
    const digits = text.replace(/[^\d]/g, '').slice(0, country.max);
    onChange(composePhone(country.dial, digits));
  };

  const selectCountry = (c: Country) => {
    setPickerOpen(false);
    const digits = parsed.digits.slice(0, c.max);
    onChange(composePhone(c.dial, digits));
  };

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-muted">{label}</Text>
      ) : null}

      <View
        className={`h-14 flex-row items-center rounded-2xl border bg-surface pr-4 ${
          error ? 'border-danger' : 'border-border'
        }`}
      >
        <Pressable
          onPress={() => setPickerOpen(true)}
          className="h-full flex-row items-center gap-1 border-r border-border px-3"
        >
          <Text className="text-base">{country.flag}</Text>
          <Text className="text-base font-semibold text-[#0B1220]">{country.dial}</Text>
          <ChevronDown size={16} color="#6B7280" />
        </Pressable>

        <TextInput
          value={formatNational(country.dial, parsed.digits)}
          onChangeText={handleDigits}
          keyboardType="phone-pad"
          placeholder={country.dial === '+90' ? '555 123 12 12' : '123 456 789'}
          placeholderTextColor="#9CA3AF"
          className="ml-3 flex-1 text-base text-[#0B1220]"
        />
      </View>

      {error ? <Text className="text-xs text-danger">{error}</Text> : null}

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[70%] rounded-t-3xl bg-surface p-5 pb-8">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-[#0B1220]">Ülke Kodu</Text>
              <Pressable onPress={() => setPickerOpen(false)} className="h-8 w-8 items-center justify-center">
                <X size={22} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {COUNTRIES.map((c) => {
                const active = c.dial === country.dial;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => selectCountry(c)}
                    className={`flex-row items-center gap-3 rounded-2xl px-3 py-3 ${
                      active ? 'bg-primary-50' : ''
                    }`}
                  >
                    <Text className="text-xl">{c.flag}</Text>
                    <Text className="flex-1 text-base text-[#0B1220]">{c.name}</Text>
                    <Text className="text-base font-semibold text-muted">{c.dial}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
