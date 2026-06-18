import { Text, View } from 'react-native';
import { format } from 'date-fns';

interface DateFieldProps {
  label?: string;
  /** ISO yyyy-MM-dd, or '' when empty. */
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  optional?: boolean;
  minimumDate?: Date;
}

/**
 * Web implementation: uses the browser's native <input type="date">.
 * The native (.tsx) version uses @react-native-community/datetimepicker, which
 * does not work on web. HTML date inputs already use ISO yyyy-MM-dd, matching
 * how the rest of the app stores dates.
 */
export function DateField({ label, value, onChange, error, minimumDate }: DateFieldProps) {
  const min = minimumDate ? format(minimumDate, 'yyyy-MM-dd') : undefined;

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-muted">{label}</Text>
      ) : null}
      <input
        type="date"
        value={value || ''}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 56,
          width: '100%',
          boxSizing: 'border-box',
          borderRadius: 16,
          border: `1px solid ${error ? '#DC2626' : '#E5E7EB'}`,
          backgroundColor: '#FFFFFF',
          paddingLeft: 16,
          paddingRight: 12,
          fontSize: 16,
          color: value ? '#0B1220' : '#9CA3AF',
          fontFamily: 'inherit',
          outline: 'none',
        }}
      />
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
