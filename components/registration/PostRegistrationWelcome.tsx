import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WelcomeCoin } from './WelcomeCoin';
import { AppText } from '@/components/ui/AppText';
import { WELCOME_COINS } from '@/lib/constants';
import { spacing } from '@/lib/design/spacing';
import { markWelcomeShown } from '@/lib/onboarding/storage';

interface PostRegistrationWelcomeProps {
  fullName: string;
}

export function PostRegistrationWelcome({ fullName }: PostRegistrationWelcomeProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    router.replace('/(tabs)/map');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.center}>
        <Text style={styles.wordmark}>reyeltor.uz</Text>

        <View style={styles.coinBlock}>
          <WelcomeCoin />
          <Text style={styles.count}>{count}</Text>
          <AppText variant="body" style={styles.coinsLabel}>
            free coins to get started
          </AppText>
        </View>

        <Text style={styles.welcomeName}>Welcome, {fullName}.</Text>
      </View>

      <Pressable style={styles.cta} onPress={explore} accessibilityRole="button">
        <Text style={styles.ctaLabel}>Explore Tashkent →</Text>
      </Pressable>
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
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '500',
    letterSpacing: -0.5,
  },
  coinBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  count: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    marginTop: spacing.md,
    textAlign: 'center',
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
