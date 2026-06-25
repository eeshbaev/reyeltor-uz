import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  type ViewToken,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JumpingEmblem } from '@/components/brand/JumpingEmblem';
import { OnboardingDotIndicator } from './OnboardingDotIndicator';
import { OnboardingSlide } from './OnboardingSlide';
import { useOnboardingSlides } from '@/lib/hooks/useOnboardingSlides';
import type { OnboardingSlideData } from '@/lib/onboarding/slides';
import { spacing } from '@/lib/design/spacing';

interface OnboardingPagerProps {
  onComplete: () => void;
}

export function OnboardingPager({ onComplete }: OnboardingPagerProps) {
  const slides = useOnboardingSlides();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<OnboardingSlideData>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const index = viewableItems[0]?.index;
    if (index != null) setActiveIndex(index);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const goToIndex = useCallback(
    (index: number) => {
      listRef.current?.scrollToIndex({ index, animated: true });
      setActiveIndex(index);
    },
    [],
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        decelerationRate="fast"
        renderItem={({ item, index }) => (
          <OnboardingSlide
            slide={item}
            active={index === activeIndex}
            onComplete={onComplete}
          />
        )}
      />
      <View style={[styles.emblem, { top: insets.top + 52 }]} pointerEvents="none">
        <JumpingEmblem size={68} jumpHeight={18} pauseMs={1100} entrance />
      </View>
      <View style={[styles.dots, { bottom: insets.bottom + spacing.lg }]}>
        <OnboardingDotIndicator
          count={slides.length}
          activeIndex={activeIndex}
          onDotPress={goToIndex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  emblem: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
