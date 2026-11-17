import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import { FlatList, Gesture, GestureDetector, type FlatList as FlatListType } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import { hapticLight } from '@/lib/haptics';
import { LISTING_PHOTO_PLACEHOLDER_SOURCE, listingPhotoPlaceholder, resolveListingPhotoSource } from '@/lib/listingPhotos';
import { preloadCarouselImages } from '@/lib/network/imagePreloader';
import { getPhotoUrl } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { ListingPhoto } from '@/types';

interface ListingCarouselProps {
  photos: ListingPhoto[];
  width?: number;
  height?: number;
  pagination?: 'below' | 'overlay' | 'none';
  /** Prioritize horizontal photo swipes inside bottom sheets. */
  prioritizeHorizontalSwipe?: boolean;
  /** When false, taps pass through to a parent press handler (map cards). */
  scrollEnabled?: boolean;
}

const WEB_SNAP_STYLE: ViewStyle | undefined =
  Platform.OS === 'web'
    ? ({ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' } as ViewStyle)
    : undefined;

const WEB_SLIDE_STYLE: ViewStyle | undefined =
  Platform.OS === 'web' ? ({ scrollSnapAlign: 'start' } as ViewStyle) : undefined;

const PAGER_SPRING = { damping: 22, stiffness: 220, mass: 0.8 };

function CarouselPhoto({ photo, slideKey }: { photo: ListingPhoto; slideKey: string }) {
  return (
    <Image
      source={resolveListingPhotoSource(photo.storage_path, getPhotoUrl(photo.storage_path))}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      contentPosition="center"
      recyclingKey={slideKey}
      placeholder={listingPhotoPlaceholder(photo.storage_path)}
      transition={0}
      cachePolicy="memory-disk"
    />
  );
}

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

function CarouselFooter({
  sorted,
  index,
  overlay,
  pagination,
  scrollX,
  slideWidth,
  theme,
}: {
  sorted: ListingPhoto[];
  index: number;
  overlay: boolean;
  pagination: ListingCarouselProps['pagination'];
  scrollX: SharedValue<number>;
  slideWidth: number;
  theme: ReturnType<typeof useTheme>;
}) {
  const showDots = sorted.length > 1 && pagination !== 'none';
  if (!showDots) return null;

  return (
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
      ) : overlay ? (
        <AppText variant="micro" style={styles.overlayCounter}>
          {index + 1}/{sorted.length}
        </AppText>
      ) : null}
    </View>
  );
}

/** Bottom-sheet friendly pager: finger-tracking strip, no FlatList vs vertical scroll fights. */
function SheetPhotoPager({
  photos,
  width,
  height,
  pagination,
}: {
  photos: ListingPhoto[];
  width: number;
  height: number;
  pagination: ListingCarouselProps['pagination'];
}) {
  const theme = useTheme();
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const translateX = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const scrollX = useSharedValue(0);
  const overlay = pagination === 'overlay';

  const sorted = useMemo(
    () => [...photos].sort((a, b) => a.order_index - b.order_index),
    [photos],
  );

  const commitIndex = useCallback((nextIndex: number) => {
    if (nextIndex === indexRef.current) return;
    indexRef.current = nextIndex;
    setIndex(nextIndex);
    hapticLight();
  }, []);

  useEffect(() => {
    indexRef.current = 0;
    setIndex(0);
    translateX.value = 0;
    scrollX.value = 0;
  }, [sorted, scrollX, translateX, width]);

  useEffect(() => {
    const photoUrls = sorted.map((photo) => getPhotoUrl(photo.storage_path));
    preloadCarouselImages(photoUrls, index);
  }, [index, sorted]);

  const panGesture = useMemo(() => {
    if (sorted.length <= 1) return Gesture.Pan().enabled(false);

    const minOffset = -(sorted.length - 1) * width;

    return Gesture.Pan()
      .activeOffsetX([-14, 14])
      .failOffsetY([-10, 10])
      .onStart(() => {
        dragStartX.value = translateX.value;
      })
      .onUpdate((event) => {
        const next = dragStartX.value + event.translationX;
        translateX.value = Math.max(minOffset, Math.min(0, next));
        scrollX.value = -translateX.value;
      })
      .onEnd((event) => {
        const projected = translateX.value + event.velocityX * 0.18;
        const rawIndex = -projected / width;
        const nextIndex = Math.max(0, Math.min(sorted.length - 1, Math.round(rawIndex)));
        const targetX = -nextIndex * width;

        translateX.value = withSpring(targetX, PAGER_SPRING);
        scrollX.value = withSpring(nextIndex * width, PAGER_SPRING);
        runOnJS(commitIndex)(nextIndex);
      });
  }, [commitIndex, dragStartX, scrollX, sorted.length, translateX, width]);

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.wrap, { width, height }]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.pagerStrip,
            { width: width * sorted.length, height },
            stripStyle,
          ]}
        >
          {sorted.map((photo, photoIndex) => (
            <View
              key={`${photo.id}-${photoIndex}`}
              style={[styles.slide, { width, height }]}
            >
              <CarouselPhoto photo={photo} slideKey={`${photo.storage_path}-${photoIndex}`} />
            </View>
          ))}
        </Animated.View>
      </GestureDetector>
      <CarouselFooter
        sorted={sorted}
        index={index}
        overlay={overlay}
        pagination={pagination}
        scrollX={scrollX}
        slideWidth={width}
        theme={theme}
      />
    </View>
  );
}

export function ListingCarousel({
  photos,
  width,
  height = 240,
  pagination = 'below',
  prioritizeHorizontalSwipe = false,
  scrollEnabled = true,
}: ListingCarouselProps) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const listRef = useRef<FlatListType<ListingPhoto>>(null);
  const [index, setIndex] = useState(0);
  const slideWidth = Math.round(width ?? windowWidth);
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

  useEffect(() => {
    const photoUrls = sorted.map((photo) => getPhotoUrl(photo.storage_path));
    preloadCarouselImages(photoUrls, index);
  }, [index, sorted]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollX.value = event.nativeEvent.contentOffset.x;
    },
    [scrollX],
  );

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setIndexFromOffset(event.nativeEvent.contentOffset.x);
    },
    [setIndexFromOffset],
  );

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
    ({ item, index: itemIndex }: { item: ListingPhoto; index: number }) => (
      <View style={[styles.slide, { width: slideWidth, height: imageHeight }, WEB_SLIDE_STYLE]}>
        <CarouselPhoto photo={item} slideKey={`${item.storage_path}-${itemIndex}`} />
      </View>
    ),
    [imageHeight, slideWidth],
  );

  if (sorted.length === 0) {
    return (
      <Image
        source={LISTING_PHOTO_PLACEHOLDER_SOURCE}
        style={{ width: slideWidth, height: imageHeight, borderRadius: 12 }}
        contentFit="cover"
      />
    );
  }

  if (prioritizeHorizontalSwipe && Platform.OS !== 'web') {
    return (
      <SheetPhotoPager
        photos={photos}
        width={slideWidth}
        height={imageHeight}
        pagination={pagination}
      />
    );
  }

  return (
    <View style={[styles.wrap, { width: slideWidth, height: wrapHeight, minHeight: imageHeight }]}>
      <FlatList
        ref={listRef}
        horizontal
        data={sorted}
        keyExtractor={(item, itemIndex) => `${item.id}-${itemIndex}`}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        snapToInterval={slideWidth}
        snapToAlignment="start"
        scrollEnabled={scrollEnabled}
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        disableIntervalMomentum
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        style={{ width: slideWidth, height: imageHeight }}
        contentContainerStyle={WEB_SNAP_STYLE}
        windowSize={5}
        initialNumToRender={sorted.length}
        maxToRenderPerBatch={sorted.length}
        removeClippedSubviews={false}
        extraData={slideWidth}
      />
      <CarouselFooter
        sorted={sorted}
        index={index}
        overlay={overlay}
        pagination={pagination}
        scrollX={scrollX}
        slideWidth={slideWidth}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden' },
  pagerStrip: { flexDirection: 'row' },
  slide: { overflow: 'hidden', backgroundColor: '#0b0f1a' },
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
  overlayCounter: { color: 'rgba(255,255,255,0.9)', marginLeft: spacing.sm, fontWeight: '600' },
});
