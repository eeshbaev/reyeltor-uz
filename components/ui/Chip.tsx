import { useMemo } from 'react';
import { Animated, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  activeColor?: string;
  activeTextColor?: string;
  compact?: boolean;
  style?: ViewStyle;
}

export function Chip({
  label,
  selected = false,
  onPress,
  activeColor,
  activeTextColor,
  compact = false,
  style,
}: ChipProps) {
  const theme = useTheme();
  const accent = activeColor ?? theme.colors.accent;
  const onAccent = activeTextColor ?? theme.colors.onAccent;
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          paddingHorizontal: compact ? spacing.sm : spacing.md,
          paddingVertical: compact ? spacing.sm : 10,
          borderRadius: compact ? radius.md : radius.pill,
          borderWidth: 1,
          borderColor: selected ? accent : theme.colors.border,
          backgroundColor: selected
            ? accent
            : theme.isDark
              ? 'rgba(255,255,255,0.04)'
              : theme.colors.surface,
          minWidth: compact ? 40 : undefined,
          minHeight: compact ? 40 : undefined,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [accent, compact, selected, theme],
  );

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress}>
      <Animated.View style={[styles.chip, style, { transform: [{ scale }] }]}>
        <AppText variant="caption" style={{ fontWeight: '600', color: selected ? onAccent : theme.colors.primary }}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}
