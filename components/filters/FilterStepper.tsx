import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontSize, spacing, useTheme } from '@/lib/theme';

interface FilterStepperProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  max?: number;
}

export function FilterStepper({ label, value, onChange, max = 10 }: FilterStepperProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const display = value == null ? t('filters.any') : String(value);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginTop: spacing.md },
        label: { fontSize: fontSize.sm, fontWeight: '600', color: theme.colors.secondary, marginBottom: spacing.sm },
        row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        btn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceElevated,
        },
        btnText: { fontSize: fontSize.lg, fontWeight: '700', color: theme.colors.primary },
        value: {
          minWidth: 48,
          textAlign: 'center',
          fontSize: fontSize.md,
          fontWeight: '700',
          color: theme.colors.primary,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          style={styles.btn}
          onPress={() => {
            if (value == null) return;
            if (value <= 1) onChange(null);
            else onChange(value - 1);
          }}
        >
          <Text style={styles.btnText}>−</Text>
        </Pressable>
        <Text style={styles.value}>{display}</Text>
        <Pressable
          style={styles.btn}
          onPress={() => {
            if (value == null) onChange(1);
            else if (value < max) onChange(value + 1);
          }}
        >
          <Text style={styles.btnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
