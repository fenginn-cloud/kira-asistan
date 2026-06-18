import { Pressable, View } from 'react-native';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
}

/** Rounded surface with a soft iOS-style shadow. */
export function Card({ children, onPress, className = '' }: CardProps) {
  const base =
    'rounded-3xl bg-surface p-4 border border-border/60 shadow-sm shadow-black/5';
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`${base} active:opacity-90 ${className}`}
      >
        {children}
      </Pressable>
    );
  }
  return <View className={`${base} ${className}`}>{children}</View>;
}
