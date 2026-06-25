import { Image } from 'expo-image';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { JumpingEmblem } from '@/components/brand/JumpingEmblem';
import { AppText } from '@/components/ui/AppText';
import { APP_NAME } from '@/lib/constants';
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

      {slide.id === 'welcome' ? (
        <Animated.View
          style={[
            styles.hero,
            {
              top: insets.top + 88,
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
          pointerEvents="none"
        >
          <JumpingEmblem
            variant="hero"
            size={64}
            jumpHeight={14}
            pauseMs={1200}
            entrance
            paused={!active}
          />
          <AppText variant="h2" style={styles.brandName}>
            {APP_NAME}
          </AppText>
        </Animated.View>
      ) : null}

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
  hero: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 2,
    overflow: 'visible',
  },
  brandName: {
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textAlign: 'center',
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
