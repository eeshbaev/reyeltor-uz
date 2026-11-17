import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { AppText } from '@/components/ui/AppText';
import { motion } from '@/lib/design/motion';
import { spacing } from '@/lib/design/spacing';

interface PostLoginWelcomeBackProps {
  fullName: string;
  returnTo?: string;
}

export function PostLoginWelcomeBack({ fullName, returnTo }: PostLoginWelcomeBackProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const timer = setTimeout(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, motion.standard);
    return () => clearTimeout(timer);
  }, []);

  const continueToApp = () => {
    router.replace(returnTo === 'favorites' ? '/(tabs)/favorites' : '/(tabs)/map');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.center}>
        <Animated.View entering={FadeIn.duration(motion.gentle)}>
          <BrandWordmark variant="hero" animate style={styles.wordmark} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(motion.gentle)} style={styles.copy}>
          <Text style={styles.greeting}>{t('welcome.welcomeBackGreeting', { name: fullName })}</Text>
          <AppText variant="body" style={styles.subtitle}>
            {t('welcome.welcomeBackSubtitle')}
          </AppText>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(360).duration(motion.gentle)}>
        <Pressable style={styles.cta} onPress={continueToApp} accessibilityRole="button">
          <Text style={styles.ctaLabel}>{t('welcome.continueCta')}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  wordmark: {
    marginBottom: spacing.xs,
  },
  copy: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.58)',
    textAlign: 'center',
    lineHeight: 24,
  },
  cta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  ctaLabel: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '600',
  },
});
