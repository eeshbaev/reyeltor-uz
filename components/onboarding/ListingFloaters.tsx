import { useEffect, useMemo } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { formatPriceShort } from '@/lib/format';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import { getListingPropertyType } from '@/lib/listing';
import { getPhotoUrl } from '@/lib/supabase';
import type { ListingWithPhotos } from '@/types';

const CARD_W = 112;
const CARD_H = 84;

/** Spots in the open area between the top bar and the text. Fractions of the screen. */
const SPOTS = [
  { left: 0.06, top: 0.2, tilt: -4 },
  { right: 0.07, top: 0.29, tilt: 3 },
  { left: 0.2, top: 0.4, tilt: 2 },
  { right: 0.03, top: 0.46, tilt: -3 },
] as const;

/** Show different kinds of property first: a flat, a house, an office, a shop. */
const KIND_ORDER = ['apartment', 'country_house', 'office', 'retail', 'residential', 'mansion', 'townhouse'];

function pickDiverse(listings: ListingWithPhotos[]): ListingWithPhotos[] {
  const withPhoto = listings.filter((item) => (item.listing_photos?.length ?? 0) > 0);
  const picked: ListingWithPhotos[] = [];
  const used = new Set<string>();
  for (const kind of KIND_ORDER) {
    if (picked.length >= SPOTS.length) break;
    const match = withPhoto.find((item) => !used.has(item.id) && getListingPropertyType(item) === kind);
    if (match) {
      picked.push(match);
      used.add(match.id);
    }
  }
  for (const item of withPhoto) {
    if (picked.length >= SPOTS.length) break;
    if (!used.has(item.id)) picked.push(item);
  }
  return picked;
}

function Floater({ listing, index }: { listing: ListingWithPhotos; index: number }) {
  const { height, width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const spot = SPOTS[index];
  const bob = useSharedValue(0);
  const photo = [...(listing.listing_photos ?? [])].sort((a, b) => a.order_index - b.order_index)[0];

  useEffect(() => {
    if (reduceMotion) return;
    bob.value = withDelay(
      600 + index * 250,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 2200 + index * 300, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2200 + index * 300, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, [bob, index, reduceMotion]);

  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  if (!photo) return null;

  const position =
    'left' in spot
      ? { left: width * spot.left }
      : { left: width - width * spot.right - CARD_W };

  return (
    <Animated.View
      entering={reduceMotion ? FadeIn.duration(200) : ZoomIn.duration(420).delay(320 + index * 140)}
      style={[styles.slot, position, { top: height * spot.top, transform: [{ rotate: `${spot.tilt}deg` }] }]}
    >
      <Animated.View style={[styles.card, bobStyle]}>
        <Image
          source={{ uri: getPhotoUrl(photo.storage_path) }}
          style={styles.photo}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
        <View style={styles.priceChip}>
          <AppText variant="caption" style={styles.price} tabular>
            {formatPriceShort(listing.price)}
          </AppText>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * A few real listing photos floating over the map: the person sees at once that this app shows
 * actual places (homes, offices, shops) with prices. Look-only; renders nothing until photos load.
 */
export function ListingFloaters() {
  const { allListings } = useListingsCache();
  const picked = useMemo(() => pickDiverse(allListings), [allListings]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {picked.map((listing, index) => (
        <Floater key={listing.id} listing={listing} index={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', width: CARD_W },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: fixedColors.white,
    backgroundColor: fixedColors.ink,
    shadowColor: fixedColors.ink,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  photo: { width: '100%', height: '100%' },
  priceChip: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10,10,10,0.78)',
  },
  price: { color: fixedColors.white, fontWeight: '700' },
});
