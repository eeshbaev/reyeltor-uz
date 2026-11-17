import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { spacing, useTheme } from '@/lib/theme';

interface FilterSectionProps {
  title: string;
  hint?: string;
  children: ReactNode;
  first?: boolean;
}

export function FilterSection({ title, hint, children, first }: FilterSectionProps) {
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginTop: first ? 0 : spacing.lg,
          gap: spacing.sm,
        },
        card: {
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : theme.colors.surface,
          padding: spacing.md,
          gap: spacing.md,
        },
        titleRow: {
          gap: 2,
        },
        title: {
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        },
      }),
    [theme, first],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <AppText variant="micro" color="tertiary" style={styles.title}>
          {title}
        </AppText>
        {hint ? (
          <AppText variant="micro" color="secondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}
