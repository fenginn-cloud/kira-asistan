import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const containerByVariant: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-primary-50',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
};

const textByVariant: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-primary-700',
  ghost: 'text-primary-700',
  danger: 'text-white',
};

const iconColorByVariant: Record<Variant, string> = {
  primary: '#FFFFFF',
  secondary: '#1D4ED8',
  ghost: '#1D4ED8',
  danger: '#FFFFFF',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon: Icon,
  loading = false,
  disabled = false,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={[
        'flex-row items-center justify-center rounded-2xl active:opacity-80',
        size === 'lg' ? 'h-14 px-6' : 'h-11 px-4',
        containerByVariant[variant],
        fullWidth ? 'w-full' : 'self-start',
        isDisabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      {loading ? (
        <ActivityIndicator color={iconColorByVariant[variant]} />
      ) : (
        <View className="flex-row items-center gap-2">
          {Icon ? <Icon size={18} color={iconColorByVariant[variant]} /> : null}
          <Text className={`text-base font-semibold ${textByVariant[variant]}`}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
