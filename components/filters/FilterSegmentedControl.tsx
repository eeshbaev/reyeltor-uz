import { useMemo } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { hapticLight } from '@/lib/haptics';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { spacing, useTheme } from '@/lib/theme';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface FilterSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  allowDeselect?: boolean;
  activeColor?: string;
  activeTextColor?: string;
}

function SegmentButton({
  label,
  active,
  onPress,
  activeColor,
  activeTextColor,
  flex,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  activeColor: string;
  activeTextColor: string;
  flex: number;
}) {
  const theme = useTheme();
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);

  return (
    <Pressable style={{ flex }} onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress}>
      <Animated.View
        style={[
          {
            flex: 1,
            minHeight: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.sm,
            backgroundColor: active ? activeColor : 'transparent',
            transform: [{ scale }],
          },
        ]}
      >
        <AppText
          variant="label"
          style={{
            fontWeight: '600',
            color: active ? activeTextColor : theme.colors.secondary,
          }}
        >
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

export function FilterSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  allowDeselect = true,
  activeColor,
  activeTextColor,
}: FilterSegmentedControlProps<T>) {
  const theme = useTheme();
  const accent = activeColor ?? theme.colors.accent;
  const onAccent = activeTextColor ?? theme.colors.onAccent;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        track: {
          flexDirection: 'row',
          borderRadius: 14,
          padding: 3,
          gap: 3,
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.track}>
      {options.map((option) => (
        <SegmentButton
          key={option.value}
          label={option.label}
          active={value === option.value}
          flex={1}
          activeColor={accent}
          activeTextColor={onAccent}
          onPress={() => {
            hapticLight();
            if (allowDeselect && value === option.value) onChange(null);
            else onChange(option.value);
          }}
        />
      ))}
    </View>
  );
}
