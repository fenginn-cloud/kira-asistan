import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { palette } from '@/lib/theme/colors';

export interface BarDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
  /** Vurgulanacak çubuğun indeksi; diğerleri soluklaşır. */
  activeIndex?: number;
}

export function BarChart({
  data,
  height = 160,
  color = palette.primary,
  formatValue,
  activeIndex,
}: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barAreaHeight = height - 28;
  const slot = 100 / data.length;
  const barWidth = slot * 0.5;
  const hasActive = activeIndex !== undefined && activeIndex >= 0;

  return (
    <View>
      <Svg width="100%" height={barAreaHeight} viewBox="0 0 100 100" preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = (d.value / max) * 100;
          const x = i * slot + (slot - barWidth) / 2;
          const isActive = !hasActive || i === activeIndex;
          return (
            <Rect
              key={d.label}
              x={x}
              y={100 - h}
              width={barWidth}
              height={h}
              rx={1.5}
              fill={color}
              opacity={isActive ? 0.95 : 0.28}
            />
          );
        })}
      </Svg>
      <View className="mt-2 flex-row">
        {data.map((d, i) => (
          <View key={d.label} className="flex-1 items-center">
            <Text
              className={`text-[10px] ${
                hasActive && i === activeIndex ? 'font-bold text-foreground' : 'text-muted'
              }`}
              numberOfLines={1}
            >
              {d.label}
            </Text>
          </View>
        ))}
      </View>
      {formatValue ? (
        <Text className="mt-1 text-center text-xs text-muted">
          En yüksek: {formatValue(max)}
        </Text>
      ) : null}
    </View>
  );
}
