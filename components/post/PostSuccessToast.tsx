import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReyeltorCoin } from '@/components/brand/ReyeltorCoin';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { elevation } from '@/lib/design/elevation';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface PostSuccessToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
}

export function PostSuccessToast({ message, visible, onDismiss }: PostSuccessToastProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 2400);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(280)}
      exiting={FadeOutUp.duration(200)}
      style={[styles.wrap, { top: insets.top + spacing.sm }]}
      pointerEvents="none"
    >
      <FrostedView style={[styles.toast, elevation.floating, { borderColor: theme.colors.border }]}>
        <ReyeltorCoin size="xs" />
        <AppText variant="label" style={styles.text}>
          {message}
        </AppText>
      </FrostedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 2000,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: { flexShrink: 1 },
});
