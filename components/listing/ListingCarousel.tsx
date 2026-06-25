import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { FlatList, type FlatList as FlatListType } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import { LISTING_PHOTO_PLACEHOLDER } from '@/lib/listingPhotos';
import { getPhotoUrl } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { ListingPhoto } from '@/types';

interface ListingCarouselProps {
  photos: ListingPhoto[];
  width?: number;
  height?: number;
  pagination?: 'below' | 'overlay' | 'none';
}

const screenWidth = Dimensions.get('window').width;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<ListingPhoto>);

const WEB_SNAP_STYLE: ViewStyle | undefined =
  Platform.OS === 'web'
    ? ({ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' } as ViewStyle)
    : undefined;

const WEB_SLIDE_STYLE: ViewStyle | undefined =
  Platform.OS === 'web' ? ({ scrollSnapAlign: 'start' } as ViewStyle) : undefined;

function PaginationDot({
  dotIndex,
  scrollX,
  slideWidth,
  inactiveColor,
  activeColor,
  overlay,
}: {
  dotIndex: number;
  scrollX: SharedValue<number>;
  slideWidth: number;
  inactiveColor: string;
  activeColor: string;
  overlay: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const center = dotIndex * slideWidth;
    const width = interpolate(scrollX.value, [center - slideWidth, center, center + slideWidth], [6, 16, 6], 'clamp');

    if (overlay) {
      const opacity = interpolate(
        scrollX.value,
        [center - slideWidth, center, center + slideWidth],
        [0.55, 1, 0.55],
        'clamp',
      );
      return { width, backgroundColor: `rgba(255,255,255,${opacity})` };
    }

    const active = interpolate(scrollX.value, [center - slideWidth, center, center + slideWidth], [0, 1, 0], 'clamp');
    return {
      width,
      backgroundColor: active > 0.5 ? activeColor : inactiveColor,
    };
  });

  return <Animated.View style={[styles.dot, style]} />;
}

export function ListingCarousel({
  photos,
  width,
  height = 240,
  pagination = 'below',
}: ListingCarouselProps) {
  const theme = useTheme();
  const listRef = useRef<FlatListType<ListingPhoto>>(null);
  const [index, setIndex] = useState(0);
  const slideWidth = Math.round(width ?? screenWidth);
  const scrollX = useSharedValue(0);

  const sorted = useMemo(
    () => [...photos].sort((a, b) => a.order_index - b.order_index),
    [photos],
  );
  const showDots = sorted.length > 1 && pagination !== 'none';
  const overlay = pagination === 'overlay';

  const setIndexFromOffset = useCallback(
    (offsetX: number) => {
      const next = Math.round(offsetX / slideWidth);
      const clamped = Math.max(0, Math.min(next, sorted.length - 1));
      setIndex((prev) => (prev === clamped ? prev : clamped));
    },
    [slideWidth, sorted.length],
  );

  useEffect(() => {
    setIndex(0);
    scrollX.value = 0;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [sorted, slideWidth, scrollX]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
    onEndDrag: (event) => {
      runOnJS(setIndexFromOffset)(event.contentOffset.x);
    },
    onMomentumEnd: (event) => {
      runOnJS(setIndexFromOffset)(event.contentOffset.x);
    },
  });

  const getItemLayout = useCallback(
    (_: ArrayLike<ListingPhoto> | null | undefined, itemIndex: number) => ({
      length: slideWidth,
      offset: slideWidth * itemIndex,
      index: itemIndex,
    }),
    [slideWidth],
  );

  const imageHeight = height;
  const wrapHeight = pagination === 'below' && showDots ? undefined : imageHeight;

  const renderItem = useCallback(
    ({ item }: { item: ListingPhoto }) => (
      <View style={[{ width: slideWidth, height: imageHeight }, WEB_SLIDE_STYLE]}>
        <Image
          source={{ uri: getPhotoUrl(item.storage_path) }}
          style={{ width: slideWidth, height: imageHeight }}
          contentFit="cover"
          recyclingKey={item.id}
          placeholder={{ uri: LISTING_PHOTO_PLACEHOLDER }}
          transition={200}
        />
      </View>
    ),
    [imageHeight, slideWidth],
  );

  if (sorted.length === 0) {
    return (
      <Image
        source={{ uri: LISTING_PHOTO_PLACEHOLDER }}
        style={{ width: slideWidth, height: imageHeight, borderRadius: 12 }}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={[styles.wrap, { width: slideWidth, height: wrapHeight, minHeight: imageHeight }]}>
      <AnimatedFlatList
        ref={listRef}
        horizontal
        data={sorted}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        pagingEnabled
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="normal"
        bounces={false}
        overScrollMode="never"
        disableIntervalMomentum={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        style={{ width: slideWidth, height: imageHeight }}
        contentContainerStyle={WEB_SNAP_STYLE}
        windowSize={3}
        initialNumToRender={Math.min(sorted.length, 3)}
        maxToRenderPerBatch={2}
        removeClippedSubviews={false}
      />
      {showDots ? (
        <View style={overlay ? styles.overlayFooter : styles.footer} pointerEvents="none">
          <View style={styles.dots}>
            {sorted.map((photo, i) => (
              <PaginationDot
                key={`${photo.id}-${i}`}
                dotIndex={i}
                scrollX={scrollX}
                slideWidth={slideWidth}
                inactiveColor={overlay ? 'rgba(255,255,255,0.55)' : theme.colors.border}
                activeColor={overlay ? '#ffffff' : theme.colors.primary}
                overlay={overlay}
              />
            ))}
          </View>
          {pagination === 'below' ? (
            <AppText variant="micro" style={styles.counter}>
              {index + 1}/{sorted.length}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden' },
  slide: { borderRadius: 12 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  overlayFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  dots: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
  counter: { opacity: 0.8 },
});
