import { Image } from 'expo-image';
import { hapticMedium } from '@/lib/haptics';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { ListingCarousel } from '@/components/listing/ListingCarousel';
import { ListingStatusOverlay } from '@/components/listing/ListingStatusOverlay';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { createHorizontalSwipeGesture } from '@/lib/gestures';
import { daysSince } from '@/lib/format';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { getListingCategory } from '@/lib/listing';
import { COMPACT_LISTING_PHOTO_HEIGHT, LISTING_PHOTO_PLACEHOLDER } from '@/lib/listingPhotos';
import { spacing } from '@/lib/design/spacing';
import { getPhotoUrl } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { Listing, ListingPhoto } from '@/types';

interface ListingCardProps {
  listing: Listing & { listing_photos?: ListingPhoto[] };
  onPress: () => void;
  unavailable?: boolean;
  showSwipeHint?: boolean;
  onSwipeHintDismiss?: () => void;
  variant?: 'default' | 'compact';
  width?: number;
  enableSwipe?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ListingCard({
  listing,
  onPress,
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
  const photos = useMemo(
    () => [...(listing.listing_photos ?? [])].sort((a, b) => a.order_index - b.order_index),
    [listing.listing_photos],
  );
  const compact = variant === 'compact';
  const mapCard = compact && width != null;
  const hasScrollablePhotos = photos.length > 1 && (compact || mapCard);
  const category = getListingCategory(listing);
  const categoryColors = getCategoryColors(theme.scheme, category);

  const styles = useMemo(() => createStyles(theme, compact, categoryColors.main), [theme, compact, categoryColors.main]);

  const pan = createHorizontalSwipeGesture((translationX) => {
    if (translationX < -60 || translationX > 60) {
      hapticMedium();
    }
  });

  const card = (
    <Pressable
      style={[
        styles.card,
        width != null ? { width } : null,
        unavailable && styles.unavailable,
        listing.is_featured && styles.featured,
        style,
      ]}
      onPress={onPress}
      disabled={unavailable}
      delayPressIn={hasScrollablePhotos ? 140 : 0}
      android_ripple={{ color: theme.colors.borderStrong }}
    >
      <View style={[styles.imageWrap, mapCard && width != null ? { width, height: COMPACT_LISTING_PHOTO_HEIGHT } : null]}>
        {mapCard ? (
          photos.length > 1 ? (
            <ListingCarousel
              photos={photos}
              width={width}
              height={COMPACT_LISTING_PHOTO_HEIGHT}
              pagination="none"
            />
          ) : (
            <Image
              source={{
                uri: photos.length > 0 ? getPhotoUrl(photos[0].storage_path) : LISTING_PHOTO_PLACEHOLDER,
              }}
              style={{ width: width ?? '100%', height: COMPACT_LISTING_PHOTO_HEIGHT }}
              contentFit="cover"
              placeholder={{ uri: LISTING_PHOTO_PLACEHOLDER }}
              transition={200}
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
          <Image
            source={{
              uri: photos.length > 0 ? getPhotoUrl(photos[0].storage_path) : LISTING_PHOTO_PLACEHOLDER,
            }}
            style={{ width: width ?? '100%', height: COMPACT_LISTING_PHOTO_HEIGHT }}
            contentFit="cover"
            placeholder={{ uri: LISTING_PHOTO_PLACEHOLDER }}
            transition={200}
          />
        ) : (
          <Image
            source={{
              uri: photos.length > 0 ? getPhotoUrl(photos[0].storage_path) : LISTING_PHOTO_PLACEHOLDER,
            }}
            style={styles.image}
            contentFit="cover"
            placeholder={{ uri: LISTING_PHOTO_PLACEHOLDER }}
            transition={200}
          />
        )}
        {listing.is_featured ? (
          <View style={[styles.featuredBadge, { backgroundColor: categoryColors.main }]}>
            <AppText variant="micro" color="onAccent">
              {t('listing.featured')}
            </AppText>
          </View>
        ) : null}
        <ListingStatusOverlay listing={listing} />
      </View>
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
      </View>
      {showSwipeHint ? (
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

function createStyles(theme: ReturnType<typeof useTheme>, compact: boolean, featuredColor: string) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: compact ? 0 : spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
        android: { elevation: 4 },
      }),
    },
    featured: { borderColor: featuredColor, borderWidth: 2 },
    unavailable: { opacity: 0.5 },
    imageWrap: { position: 'relative', overflow: 'hidden' },
    image: { width: '100%', aspectRatio: compact ? 16 / 10 : 16 / 9 },
    featuredBadge: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 6,
      zIndex: 2,
    },
    content: { padding: compact ? spacing.sm : spacing.md, gap: compact ? spacing.xs : spacing.sm },
    compactPrice: { fontWeight: '700', fontSize: 17 },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    swipeHint: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, alignItems: 'center' },
  });
}
