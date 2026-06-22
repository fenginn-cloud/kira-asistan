import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

type Tone = 'primary' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, { bg: string; icon: string }> = {
  primary: { bg: 'bg-primary-50', icon: '#2563EB' },
  success: { bg: 'bg-success-soft', icon: '#16A34A' },
  warning: { bg: 'bg-warning-soft', icon: '#D97706' },
  danger: { bg: 'bg-danger-soft', icon: '#DC2626' },
};

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
}

export function StatCard({ label, value, icon: Icon, tone = 'primary' }: StatCardProps) {
  const t = tones[tone];
  return (
    <View className="flex-1 rounded-3xl bg-surface p-4 border border-border/60 shadow-sm shadow-black/5">
      <View className={`h-10 w-10 items-center justify-center rounded-2xl ${t.bg}`}>
        <Icon size={20} color={t.icon} />
      </View>
      <Text className="mt-3 text-2xl font-bold text-foreground" numberOfLines={1}>
        {value}
      </Text>
      <Text className="mt-0.5 text-xs text-muted" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}
