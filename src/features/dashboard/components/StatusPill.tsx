import { Text, View } from 'react-native';

export type PillTone = 'paid' | 'pending' | 'overdue' | 'info';

const TONES: Record<PillTone, { dot: string; bg: string; text: string }> = {
  paid: { dot: '#16A34A', bg: 'bg-success-soft', text: 'text-success' },
  pending: { dot: '#D97706', bg: 'bg-warning-soft', text: 'text-warning' },
  overdue: { dot: '#DC2626', bg: 'bg-danger-soft', text: 'text-danger' },
  info: { dot: '#2563EB', bg: 'bg-primary-50', text: 'text-primary-700' },
};

/**
 * Stitch "Status Badge/Pill" — 6px renkli nokta + pill. Dashboard'a özel;
 * uygulamanın genel StatusBadge'ine dokunmaz.
 */
export function StatusPill({ tone, label }: { tone: PillTone; label: string }) {
  const t = TONES[tone];
  return (
    <View className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${t.bg}`}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.dot }} />
      <Text className={`text-[11px] font-semibold ${t.text}`}>{label}</Text>
    </View>
  );
}
