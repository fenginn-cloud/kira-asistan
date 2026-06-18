import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, className = '', ...props },
  ref
) {
  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-muted">{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#9CA3AF"
        className={[
          'h-14 rounded-2xl border bg-surface px-4 text-base text-[#0B1220]',
          error ? 'border-danger' : 'border-border',
          className,
        ].join(' ')}
        {...props}
      />
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
});
