import { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'rent' | 'buy' | 'danger' | 'active' | 'expiring' | 'sold' | 'expired';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const theme = useTheme();
  const styles = useMemo(() => createVariantStyles(theme), [theme]);
  const v = styles[variant] ?? styles.default;

  return (
    <View style={[badgeStyles.badge, { backgroundColor: v.bg }, style]}>
      <AppText variant="micro" style={{ color: v.text }}>
        {label}
      </AppText>
    </View>
  );
}

function createVariantStyles(theme: ReturnType<typeof useTheme>) {
  return {
    default: { bg: theme.colors.surface, text: theme.colors.secondary },
    success: { bg: theme.colors.successSurface, text: theme.colors.success },
    warning: { bg: theme.colors.warningSurface, text: theme.colors.warning },
    danger: { bg: theme.colors.dangerSurface, text: theme.colors.danger },
    rent: { bg: theme.colors.accentSurface, text: theme.colors.accent },
    buy: { bg: theme.colors.soldSurface, text: theme.colors.soldText },
    active: { bg: theme.colors.successSurface, text: theme.colors.success },
    expiring: { bg: theme.colors.warningSurface, text: theme.colors.warning },
    sold: { bg: theme.colors.soldSurface, text: theme.colors.soldText },
    expired: { bg: theme.colors.surface, text: theme.colors.tertiary },
  };
}

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});
