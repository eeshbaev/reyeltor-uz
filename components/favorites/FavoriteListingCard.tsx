import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { ListingStatusOverlay } from '@/components/listing/ListingStatusOverlay';
import { AppText } from '@/components/ui/AppText';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { isDemoId } from '@/lib/demo';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { spacing } from '@/lib/design/spacing';
import { daysSince } from '@/lib/format';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { getListingCategory } from '@/lib/listing';
import { LISTING_PHOTO_PLACEHOLDER_SOURCE, listingPhotoPlaceholder, resolveListingPhotoSource } from '@/lib/listingPhotos';
import { getPhotoUrl } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { Listing, ListingPhoto } from '@/types';

interface FavoriteListingCardProps {
  listing: Listing & { listing_photos?: ListingPhoto[] };
  onPress: () => void;
  unavailable?: boolean;
}

export function FavoriteListingCard({ listing, onPress, unavailable }: FavoriteListingCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { formatPrice } = useFormatPrice();
  const press = useAnimatedPress(unavailable ? undefined : onPress);
  const category = getListingCategory(listing);
  const categoryColors = getCategoryColors(theme.scheme, category);

  const photo = useMemo(() => {
    const sorted = [...(listing.listing_photos ?? [])].sort((a, b) => a.order_index - b.order_index);
    return sorted[0];
  }, [listing.listing_photos]);

  const styles = useMemo(
    () => createStyles(theme, categoryColors.main, listing.is_featured),
    [theme, categoryColors.main, listing.is_featured],
  );

  const metaParts: string[] = [];
  if (listing.rooms > 0) metaParts.push(`${listing.rooms} ${t('common.rooms')}`);
  metaParts.push(`${listing.area_m2} ${t('common.area')}`);

  return (
    <Animated.View style={{ transform: [{ scale: press.scale }] }}>
      <Pressable
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={press.handlePress}
        disabled={unavailable}
        accessibilityRole="button"
        accessibilityLabel={t('favorites.viewListing', { district: listing.district })}
      >
        <View style={[styles.card, unavailable && styles.unavailable]}>
          <View style={styles.imageWrap}>
            <Image
              source={
                photo
                  ? resolveListingPhotoSource(photo.storage_path, getPhotoUrl(photo.storage_path))
                  : LISTING_PHOTO_PLACEHOLDER_SOURCE
              }
              style={styles.image}
              contentFit="cover"
              placeholder={listingPhotoPlaceholder(photo?.storage_path)}
              transition={220}
              cachePolicy="memory-disk"
            />
            <View style={styles.imageScrimTop} pointerEvents="none" />
            <View style={styles.imageScrimBottom} pointerEvents="none" />

            <View style={styles.topRow} pointerEvents="none">
              <View style={styles.topLeftBadges}>
                {isDemoId(listing.id) ? <DemoBadge /> : null}
                {listing.is_featured ? (
                  <View style={[styles.featuredPill, { backgroundColor: categoryColors.main }]}>
                    <AppText variant="micro" color="onAccent" style={styles.featuredText}>
                      {t('listing.featured')}
                    </AppText>
                  </View>
                ) : null}
                <ListingStatusOverlay listing={listing} size="compact" inline />
              </View>
              <View style={styles.savedBadge}>
                <Ionicons name="heart" size={14} color={theme.colors.error} />
              </View>
            </View>

            <View style={styles.heroCopy} pointerEvents="none">
              <AppText variant="h2" style={styles.heroPrice} numberOfLines={1}>
                {formatPrice(listing.price)}
              </AppText>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.9)" />
                <AppText variant="caption" style={styles.heroDistrict} numberOfLines={1}>
                  {listing.district}
                </AppText>
              </View>
            </View>

            {unavailable ? (
              <View style={styles.unavailableVeil} pointerEvents="none">
                <AppText variant="label" style={styles.unavailableLabel}>
                  {t('common.noLongerAvailable')}
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={styles.body}>
            <View style={styles.metaRow}>
              {metaParts.map((part) => (
                <View key={part} style={[styles.metaChip, { backgroundColor: theme.colors.accentSurface }]}>
                  <AppText variant="micro" color="accent" style={styles.metaChipText}>
                    {part}
                  </AppText>
                </View>
              ))}
            </View>
            <View style={styles.footerRow}>
              <AppText variant="caption" color="secondary">
                {t('listing.daysAgo', { days: daysSince(listing.posted_at) })}
              </AppText>
              <View style={[styles.ctaChip, { backgroundColor: theme.colors.surface }]}>
                <AppText variant="micro" color="accent" style={styles.ctaText}>
                  {t('favorites.viewDetails')}
                </AppText>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.accent} />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, accent: string, featured: boolean) {
  const shadowColor = featured ? accent : '#0F172A';

  return StyleSheet.create({
    card: {
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
      ...Platform.select({
        ios: {
          shadowColor,
          shadowOpacity: featured ? 0.2 : 0.1,
          shadowRadius: featured ? 18 : 14,
          shadowOffset: { width: 0, height: 8 },
        },
        android: { elevation: featured ? 6 : 4 },
        default: {
          boxShadow: featured
            ? `0 14px 36px ${accent}33`
            : '0 12px 32px rgba(15,23,42,0.1)',
        } as const,
      }),
    },
    unavailable: { opacity: 0.72 },
    imageWrap: {
      position: 'relative',
      width: '100%',
      aspectRatio: 16 / 10,
      backgroundColor: '#0b0f1a',
    },
    image: {
      ...StyleSheet.absoluteFillObject,
    },
    imageScrimTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 72,
      backgroundColor: 'rgba(8, 12, 24, 0.28)',
    },
    imageScrimBottom: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 120,
      backgroundColor: 'rgba(8, 12, 24, 0.72)',
    },
    topRow: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      right: spacing.sm,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      zIndex: 3,
    },
    topLeftBadges: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: spacing.xs,
      flex: 1,
      maxWidth: '72%',
    },
    featuredPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
    },
    featuredText: {
      fontWeight: '700',
      fontSize: 10,
      letterSpacing: 0.2,
    },
    savedBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.94)',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        },
        android: { elevation: 3 },
      }),
    },
    heroCopy: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      bottom: spacing.md,
      gap: 4,
      zIndex: 2,
    },
    heroPrice: {
      color: '#ffffff',
      fontWeight: '700',
      letterSpacing: -0.6,
      fontSize: 24,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    heroDistrict: {
      color: 'rgba(255,255,255,0.92)',
      flex: 1,
    },
    unavailableVeil: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      zIndex: 4,
    },
    unavailableLabel: {
      color: '#ffffff',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.45)',
      overflow: 'hidden',
    },
    body: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    metaChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: 999,
    },
    metaChipText: {
      fontWeight: '600',
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    ctaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingLeft: spacing.sm,
      paddingRight: spacing.xs,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    ctaText: {
      fontWeight: '600',
    },
  });
}
