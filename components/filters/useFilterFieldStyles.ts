import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { radius } from '@/lib/design/radius';
import { typeSize } from '@/lib/design/typography';
import { spacing, useTheme } from '@/lib/theme';

export function useFilterFieldStyles() {
  const theme = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        textArea: {
          minHeight: 52,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: typeSize.input,
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : theme.colors.surfaceElevated,
          color: theme.colors.primary,
        },
      }),
    [theme],
  );
}
