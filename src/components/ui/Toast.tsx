import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { CheckCircle2, Info, XCircle } from 'lucide-react-native';
import { palette } from '@/lib/theme/colors';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const config: Record<ToastType, { icon: typeof Info; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: palette.success, bg: 'bg-success-soft' },
  error: { icon: XCircle, color: palette.danger, bg: 'bg-danger-soft' },
  info: { icon: Info, color: palette.primary, bg: 'bg-primary-50' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const value: ToastContextValue = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <SafeAreaView
        edges={['top']}
        pointerEvents="none"
        className="absolute left-0 right-0 top-0 items-center px-4"
      >
        {toasts.map((toast) => {
          const c = config[toast.type];
          const Icon = c.icon;
          return (
            <Animated.View
              key={toast.id}
              entering={FadeInUp.springify().damping(18)}
              exiting={FadeOutUp.duration(200)}
              className={`mt-2 w-full flex-row items-center gap-3 rounded-2xl ${c.bg} px-4 py-3 shadow-sm shadow-black/10`}
            >
              <Icon size={20} color={c.color} />
              <Text className="flex-1 text-sm font-medium text-foreground">
                {toast.message}
              </Text>
            </Animated.View>
          );
        })}
      </SafeAreaView>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
