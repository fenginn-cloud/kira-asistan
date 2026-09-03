import { Pressable, Text, TextInput, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { DateField } from '@/components/ui/DateField';
import { palette } from '@/lib/theme/colors';
import type { FieldDef } from '../config';

interface Props {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}

/** Renders a single tenant-form field using the app's design primitives. */
export function FieldInput({ field, value, onChange }: Props) {
  switch (field.type) {
    case 'money':
      return (
        <MoneyInput
          label={field.label}
          value={typeof value === 'number' ? value : 0}
          onChangeNumber={onChange}
        />
      );
    case 'tel':
      return (
        <PhoneInput
          label={field.label}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
        />
      );
    case 'date':
      return (
        <DateField
          label={field.label}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          optional
        />
      );
    case 'textarea':
      return (
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-muted">{field.label}</Text>
          <TextInput
            value={typeof value === 'string' ? value : ''}
            onChangeText={onChange}
            placeholder={field.placeholder}
            placeholderTextColor="#9CA3AF"
            multiline
            className="min-h-[92px] rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground"
            textAlignVertical="top"
          />
        </View>
      );
    case 'bool':
      return (
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-muted">{field.label}</Text>
          <View className="flex-row gap-2">
            {[
              { v: true, l: 'Evet' },
              { v: false, l: 'Hayır' },
            ].map((opt) => {
              const active = value === opt.v;
              return (
                <Pressable
                  key={opt.l}
                  onPress={() => onChange(opt.v)}
                  className={`flex-1 items-center rounded-2xl border py-3 ${
                    active ? 'border-primary bg-primary-50' : 'border-border bg-surface'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${active ? 'text-primary-700' : 'text-muted'}`}>
                    {opt.l}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    case 'select':
      return (
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-muted">{field.label}</Text>
          <View className="flex-row flex-wrap gap-2">
            {(field.options ?? []).map((opt) => {
              const active = value === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => onChange(opt)}
                  className={`flex-row items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 ${
                    active ? 'border-primary bg-primary-50' : 'border-border bg-surface'
                  }`}
                >
                  {active ? <Check size={14} color={palette.primary} /> : null}
                  <Text className={`text-sm font-medium ${active ? 'text-primary-700' : 'text-muted'}`}>
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    case 'number':
      return (
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-muted">{field.label}</Text>
          <TextInput
            value={value === undefined || value === null || value === '' ? '' : String(value)}
            onChangeText={(t) => {
              const digits = t.replace(/[^\d]/g, '');
              onChange(digits ? parseInt(digits, 10) : '');
            }}
            keyboardType="number-pad"
            placeholder={field.placeholder}
            placeholderTextColor="#9CA3AF"
            className="h-14 rounded-2xl border border-border bg-surface px-4 text-base text-foreground"
          />
        </View>
      );
    case 'email':
      return (
        <Input
          label={field.label}
          value={typeof value === 'string' ? value : ''}
          onChangeText={onChange}
          placeholder={field.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      );
    default:
      return (
        <Input
          label={field.label}
          value={typeof value === 'string' ? value : ''}
          onChangeText={onChange}
          placeholder={field.placeholder}
        />
      );
  }
}
