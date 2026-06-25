import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { fontSize, spacing, useTheme } from '@/lib/theme';

export function useFilterFieldStyles() {
  const theme = useTheme();

  return useMemo(
    () =>
      StyleSheet.create({
        label: {
          fontSize: fontSize.sm,
          fontWeight: '600',
          color: theme.colors.secondary,
          marginTop: spacing.md,
          marginBottom: spacing.sm,
        },
        row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        pill: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceElevated,
        },
        pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
        pillText: { color: theme.colors.primary, fontWeight: '600', fontSize: fontSize.sm },
        pillTextActive: { color: theme.colors.onAccent },
        input: {
          flex: 1,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 8,
          padding: spacing.sm,
          fontSize: fontSize.md,
          minWidth: 120,
          backgroundColor: theme.colors.surfaceElevated,
          color: theme.colors.primary,
        },
        textArea: {
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 8,
          padding: spacing.sm,
          fontSize: fontSize.md,
          minHeight: 44,
          backgroundColor: theme.colors.surfaceElevated,
          color: theme.colors.primary,
        },
        districtGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
        districtPill: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceElevated,
        },
        districtText: { fontSize: fontSize.xs, color: theme.colors.primary },
      }),
    [theme],
  );
}
