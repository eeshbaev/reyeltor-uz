import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { hapticLight } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import { useTheme } from '@/lib/theme';

/**
 * One confirmation pattern for the whole app (design doc: States). Answers "what happened"
 * and, with an action, "can I take it back" — e.g. Saved · Undo. Never blocks the screen.
 */
export interface ToastOptions {
  message: string;
  tone?: 'success' | 'info' | 'error';
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface ToastState extends ToastOptions {
  id: number;
}

let current: ToastState | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function showToast(options: ToastOptions): void {
  current = { ...options, id: nextId++ };
  emit();
}

export function hideToast(id?: number): void {
  if (id != null && current?.id !== id) return;
  current = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const ICON: Record<NonNullable<ToastOptions['tone']>, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  info: 'information-circle',
  error: 'alert-circle',
};

/** Mount once, above the navigator (app/_layout.tsx). Sits above the floating tab bar. */
export function ToastHost() {
  const toast = useSyncExternalStore(subscribe, () => current, () => current);
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const [visibleId, setVisibleId] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!toast) {
      setVisibleId(null);
      return;
    }
    setVisibleId(toast.id);
    const duration = toast.durationMs ?? (toast.onAction ? 5000 : 3000);
    timer.current = setTimeout(() => hideToast(toast.id), duration);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast]);

  if (!toast || visibleId !== toast.id) return null;
  const tone = toast.tone ?? 'success';
  const toneColor =
    tone === 'error' ? theme.colors.danger : tone === 'info' ? theme.colors.accent : theme.colors.success;

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 96 }]} pointerEvents="box-none">
      <Animated.View
        key={toast.id}
        entering={reduceMotion ? FadeIn.duration(150) : SlideInDown.springify().damping(24).stiffness(380)}
        exiting={reduceMotion ? FadeOut.duration(150) : SlideOutDown.duration(180)}
        style={styles.anim}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <FrostedView style={[styles.toast, { borderColor: theme.colors.border }]} intensity={80}>
          <Ionicons name={ICON[tone]} size={20} color={toneColor} />
          <AppText variant="callout" style={styles.message}>
            {toast.message}
          </AppText>
          {toast.actionLabel && toast.onAction ? (
            <Pressable
              onPress={() => {
                hapticLight();
                const action = toast.onAction;
                hideToast(toast.id);
                action?.();
              }}
              accessibilityRole="button"
              hitSlop={10}
            >
              <AppText variant="label" color="accent">
                {toast.actionLabel}
              </AppText>
            </Pressable>
          ) : null}
        </FrostedView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md, alignItems: 'center', zIndex: 1000 },
  anim: { width: '100%', maxWidth: 520 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  message: { flex: 1 },
});
