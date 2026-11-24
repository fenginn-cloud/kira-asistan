import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { palette } from '@/lib/theme/colors';

/** Gruplu liste: tek kart içinde ince çizgiyle ayrılmış satırlar (iOS ayarları gibi). */
export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="mt-6">
      {title ? (
        <Text className="mb-2 ml-1 text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-2xl border border-border/60 bg-surface">
        {children}
      </View>
    </View>
  );
}

/** Gruptaki tek satır: ikon · başlık (+ alt metin) · sağda değer/rozet/chevron. */
export function ListRow({
  icon: Icon,
  iconColor = palette.primary,
  iconBg = 'bg-primary-50',
  title,
  subtitle,
  value,
  badge,
  first,
  onPress,
  danger,
}: {
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  value?: string;
  badge?: string;
  first?: boolean;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className={`flex-row items-center gap-3 px-4 py-3 active:bg-background ${
        first ? '' : 'border-t border-border/60'
      }`}
    >
      <View className={`h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={18} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text
          className={`text-[15px] font-semibold ${danger ? 'text-danger' : 'text-foreground'}`}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? <Text className="text-sm text-muted">{value}</Text> : null}
      {badge ? (
        <View className="rounded-full bg-primary-50 px-2.5 py-0.5">
          <Text className="text-[11px] font-semibold text-primary-700">{badge}</Text>
        </View>
      ) : null}
      {onPress && !danger ? <ChevronRight size={18} color={palette.muted} /> : null}
    </Pressable>
  );
}
