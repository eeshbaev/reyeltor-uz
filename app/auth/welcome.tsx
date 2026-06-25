import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/AppText';
import { WELCOME_COINS } from '@/lib/constants';
import { motion } from '@/lib/design/motion';
import { spacing } from '@/lib/design/spacing';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import { useTheme } from '@/lib/theme';
import { hapticSuccess } from '@/lib/haptics';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Animated.Text style={[styles.emoji, { transform: [{ scale }] }]}>🪙</Animated.Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emoji: { fontSize: 72, marginBottom: spacing.lg },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg, maxWidth: 300 },
  balance: { marginBottom: spacing.xl },
});
