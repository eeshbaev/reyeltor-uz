import { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FlatList as GestureFlatList } from 'react-native-gesture-handler';
import { ListingCard } from '@/components/listing/ListingCard';
import { MapNearbyPlacesButton } from '@/components/map/MapNearbyPlacesButton';
import { isDemoId } from '@/lib/demo';
import { spacing } from '@/lib/design/spacing';
import { MAP_LISTING_PHOTO_HEIGHT } from '@/lib/listingPhotos';
import type { ListingWithPhotos } from '@/types';

export const MAP_LISTING_CATEGORY_BAR_HEIGHT = 36;
export const MAP_LISTING_CARD_WIDTH = 328;
export const MAP_LISTING_CAROUSEL_HEIGHT = MAP_LISTING_PHOTO_HEIGHT + MAP_LISTING_CATEGORY_BAR_HEIGHT + spacing.xs;

export function mapListingCarouselBottomOffset(safeAreaBottom: number): number {
  return safeAreaBottom + 80;
}

interface MapListingCarouselProps {
  listings: ListingWithPhotos[];
  onListingPress: (id: string) => void;
  hidden?: boolean;
  dimmed?: boolean;
  bottomOffset?: number;
  focusedListingId?: string | null;
  onExploreNeighborhood?: (listingId: string) => void;
}

export function MapListingCarousel({
  listings,
  onListingPress,
  hidden,
  dimmed = false,
  bottomOffset = 80,
  focusedListingId = null,
  onExploreNeighborhood,
}: MapListingCarouselProps) {
  // OPTIMIZATION #2: Parse dates once before sort to avoid Date object creation during comparisons
  const sorted = useMemo(
    () => {
      // Pre-parse timestamps to avoid Date object creation in comparator (O(n) instead of O(n log n))
      const timestamps = new Map<string, number>();
      listings.forEach((listing) => {
        timestamps.set(listing.id, new Date(listing.posted_at).getTime());
      });

      return [...listings].sort((a, b) => {
        // Real listings always before illustrative demo listings.
        const aDemo = isDemoId(a.id);
        const bDemo = isDemoId(b.id);
        if (aDemo !== bDemo) return aDemo ? 1 : -1;
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
        return (timestamps.get(b.id) ?? 0) - (timestamps.get(a.id) ?? 0);
      });
    },
    [listings],
  );

  if (hidden) return null;

  if (sorted.length === 0) return null;

  return (
    <View
      style={[
        {
          position: 'absolute',
          bottom: bottomOffset,
          left: 0,
          right: 0,
          zIndex: 15,
          opacity: dimmed ? 0.5 : 1,
        },
      ]}
      pointerEvents="box-none"
    >
      {focusedListingId && onExploreNeighborhood ? (
        <View style={styles.nearbyPlacesRow} pointerEvents="box-none">
          <MapNearbyPlacesButton onPress={() => onExploreNeighborhood(focusedListingId)} />
        </View>
      ) : null}
      <GestureFlatList
        style={styles.list}
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        scrollEventThrottle={32}
        data={sorted}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={MAP_LISTING_CARD_WIDTH + spacing.sm}
        snapToAlignment="start"
        disableIntervalMomentum
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            variant="compact"
            width={MAP_LISTING_CARD_WIDTH}
            enableSwipe={false}
            onPress={() => onListingPress(item.id)}
            onOpenDetail={() => onListingPress(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  nearbyPlacesRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  list: {
    height: MAP_LISTING_CAROUSEL_HEIGHT - MAP_LISTING_CATEGORY_BAR_HEIGHT,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    backgroundColor: 'transparent',
  },
  separator: { width: spacing.sm },
});
