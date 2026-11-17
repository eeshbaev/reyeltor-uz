import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { spacing, useTheme } from '@/lib/theme';

export function useFilterFieldStyles() {
  const theme = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        textArea: {
          minHeight: 52,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: 16,
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : theme.colors.surfaceElevated,
          color: theme.colors.primary,
        },
      }),
    [theme],
  );
}
