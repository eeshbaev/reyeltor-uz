import { memo, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, StyleSheet, TouchableOpacity, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { FreshnessLabel } from '@/components/listing/FreshnessLabel';
import { ListingCarousel } from '@/components/listing/ListingCarousel';
import { ListingFavoriteButton } from '@/components/listing/ListingFavoriteButton';
import { ListingStatusOverlay } from '@/components/listing/ListingStatusOverlay';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { isDemoId } from '@/lib/demo';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { fixedColors } from '@/lib/design/colors';
import { mapElevatedShadow } from '@/lib/design/mapChrome';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { daysSince } from '@/lib/format';
import { createHorizontalSwipeGesture } from '@/lib/gestures';
import {
  fetchListingEngagement,
  shouldShowPriceDropBadge,
  shouldShowSaveBadge,
} from '@/lib/growth/listingEngagement';
import { hapticMedium } from '@/lib/haptics';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { getListingCategory } from '@/lib/listing';
import { COMPACT_LISTING_PHOTO_HEIGHT, LISTING_PHOTO_PLACEHOLDER_SOURCE, MAP_LISTING_PHOTO_HEIGHT, listingPhotoPlaceholder, resolveListingPhotoSource } from '@/lib/listingPhotos';
import { getOptimizedImageUrl } from '@/lib/network/imagePreloader';
import { getPhotoUrl } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { ListingWithPhotos } from '@/types';

interface ListingCardProps {
  // FIX #2: Use proper ListingWithPhotos type for better type safety
  listing: ListingWithPhotos;
  onPress: () => void;
  onOpenDetail?: () => void;
  unavailable?: boolean;
  showSwipeHint?: boolean;
  onSwipeHintDismiss?: () => void;
  variant?: 'default' | 'compact';
  width?: number;
  enableSwipe?: boolean;
  style?: StyleProp<ViewStyle>;
}

function ListingCardComponent({
  listing,
  onPress,
  onOpenDetail: _onOpenDetail,
  unavailable,
  showSwipeHint,
  onSwipeHintDismiss,
  variant = 'default',
  width,
  enableSwipe = true,
  style,
}: ListingCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { formatPrice } = useFormatPrice();
  // FIX #5: Add defensive sorting for undefined order_index
  const photos = useMemo(
    () => {
      const photoArray = listing.listing_photos ?? [];
      if (photoArray.length === 0) return [];
      return [...photoArray].sort((a, b) => {
        const orderA = a.order_index ?? 0;
        const orderB = b.order_index ?? 0;
        return orderA - orderB;
      });
    },
    [listing.listing_photos],
  );
  const compact = variant === 'compact';
  const mapCard = compact && width != null;
  const [priceDropPercent, setPriceDropPercent] = useState<number | null>(null);
  const [saveCount, setSaveCount] = useState(0);

  useEffect(() => {
    if (unavailable || mapCard) return;
    let cancelled = false;
    void fetchListingEngagement(listing.id).then((engagement) => {
      if (cancelled || !engagement) return;
      setPriceDropPercent(engagement.priceDropPercent);
      setSaveCount(engagement.saveCount);
    });
    return () => {
      cancelled = true;
    };
  }, [listing.id, mapCard, unavailable]);

  const showPriceDrop = shouldShowPriceDropBadge(priceDropPercent);
  const showSaveCount = shouldShowSaveBadge(saveCount);
  const category = getListingCategory(listing);
  const categoryColors = getCategoryColors(theme.scheme, category);

  const styles = useMemo(
    () => createStyles(theme, compact, categoryColors.main, mapCard),
    [theme, compact, categoryColors.main, mapCard],
  );

  const pan = createHorizontalSwipeGesture((translationX) => {
    if (translationX < -60 || translationX > 60) {
      hapticMedium();
    }
  });

  const photoHeight = mapCard ? MAP_LISTING_PHOTO_HEIGHT : COMPACT_LISTING_PHOTO_HEIGHT;
  const mapMeta = useMemo(() => {
    if (!mapCard) return null;
    const parts: string[] = [];
    if (listing.rooms > 0) parts.push(`${listing.rooms} ${t('common.rooms')}`);
    parts.push(`${listing.area_m2} ${t('common.area')}`);
    return parts.join(' · ');
  }, [listing.area_m2, listing.rooms, mapCard, t]);

  const cardStyle = [
    styles.card,
    width != null ? { width } : null,
    unavailable && styles.unavailable,
    listing.is_featured && styles.featured,
    style,
  ];

  const imageSection = (
    <View
      style={[
        styles.imageWrap,
        mapCard && width != null ? { width, height: photoHeight } : null,
        !mapCard && compact ? { height: COMPACT_LISTING_PHOTO_HEIGHT } : null,
        !mapCard && !compact ? styles.defaultImageWrap : null,
        mapCard
          ? {
              borderWidth: listing.is_featured ? 1.5 : StyleSheet.hairlineWidth,
              borderColor: listing.is_featured
                ? categoryColors.main
                : theme.isDark
                  ? 'rgba(255,255,255,0.14)'
                  : 'rgba(15,23,42,0.08)',
            }
          : null,
      ]}
    >
      {mapCard ? (
        photos.length > 1 ? (
          <ListingCarousel
            photos={photos}
            width={width}
            height={photoHeight}
            pagination="none"
            scrollEnabled={false}
          />
        ) : (
          <ListingCardPhoto
            source={
              photos.length > 0
                ? listingPhotoSource(photos[0].storage_path, width ?? 300, photoHeight)
                : LISTING_PHOTO_PLACEHOLDER_SOURCE
            }
            storagePath={photos[0]?.storage_path}
            style={{ width: width ?? '100%', height: photoHeight }}
          />
        )
      ) : compact && photos.length > 1 ? (
        <ListingCarousel
          photos={photos}
          width={width}
          height={COMPACT_LISTING_PHOTO_HEIGHT}
          pagination="overlay"
        />
      ) : compact ? (
        <ListingCardPhoto
          source={
            photos.length > 0
              ? listingPhotoSource(photos[0].storage_path, width ?? 400, COMPACT_LISTING_PHOTO_HEIGHT)
              : LISTING_PHOTO_PLACEHOLDER_SOURCE
          }
          storagePath={photos[0]?.storage_path}
          style={{ width: width ?? '100%', height: COMPACT_LISTING_PHOTO_HEIGHT }}
        />
      ) : (
        <ListingCardPhoto
          source={
            photos.length > 0
              ? listingPhotoSource(photos[0].storage_path, 400, 300)
              : LISTING_PHOTO_PLACEHOLDER_SOURCE
          }
          storagePath={photos[0]?.storage_path}
          fill
        />
      )}
      {mapCard ? (
        <View style={styles.mapTopBadges} pointerEvents="none">
          {showPriceDrop ? (
            <View style={[styles.socialBadge, { backgroundColor: theme.colors.success }]}>
              <AppText variant="micro" color="onAccent" style={styles.featuredBadgeText}>
                ↓{priceDropPercent}%
              </AppText>
            </View>
          ) : null}
          {showSaveCount ? (
            <View style={[styles.socialBadge, { backgroundColor: 'rgba(15,23,42,0.72)' }]}>
              <AppText variant="micro" style={styles.saveBadgeText}>
                {t('growth.savedShort', { count: saveCount })}
              </AppText>
            </View>
          ) : null}
          {isDemoId(listing.id) ? <DemoBadge /> : null}
          {listing.is_featured ? (
            <View style={[styles.featuredBadgeInline, { backgroundColor: categoryColors.main }]}>
              <AppText variant="micro" color="onAccent" style={styles.featuredBadgeText}>
                {t('listing.featured')}
              </AppText>
            </View>
          ) : null}
          <ListingStatusOverlay listing={listing} size="compact" inline />
        </View>
      ) : (
        <View style={styles.imageTopBadges} pointerEvents="none">
          {showPriceDrop ? (
            <View style={[styles.socialBadge, { backgroundColor: theme.colors.success }]}>
              <AppText variant="micro" color="onAccent" style={styles.featuredBadgeText}>
                ↓{priceDropPercent}%
              </AppText>
            </View>
          ) : null}
          {showSaveCount ? (
            <View style={[styles.socialBadge, { backgroundColor: theme.colors.accent }]}>
              <AppText variant="micro" color="onAccent" style={styles.featuredBadgeText}>
                {t('growth.savedShort', { count: saveCount })}
              </AppText>
            </View>
          ) : null}
          {isDemoId(listing.id) ? <DemoBadge /> : null}
          {listing.is_featured ? (
            <View style={[styles.featuredBadgeInline, { backgroundColor: categoryColors.main }]}>
              <AppText variant="micro" color="onAccent" style={styles.featuredBadgeText}>
                {t('listing.featured')}
              </AppText>
            </View>
          ) : null}
          <ListingStatusOverlay listing={listing} size={compact ? 'compact' : 'default'} inline />
        </View>
      )}
      {!unavailable ? (
        <ListingFavoriteButton listingId={listing.id} variant="overlay" gestureHandler={mapCard} />
      ) : null}
      {mapCard ? (
        <>
          <View style={styles.imageScrim} pointerEvents="none" />
          <View style={styles.mapFooter} pointerEvents="none">
            <AppText variant="label" style={styles.mapPrice} numberOfLines={1}>
              {formatPrice(listing.price)}
            </AppText>
            {mapMeta ? (
              <AppText variant="micro" style={styles.mapMeta} numberOfLines={1}>
                {mapMeta}
              </AppText>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );

  if (mapCard) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.92}
        disabled={unavailable}
      >
        {imageSection}
      </TouchableOpacity>
    );
  }

  const card = (
    <Pressable
      style={cardStyle}
      onPress={onPress}
      disabled={unavailable}
      android_ripple={{ color: theme.colors.borderStrong }}
    >
      {imageSection}
      {mapCard ? null : (
      <View style={styles.content}>
        {unavailable ? (
          <AppText variant="caption" color="danger">
            {t('common.noLongerAvailable')}
          </AppText>
        ) : null}
        <AppText variant={compact ? 'label' : 'h3'} style={compact ? styles.compactPrice : undefined}>
          {formatPrice(listing.price)}
        </AppText>
        <View style={styles.pills}>
          {listing.rooms > 0 ? (
            <Badge label={`${listing.rooms} ${t('common.rooms')}`} variant="default" />
          ) : null}
          <Badge label={`${listing.area_m2} ${t('common.area')}`} variant="default" />
        </View>
        {!mapCard ? (
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {listing.district} · {t('listing.daysAgo', { days: daysSince(listing.posted_at) })}
          </AppText>
        ) : null}
        {!mapCard ? <FreshnessLabel listing={listing} compact /> : null}
      </View>
      )}
      {showSwipeHint && !mapCard ? (
        <Animated.View style={styles.swipeHint}>
          <AppText variant="micro" color="accent" onPress={onSwipeHintDismiss}>
            ← {t('favorites.swipeHint')}
          </AppText>
        </Animated.View>
      ) : null}
    </Pressable>
  );

  if (!enableSwipe) return card;

  return <GestureDetector gesture={pan}>{card}</GestureDetector>;
}

/**
 * Memoized ListingCard component
 * Prevents unnecessary re-renders when parent list updates
 */
export const ListingCard = memo(ListingCardComponent);

function listingPhotoSource(storagePath: string, width: number, height: number) {
  const remote = getOptimizedImageUrl(getPhotoUrl(storagePath), width, height);
  return resolveListingPhotoSource(storagePath, remote);
}

function ListingCardPhoto({
  source,
  storagePath,
  style,
  fill = false,
}: {
  source: import('expo-image').ImageSource;
  storagePath?: string;
  style?: StyleProp<ImageStyle>;
  fill?: boolean;
}) {
  const [useFallback, setUseFallback] = useState(false);
  const placeholder = listingPhotoPlaceholder(storagePath);
  const resolvedSource = useFallback ? placeholder : source;

  return (
    <Image
      source={resolvedSource}
      style={fill ? StyleSheet.absoluteFill : style}
      contentFit="cover"
      placeholder={placeholder}
      transition={200}
      cachePolicy="memory-disk"
      onError={() => setUseFallback(true)}
    />
  );
}

function createStyles(
  theme: ReturnType<typeof useTheme>,
  compact: boolean,
  featuredColor: string,
  mapCard: boolean,
) {
  return StyleSheet.create({
    card: {
      backgroundColor: mapCard ? 'transparent' : theme.colors.surfaceElevated,
      borderRadius: mapCard ? 14 : 12,
      overflow: mapCard ? 'visible' : 'hidden',
      marginBottom: compact ? 0 : spacing.md,
      borderWidth: mapCard ? 0 : 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
      ...(mapCard ? null : Platform.select({
        ios: { shadowColor: fixedColors.slate900, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
        android: { elevation: 4 },
      })),
    },
    featured: {
      borderColor: featuredColor,
      borderWidth: mapCard ? 0 : 1.5,
      ...(mapCard
        ? null
        : Platform.select({
            ios: { shadowColor: featuredColor, shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 6 },
          })),
    },
    unavailable: { opacity: 0.5 },
    imageWrap: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: fixedColors.night,
      ...(mapCard ? { borderRadius: radius.md, ...mapElevatedShadow(theme) } : null),
    },
    defaultImageWrap: {
      width: '100%',
      aspectRatio: 16 / 9,
    },
    imageScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: mapCard ? 55 : 56,
      backgroundColor: mapCard ? 'rgba(15, 23, 42, 0.62)' : 'rgba(15, 23, 42, 0.18)',
    },
    mapFooter: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
      paddingTop: spacing.xs,
      gap: 2,
      zIndex: 2,
    },
    mapPrice: {
      color: fixedColors.white,
      fontWeight: '700',
      fontSize: 16,
      letterSpacing: -0.3,
    },
    mapMeta: {
      color: 'rgba(255,255,255,0.88)',
      fontWeight: '500',
      fontSize: 12,
    },
    featuredBadgeInline: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
    },
    imageTopBadges: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      zIndex: 3,
      alignItems: 'flex-start',
      gap: spacing.xs,
      maxWidth: '72%',
    },
    mapTopBadges: {
      position: 'absolute',
      top: spacing.xs,
      left: spacing.xs,
      zIndex: 3,
      alignItems: 'flex-start',
      gap: spacing.xs,
      maxWidth: '58%',
    },
    featuredBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    socialBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
    },
    saveBadgeText: {
      color: fixedColors.white,
      fontSize: 10,
      fontWeight: '700',
    },
    content: {
      padding: compact ? spacing.md : spacing.md,
      gap: compact ? spacing.xs + 2 : spacing.sm,
      backgroundColor: theme.isDark ? theme.colors.surfaceElevated : theme.colors.surfaceElevated,
    },
    compactPrice: { fontWeight: '700', fontSize: 18, letterSpacing: -0.4 },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    swipeHint: {
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      backgroundColor: theme.colors.accentSurface,
    },
  });
}
