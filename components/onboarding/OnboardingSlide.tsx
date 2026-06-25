import { Image } from 'expo-image';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import type { OnboardingSlideData } from '@/lib/onboarding/slides';

interface OnboardingSlideProps {
  slide: OnboardingSlideData;
  active: boolean;
  onComplete?: () => void;
}

export function OnboardingSlide({ slide, active, onComplete }: OnboardingSlideProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const imageLoaded = useRef(false);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  const runEntrance = useCallback(() => {
    contentOpacity.setValue(0);
    contentTranslateY.setValue(20);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [contentOpacity, contentTranslateY]);

  useEffect(() => {
    if (!active) return;

    const fallbackTimer = setTimeout(() => {
      runEntrance();
    }, 350);

    if (imageLoaded.current) {
      clearTimeout(fallbackTimer);
      runEntrance();
    }

    return () => clearTimeout(fallbackTimer);
  }, [active, runEntrance]);

  const handleImageLoad = () => {
    imageLoaded.current = true;
    if (active) runEntrance();
  };

  const handleImageError = () => {
    imageLoaded.current = true;
    if (active) runEntrance();
  };

  return (
    <View style={[styles.slide, { width, height }]}>
      <Image
        source={{ uri: slide.imageUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id={`grad-${slide.id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity="0" />
            <Stop offset="0.4" stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.88" />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill={`url(#grad-${slide.id})`} />
      </Svg>

      <Animated.View
        style={[
          styles.content,
          {
            paddingBottom: insets.bottom + spacing.xl + 40,
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        <AppText variant="h1" color="onAccent" style={styles.heading}>
          {slide.heading}
        </AppText>
        <AppText variant="body" color="onAccent" style={styles.subtitle}>
          {slide.subtitle}
        </AppText>
        {slide.showCta && slide.ctaLabel ? (
          <Pressable style={styles.cta} onPress={onComplete} accessibilityRole="button">
            <AppText variant="label" style={styles.ctaLabel}>
              {slide.ctaLabel}
            </AppText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    overflow: 'hidden',
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  heading: {
    color: '#FFFFFF',
    maxWidth: 340,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.78)',
    maxWidth: 340,
    marginBottom: spacing.md,
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  ctaLabel: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '600',
  },
});
