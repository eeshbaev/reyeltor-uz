import { useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { spacing, useTheme } from '@/lib/theme';

interface FilterRangeInputProps {
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  minPlaceholder: string;
  maxPlaceholder: string;
  keyboardType?: 'numeric' | 'default';
  minHint?: string | null;
  maxHint?: string | null;
}

export function FilterRangeInput({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder,
  maxPlaceholder,
  keyboardType = 'numeric',
  minHint,
  maxHint,
}: FilterRangeInputProps) {
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.sm,
        },
        field: { flex: 1, gap: 4 },
        input: {
          minHeight: 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: 16,
          fontWeight: '500',
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : theme.colors.surfaceElevated,
          color: theme.colors.primary,
        },
        divider: {
          width: 10,
          height: 1,
          backgroundColor: theme.colors.borderStrong,
          marginTop: 24,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          placeholder={minPlaceholder}
          placeholderTextColor={theme.colors.tertiary}
          keyboardType={keyboardType}
          value={minValue}
          onChangeText={onMinChange}
        />
        {minHint ? (
          <AppText variant="micro" color="secondary">
            {minHint}
          </AppText>
        ) : null}
      </View>
      <View style={styles.divider} />
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          placeholder={maxPlaceholder}
          placeholderTextColor={theme.colors.tertiary}
          keyboardType={keyboardType}
          value={maxValue}
          onChangeText={onMaxChange}
        />
        {maxHint ? (
          <AppText variant="micro" color="secondary">
            {maxHint}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
