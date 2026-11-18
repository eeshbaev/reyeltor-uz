import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { ReyeltorCoin } from '@/components/brand/ReyeltorCoin';
import { FreshnessLabel } from '@/components/listing/FreshnessLabel';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { daysUntil } from '@/lib/format';
import { needsAvailabilityCheck } from '@/lib/freshness';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { getListingCategory, getListingStatusBadge } from '@/lib/listing';
import { LISTING_PHOTO_PLACEHOLDER_SOURCE, resolveListingPhotoSource } from '@/lib/listingPhotos';
import { getPhotoUrl } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { ListingWithPhotos } from '@/types';

interface MyListingCardProps {
  listing: ListingWithPhotos;
  variant: 'active' | 'archived';
  reactivateCost?: number;
  canReactivate?: boolean;
  onPress: () => void;
  onManage?: () => void;
  onReactivate?: () => void;
  onPerformance?: () => void;
  onShareCard?: () => void;
  /** One-tap "still available" confirmation (shown when the last confirmation is a week old). */
  onConfirmAvailable?: () => void;
  confirming?: boolean;
  onUpdatePrice?: () => void;
}

export function MyListingCard({
  listing,
  variant,
  reactivateCost,
  canReactivate = true,
  onPress,
  onManage,
  onReactivate,
  onPerformance,
  onShareCard,
  onConfirmAvailable,
  confirming = false,
  onUpdatePrice,
}: MyListingCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { formatPrice } = useFormatPrice();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const photo = [...(listing.listing_photos ?? [])].sort((a, b) => a.order_index - b.order_index)[0];
  const imageSource = photo
    ? resolveListingPhotoSource(photo.storage_path, getPhotoUrl(photo.storage_path))
    : LISTING_PHOTO_PLACEHOLDER_SOURCE;
  const category = getListingCategory(listing);
  const categoryColors = getCategoryColors(theme.scheme, category);
  const statusBadge = getListingStatusBadge(listing);
  const daysLeft =
    variant === 'active'
      ? daysUntil(listing.expires_at)
      : listing.deletes_at
        ? daysUntil(listing.deletes_at)
        : null;

  return (
    <View style={styles.card}>
      <Pressable onPress={onPress} style={styles.imageWrap} android_ripple={{ color: theme.colors.borderStrong }}>
        <Image source={imageSource} style={styles.image} contentFit="cover" transition={200} />
        <View style={[styles.imageOverlay, variant === 'archived' && styles.imageArchived]} />
        <View style={styles.badges}>
          <Badge label={t(statusBadge.labelKey)} variant={statusBadge.variant} />
        </View>
        {listing.is_featured ? (
          <View style={[styles.featured, { backgroundColor: categoryColors.main }]}>
            <Ionicons name="star" size={12} color={fixedColors.white} />
          </View>
        ) : null}
      </Pressable>

      <View style={styles.body}>
        <AppText variant="h3" style={styles.price}>
          {formatPrice(listing.price)}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.meta}>
          {listing.rooms} {t('common.rooms')} · {listing.district}
        </AppText>

        <View style={styles.statsRow}>
          <StatChip icon="eye-outline" label={t('listing.views', { count: listing.view_count })} />
          {daysLeft != null ? (
            <StatChip
              icon={variant === 'active' ? 'time-outline' : 'trash-outline'}
              label={
                variant === 'active'
                  ? t('profile.expiresInDays', { days: daysLeft })
                  : t('listing.daysUntilDeletion', { days: daysLeft })
              }
              tone={daysLeft <= 14 ? 'warning' : 'default'}
            />
          ) : null}
        </View>

        {variant === 'active' ? <FreshnessLabel listing={listing} /> : null}

        {variant === 'active' && onConfirmAvailable && needsAvailabilityCheck(listing) ? (
          <View style={[styles.checkBox, { backgroundColor: theme.colors.accentSurface }]}>
            <AppText variant="label">{t('freshness.promptTitle')}</AppText>
            <View style={styles.checkActions}>
              <Pressable
                style={[styles.checkBtn, { backgroundColor: theme.colors.accent }]}
                onPress={onConfirmAvailable}
                disabled={confirming}
                accessibilityRole="button"
              >
                <AppText variant="label" color="onAccent">
                  {confirming ? '…' : t('freshness.confirmYes')}
                </AppText>
              </Pressable>
              {onUpdatePrice ? (
                <Pressable
                  style={[styles.checkBtn, { borderColor: theme.colors.border, borderWidth: 1 }]}
                  onPress={onUpdatePrice}
                  accessibilityRole="button"
                >
                  <AppText variant="label">{t('priceUpdate.short')}</AppText>
                </Pressable>
              ) : null}
              {onManage ? (
                <Pressable
                  style={[styles.checkBtn, { borderColor: theme.colors.border, borderWidth: 1 }]}
                  onPress={onManage}
                  accessibilityRole="button"
                >
                  <AppText variant="label">{t('freshness.confirmNo')}</AppText>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {variant === 'active' ? (
          <View style={styles.actions}>
            <Pressable style={[styles.actionBtn, styles.actionPrimary]} onPress={onPress}>
              <AppText variant="label" color="accent">
                {t('profile.viewListing')}
              </AppText>
            </Pressable>
            {onPerformance ? (
              <Pressable
                style={[styles.actionBtn, styles.actionIcon]}
                onPress={onPerformance}
                accessibilityLabel={t('sellerTools.performanceTitle')}
              >
                <Ionicons name="stats-chart-outline" size={18} color={theme.colors.accent} />
              </Pressable>
            ) : null}
            {onUpdatePrice ? (
              <Pressable
                style={[styles.actionBtn, styles.actionIcon]}
                onPress={onUpdatePrice}
                accessibilityLabel={t('priceUpdate.title')}
              >
                <Ionicons name="pricetag-outline" size={18} color={theme.colors.accent} />
              </Pressable>
            ) : null}
            {onShareCard ? (
              <Pressable
                style={[styles.actionBtn, styles.actionIcon]}
                onPress={onShareCard}
                accessibilityLabel={t('sellerTools.shareCardTitle')}
              >
                <Ionicons name="share-social-outline" size={18} color={theme.colors.accent} />
              </Pressable>
            ) : null}
            {onManage ? (
              <Pressable style={[styles.actionBtn, styles.actionIcon]} onPress={onManage}>
                <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.secondary} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Pressable
            style={[styles.reactivateBtn, !canReactivate && styles.reactivateDisabled]}
            onPress={onReactivate}
            disabled={!canReactivate}
          >
            <AppText variant="label" color={canReactivate ? 'onAccent' : 'tertiary'}>
              {reactivateCost && reactivateCost > 0
                ? t('listing.reactivateCost', { cost: reactivateCost })
                : t('listing.reactivate')}
            </AppText>
            {reactivateCost && reactivateCost > 0 && canReactivate ? (
              <ReyeltorCoin size="xs" />
            ) : null}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function StatChip({
  icon,
  label,
  tone = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: 'default' | 'warning';
}) {
  const theme = useTheme();
  const color = tone === 'warning' ? theme.colors.warning : theme.colors.secondary;
  const bg = tone === 'warning' ? theme.colors.warningSurface : theme.colors.surface;

  return (
    <View style={[statStyles.chip, { backgroundColor: bg, borderColor: theme.colors.border }]}>
      <Ionicons name={icon} size={13} color={color} />
      <AppText variant="micro" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}

const statStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: spacing.md,
    },
    imageWrap: {
      height: 168,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'transparent',
    },
    imageArchived: {
      backgroundColor: theme.isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.15)',
    },
    badges: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
    },
    featured: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      padding: spacing.md,
      gap: spacing.xs,
    },
    price: {
      letterSpacing: -0.3,
    },
    meta: {
      marginBottom: spacing.xs,
    },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    checkBox: { borderRadius: radius.md, padding: spacing.sm, gap: spacing.sm, marginTop: spacing.sm },
    checkActions: { flexDirection: 'row', gap: spacing.sm },
    checkBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm },
    actionBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    actionPrimary: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSurface,
    },
    actionIcon: {
      flex: 0,
      width: 48,
    },
    reactivateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.sm,
      backgroundColor: theme.colors.accent,
    },
    reactivateDisabled: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  });
}
