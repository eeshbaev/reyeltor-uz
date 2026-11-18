import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WelcomeCoin } from './WelcomeCoin';
import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { AppText } from '@/components/ui/AppText';
import { Text } from '@/components/ui/Text';
import { isEarlyMember, useAccessSettings } from '@/lib/access/accessModel';
import { WELCOME_COINS } from '@/lib/constants';
import { useAuth } from '@/lib/context/AuthContext';
import { fixedColors } from '@/lib/design/colors';
import { motion } from '@/lib/design/motion';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { markWelcomeShown } from '@/lib/onboarding/storage';

interface PostRegistrationWelcomeProps {
  fullName: string;
  returnTo?: string;
}

export function PostRegistrationWelcome({ fullName, returnTo }: PostRegistrationWelcomeProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const access = useAccessSettings();
  // The profile may still be loading right after sign-up: fall back to whether early access is open.
  const earlyMember = profile ? isEarlyMember(profile) : access.earlyAccessOpen;
  const [count, setCount] = useState(0);
  const hapticsFired = useRef({ five: false, ten: false, fifteen: false });

  useEffect(() => {
    void markWelcomeShown();
  }, []);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setCount(current);

      if (Platform.OS !== 'web') {
        if (current === 5 && !hapticsFired.current.five) {
          hapticsFired.current.five = true;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (current === 10 && !hapticsFired.current.ten) {
          hapticsFired.current.ten = true;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (current === 15 && !hapticsFired.current.fifteen) {
          hapticsFired.current.fifteen = true;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }

      if (current >= WELCOME_COINS) clearInterval(interval);
    }, 53);

    return () => clearInterval(interval);
  }, []);

  const explore = () => {
    router.replace(returnTo === 'favorites' ? '/(tabs)/favorites' : '/(tabs)/map');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.center}>
        <Animated.View entering={FadeIn.duration(motion.gentle)}>
          <BrandWordmark variant="hero" animate style={styles.wordmark} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(motion.gentle)} style={styles.coinBlock}>
          <WelcomeCoin />
          <Text style={styles.count}>{count}</Text>
          <AppText variant="body" style={styles.coinsLabel}>
            {t('welcome.coinsLabel')}
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(motion.gentle)}>
          <Text style={styles.welcomeName}>{t('welcome.greeting', { name: fullName })}</Text>
          <Text style={styles.earlyLine}>{t(earlyMember ? 'welcome.earlyMember' : 'welcome.freeAccess')}</Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(480).duration(motion.gentle)}>
        <Pressable style={styles.cta} onPress={explore} accessibilityRole="button">
          <Text style={styles.ctaLabel}>{t('welcome.exploreCta')}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: fixedColors.ink,
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
  coinBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  count: {
    color: fixedColors.white,
    fontSize: 72,
    fontWeight: '500',
    lineHeight: 80,
    marginTop: spacing.md,
  },
  coinsLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 16,
  },
  welcomeName: {
    color: fixedColors.white,
    fontSize: 20,
    fontWeight: '500',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  earlyLine: {
    color: 'rgba(255, 255, 255, 0.62)',
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 320,
    alignSelf: 'center',
  },
  cta: {
    backgroundColor: fixedColors.white,
    borderRadius: radius.pill,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  ctaLabel: {
    color: fixedColors.ink,
    fontSize: 15,
    fontWeight: '600',
  },
});
