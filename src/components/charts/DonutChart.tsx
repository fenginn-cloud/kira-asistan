import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { palette } from '@/lib/theme/colors';

interface DonutChartProps {
  /** 0-100 */
  percentage: number;
  size?: number;
  color?: string;
  label?: string;
}

export function DonutChart({
  percentage,
  size = 140,
  color = palette.success,
  label,
}: DonutChartProps) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference * (1 - clamped / 100);

  return (
    <View className="items-center">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={palette.border}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-3xl font-bold text-foreground">
            {Math.round(clamped)}%
          </Text>
          {label ? <Text className="text-xs text-muted">{label}</Text> : null}
        </View>
      </View>
    </View>
  );
}
