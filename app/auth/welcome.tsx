import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet } from 'react-native';
import { WelcomeCoin } from '@/components/registration/WelcomeCoin';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { SafeScreen } from '@/components/ui/SafeScreen';
import { WELCOME_COINS } from '@/lib/constants';
import { spacing } from '@/lib/design/spacing';
import { hapticSuccess } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const reduceMotion = useReduceMotion();
  const anim = useRef(new Animated.Value(0)).current;
  const [displayBalance, setDisplayBalance] = useState(0);

  useEffect(() => {
    hapticSuccess();
    if (reduceMotion) {
      setDisplayBalance(WELCOME_COINS);
      return;
    }
    const duration = 600;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayBalance(Math.round(progress * WELCOME_COINS));
      anim.setValue(progress);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [anim, reduceMotion]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  return (
    <SafeScreen edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <Animated.View style={{ transform: [{ scale }], marginBottom: spacing.lg }}>
        <WelcomeCoin size="lg" />
      </Animated.View>
      <AppText variant="h1" style={styles.title}>
        {t('welcome.title')}
      </AppText>
      <AppText variant="body" color="secondary" style={styles.subtitle}>
        {t('welcome.subtitle')}
      </AppText>
      <AppText variant="h1" color="accent" style={styles.balance}>
        {displayBalance}
      </AppText>
      <Button label={t('welcome.start')} onPress={() => router.replace('/(tabs)/map')} />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg, maxWidth: 300 },
  balance: { marginBottom: spacing.xl },
});
