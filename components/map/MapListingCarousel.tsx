import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View, Dimensions } from 'react-native';
import { FlatList as GestureFlatList } from 'react-native-gesture-handler';
import { ListingCard } from '@/components/listing/ListingCard';
import { CategoryToggle } from '@/components/map/CategoryToggle';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { LIST_SWIPE_HINT_KEY } from '@/lib/constants';
import { spacing } from '@/lib/design/spacing';
import type { ListingWithPhotos } from '@/types';

export const MAP_LISTING_CATEGORY_BAR_HEIGHT = 40;
export const MAP_LISTING_CARD_WIDTH = 300;
export const MAP_LISTING_CAROUSEL_HEIGHT = 248 + MAP_LISTING_CATEGORY_BAR_HEIGHT;

/** Total height from screen bottom: tab clearance + category bar + cards. */
export function mapCarouselStackHeight(safeBottom: number): number {
  return mapListingCarouselBottomOffset(safeBottom) + MAP_LISTING_CAROUSEL_HEIGHT;
}

/** First detail-sheet snap — lines up with the map listing carousel. */
export function mapDetailPeekSnapPercent(safeBottom: number): string {
  const screenHeight = Dimensions.get('window').height;
  const stackHeight = mapCarouselStackHeight(safeBottom);
  const percent = Math.min(88, Math.max(38, Math.ceil((stackHeight / screenHeight) * 100)));
  return `${percent}%`;
}

interface MapListingCarouselProps {
  listings: ListingWithPhotos[];
  onListingPress: (id: string) => void;
  bottomOffset: number;
  hidden?: boolean;
  dimmed?: boolean;
}

export function mapListingCarouselBottomOffset(safeBottom: number) {
  return Math.max(safeBottom, spacing.sm) + TAB_BAR_CLEARANCE - spacing.xs;
}

export function MapListingCarousel({ listings, onListingPress, bottomOffset, hidden, dimmed }: MapListingCarouselProps) {
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const sorted = useMemo(
    () =>
      [...listings].sort((a, b) => {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
        return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
      }),
    [listings],
  );

  useEffect(() => {
    AsyncStorage.getItem(LIST_SWIPE_HINT_KEY).then((v) => {
      if (!v) setShowSwipeHint(true);
    });
  }, []);

  if (hidden || sorted.length === 0) return null;

  return (
    <View
      style={[styles.wrap, { bottom: bottomOffset }, dimmed && styles.dimmed]}
      pointerEvents={dimmed ? 'none' : 'box-none'}
    >
      <CategoryToggle />
      <GestureFlatList
        style={styles.list}
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        scrollEventThrottle={16}
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
        renderItem={({ item, index }) => (
          <ListingCard
            listing={item}
            variant="compact"
            width={MAP_LISTING_CARD_WIDTH}
            enableSwipe={false}
            showSwipeHint={showSwipeHint && index === 0}
            onSwipeHintDismiss={() => {
              setShowSwipeHint(false);
              AsyncStorage.setItem(LIST_SWIPE_HINT_KEY, '1');
            }}
            onPress={() => onListingPress(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 15,
  },
  dimmed: {
    opacity: 0.55,
  },
  list: {
    height: MAP_LISTING_CAROUSEL_HEIGHT - MAP_LISTING_CATEGORY_BAR_HEIGHT,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xs : 0,
  },
  separator: { width: spacing.sm },
});
