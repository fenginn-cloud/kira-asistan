import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  className?: string;
}

/** Pulsing placeholder block. */
export function Skeleton({ className = '' }: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={style} className={`rounded-2xl bg-border ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <View className="rounded-3xl bg-surface p-4 border border-border/60 gap-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-8 w-full" />
    </View>
  );
}
