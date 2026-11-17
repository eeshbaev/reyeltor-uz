import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { spacing } from '@/lib/design/spacing';
import { getListingStatusBadge } from '@/lib/listing';
import { useTheme } from '@/lib/theme';
import type { ListingCategory } from '@/types';
import type { Listing } from '@/types';

interface ListingStatusOverlayProps {
  listing: Pick<Listing, 'type' | 'status' | 'archived_reason'>;
  position?: 'left' | 'right';
  size?: 'default' | 'compact';
  /** Flow layout for detail screens (not absolutely positioned over media). */
  inline?: boolean;
}

export function ListingStatusOverlay({
  listing,
  position = 'right',
  size = 'default',
  inline = false,
}: ListingStatusOverlayProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { labelKey, variant } = getListingStatusBadge(listing);
  const category: ListingCategory = listing.type === 'lease' ? 'commercial' : 'residential';
  const categoryColors = getCategoryColors(theme.scheme, category);
  const colors = useMemo(() => createVariantColors(theme, categoryColors), [theme, categoryColors]);
  const palette = colors[variant] ?? colors.default;

  const compact = size === 'compact';

  return (
    <View
      style={[
        styles.wrap,
        inline ? styles.wrapInline : null,
        compact && !inline ? styles.wrapCompact : null,
        !inline && (position === 'left' ? styles.left : styles.right),
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.pill,
          compact ? styles.pillCompact : null,
          { backgroundColor: palette.bg, borderColor: palette.border },
        ]}
      >
        <AppText
          variant={compact ? 'micro' : 'caption'}
          style={[styles.label, compact ? styles.labelCompact : null, { color: palette.text }]}
        >
          {t(labelKey)}
        </AppText>
      </View>
    </View>
  );
}

function createVariantColors(theme: ReturnType<typeof useTheme>, categoryColors: ReturnType<typeof getCategoryColors>) {
  return {
    default: { bg: theme.colors.surfaceElevated, text: theme.colors.secondary, border: theme.colors.border },
    rent: { bg: categoryColors.main, text: categoryColors.onMain, border: categoryColors.main },
    buy: { bg: theme.colors.soldText, text: '#ffffff', border: theme.colors.soldText },
    warning: { bg: categoryColors.main, text: categoryColors.onMain, border: categoryColors.main },
    sold: { bg: theme.colors.soldText, text: '#ffffff', border: theme.colors.soldText },
    expired: { bg: theme.colors.surfaceElevated, text: theme.colors.tertiary, border: theme.colors.borderStrong },
    danger: { bg: theme.colors.danger, text: '#ffffff', border: theme.colors.danger },
    success: { bg: theme.colors.success, text: '#ffffff', border: theme.colors.success },
    active: { bg: theme.colors.success, text: '#ffffff', border: theme.colors.success },
    expiring: { bg: theme.colors.warning, text: '#ffffff', border: theme.colors.warning },
  };
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.sm,
    zIndex: 3,
  },
  wrapCompact: {
    top: spacing.xs,
  },
  wrapInline: {
    position: 'relative',
    top: 0,
    alignSelf: 'flex-start',
  },
  left: { left: spacing.sm },
  right: { right: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 999,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 4 },
    }),
  },
  pillCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    ...Platform.select({
      ios: { shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  label: { fontWeight: '700', letterSpacing: 0.15 },
  labelCompact: { fontSize: 10, letterSpacing: 0.1 },
});
