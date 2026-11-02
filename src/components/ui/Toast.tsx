import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { CheckCircle2, Info, XCircle } from 'lucide-react-native';
import { palette } from '@/lib/theme/colors';

type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastOptions {
  action?: ToastAction;
  /** ms; aksiyonlu bildirimler varsayılan 5 sn kalır. */
  duration?: number;
}

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  action?: ToastAction;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const config: Record<ToastType, { icon: typeof Info; color: string; accent: string }> = {
  success: { icon: CheckCircle2, color: palette.success, accent: 'border-success/40' },
  error: { icon: XCircle, color: palette.danger, accent: 'border-danger/40' },
  info: { icon: Info, color: palette.primary, accent: 'border-primary/30' },
};

/**
 * Bildirimler ekranın ALTINDA, alt menünün üstünde, opak bir kartta gösterilir
 * (başlık/içerikle çakışmaz, koyu temada okunur). İsteğe bağlı aksiyon (ör.
 * "Geri al") desteklenir.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info', options?: ToastOptions) => {
      const id = ++counter.current;
      // En fazla 2 bildirim üst üste; eskisi düşer.
      setToasts((prev) => [
        ...prev.slice(-1),
        { id, type, message, action: options?.action },
      ]);
      setTimeout(() => dismiss(id), options?.duration ?? (options?.action ? 5000 : 2800));
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    show,
    success: (m, o) => show(m, 'success', o),
    error: (m, o) => show(m, 'error', o),
    info: (m, o) => show(m, 'info', o),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 items-center px-4"
        // Alt menü (64px + güvenli alan) üstünde.
        style={{ bottom: Math.max(insets.bottom, 10) + 74 }}
      >
        {toasts.map((toast) => {
          const c = config[toast.type];
          const Icon = c.icon;
          return (
            // Stil iç View'da: Animated.View'a verilen className web'de
            // uygulanmıyordu (bildirim arka plansız görünüyordu).
            <Animated.View
              key={toast.id}
              entering={FadeInDown.springify().damping(18)}
              exiting={FadeOutDown.duration(200)}
              style={{ width: '100%', maxWidth: 480 }}
            >
              <View
                className={`mt-2 w-full flex-row items-center gap-3 rounded-2xl border ${c.accent} bg-surface px-4 py-3 shadow-lg shadow-black/20`}
              >
                <Icon size={20} color={c.color} />
                <Text className="flex-1 text-sm font-medium text-foreground">
                  {toast.message}
                </Text>
                {toast.action ? (
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => {
                      dismiss(toast.id);
                      toast.action?.onPress();
                    }}
                    className="rounded-xl bg-primary-50 px-3 py-1.5 active:opacity-80"
                  >
                    <Text className="text-sm font-bold text-primary-700">
                      {toast.action.label}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
