import { Text, TextInput, View } from 'react-native';

interface MoneyInputProps {
  label?: string;
  value: number;
  onChangeNumber: (value: number) => void;
  error?: string;
  placeholder?: string;
}

function formatThousands(n: number): string {
  if (!n) return '';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
}

/**
 * Currency input that formats with Turkish thousands separators as the user
 * types (10000 -> "10.000") and reports a clean numeric value.
 */
export function MoneyInput({
  label,
  value,
  onChangeNumber,
  error,
  placeholder = '0',
}: MoneyInputProps) {
  const display = formatThousands(value);

  const handleChange = (text: string) => {
    const digits = text.replace(/[^\d]/g, '');
    onChangeNumber(digits ? parseInt(digits, 10) : 0);
  };

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-muted">{label}</Text>
      ) : null}
      <View
        className={`h-14 flex-row items-center rounded-2xl border bg-surface px-4 ${
          error ? 'border-danger' : 'border-border'
        }`}
      >
        <TextInput
          value={display}
          onChangeText={handleChange}
          keyboardType="number-pad"
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          className="flex-1 text-base text-foreground"
        />
        <Text className="ml-2 text-base font-semibold text-muted">₺</Text>
      </View>
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
