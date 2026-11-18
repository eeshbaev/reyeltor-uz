import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { hapticLight } from '@/lib/haptics';
import { spacing, useTheme } from '@/lib/theme';

interface FilterStepperProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  max?: number;
  showLabel?: boolean;
  embedded?: boolean;
}

export function FilterStepper({
  label,
  value,
  onChange,
  max = 10,
  showLabel = true,
  embedded = false,
}: FilterStepperProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const display = value == null ? t('filters.any') : String(value);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { gap: spacing.sm },
        label: {
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: embedded ? 0 : 14,
          borderWidth: embedded ? 0 : StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          backgroundColor: embedded
            ? 'transparent'
            : theme.isDark
              ? 'rgba(255,255,255,0.04)'
              : theme.colors.surfaceElevated,
          paddingHorizontal: embedded ? 0 : spacing.sm,
          paddingVertical: embedded ? 0 : spacing.xs,
          minHeight: embedded ? 44 : 52,
        },
        btn: {
          width: 40,
          height: 40,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
        },
        value: {
          minWidth: 72,
          textAlign: 'center',
          fontWeight: '700',
        },
      }),
    [embedded, theme],
  );

  const stepDown = () => {
    hapticLight();
    if (value == null) return;
    if (value <= 1) onChange(null);
    else onChange(value - 1);
  };

  const stepUp = () => {
    hapticLight();
    if (value == null) onChange(1);
    else if (value < max) onChange(value + 1);
  };

  return (
    <View style={styles.wrap}>
      {showLabel ? (
        <AppText variant="micro" color="tertiary" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={stepDown} hitSlop={6}>
          <Ionicons name="remove" size={18} color={theme.colors.primary} />
        </Pressable>
        <AppText variant="label" style={styles.value}>
          {display}
        </AppText>
        <Pressable style={styles.btn} onPress={stepUp} hitSlop={6}>
          <Ionicons name="add" size={18} color={theme.colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}
