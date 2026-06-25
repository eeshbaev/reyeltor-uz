import { useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { AppText } from './AppText';
import { spacing } from '@/lib/design/spacing';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  disabledReason?: string;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  disabledReason,
  loading = false,
  style,
  fullWidth = true,
}: ButtonProps) {
  const theme = useTheme();
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(disabled || loading ? undefined : onPress);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const variantStyle =
    variant === 'primary'
      ? styles.primary
      : variant === 'secondary'
        ? styles.secondary
        : styles.destructive;

  const textColor =
    variant === 'primary' ? 'onAccent' : variant === 'destructive' ? 'danger' : 'primary';

  return (
    <View style={[fullWidth && styles.wrapper, style]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={handlePress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={disabled || loading}
          android_ripple={{ color: theme.colors.borderStrong }}
          style={[
            styles.base,
            variantStyle,
            fullWidth && styles.fullWidth,
            (disabled || loading) && styles.disabled,
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {loading ? (
            <ActivityIndicator color={variant === 'primary' ? theme.colors.onAccent : theme.colors.accent} />
          ) : (
            <AppText variant="label" color={textColor} style={styles.label}>
              {label}
            </AppText>
          )}
        </Pressable>
      </Animated.View>
      {disabled && disabledReason ? (
        <AppText variant="caption" color="secondary" style={styles.disabledReason}>
          {disabledReason}
        </AppText>
      ) : null}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    wrapper: { width: '100%' },
    base: {
      minHeight: Platform.OS === 'ios' ? 52 : 48,
      minWidth: Platform.OS === 'ios' ? 44 : 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    fullWidth: { width: '100%' },
    primary: { backgroundColor: theme.colors.accent },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    destructive: { backgroundColor: theme.colors.dangerSurface },
    disabled: { opacity: 0.4 },
    label: { textAlign: 'center' },
    disabledReason: { marginTop: spacing.xs, textAlign: 'center' },
  });
}
