import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, type, useColors } from '@/theme';

import { AppText } from './ui';

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
  tone?: 'default' | 'celebrate';
}

const ToastCtx = createContext<(o: ToastOptions) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((o: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ ...o, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), o.durationMs ?? 4000);
  }, []);

  const celebrate = toast?.tone === 'celebrate';

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.key}
          entering={FadeInDown}
          exiting={FadeOutDown}
          pointerEvents="box-none"
          style={{ position: 'absolute', start: spacing.lg, end: spacing.lg, bottom: insets.bottom + 72 }}>
          <View
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              borderRadius: radius.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              backgroundColor: celebrate ? c.accent : c.text,
            }}>
            <AppText style={{ flex: 1, color: celebrate ? c.onAccent : c.background }}>{toast.message}</AppText>
            {toast.actionLabel ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => {
                  toast.onAction?.();
                  setToast(null);
                }}>
                <AppText style={[type.bodyStrong, { color: celebrate ? c.onAccent : c.primarySoft }]}>{toast.actionLabel}</AppText>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
