import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBootIcon } from '@/components/AppBootIcon';
import { APP_LOADING_BG } from '@/components/AppLoadingScreen';

export interface SplashScreenProps {
  isVisible: boolean;
}

/**
 * Premium splash screen with smooth animations
 * Shows logo with subtle loading indicator
 */
export function SplashScreen({ isVisible }: SplashScreenProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isVisible) return;

    // Entrance animation: fade in + subtle scale
    const entranceAnim = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    entranceAnim.start();

    // Continuous loading spinner
    const spinner = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    spinner.start();

    // CRITICAL: Stop animations when splash hides to prevent memory leak
    return () => {
      entranceAnim.stop();
      spinner.stop();
      // Reset animations for next splash
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      rotateAnim.setValue(0);
    };
  }, [isVisible, fadeAnim, scaleAnim, rotateAnim]);

  if (!isVisible) return null;

  const rotateZ = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          paddingBottom: insets.bottom,
          paddingTop: insets.top,
        },
      ]}
    >
      {/* Background */}
      <View style={styles.background} />

      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Logo with scale animation */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <AppBootIcon size={120} />
        </Animated.View>

        {/* App name */}
        <View style={styles.textContainer}>
          <Animated.Text
            style={[
              styles.appName,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            Reyeltor
          </Animated.Text>
          <Animated.Text
            style={[
              styles.tagline,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            Premium Real Estate
          </Animated.Text>
        </View>
      </View>

      {/* Loading indicator */}
      <View style={styles.bottomContainer}>
        <Animated.View
          style={[
            styles.loadingSpinner,
            {
              transform: [{ rotate: rotateZ }],
            },
          ]}
        >
          <View style={styles.spinnerDot} />
        </Animated.View>
        <Animated.Text
          style={[
            styles.loadingText,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          Loading...
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: APP_LOADING_BG,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: APP_LOADING_BG,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    marginBottom: 32,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A0AEC0',
    letterSpacing: 0.3,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderTopColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  spinnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
});
