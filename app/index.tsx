import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { JumpingEmblem } from '@/components/brand/JumpingEmblem';
import { AppText } from '@/components/ui/AppText';
import { APP_NAME } from '@/lib/constants';
import { ONBOARDING_DONE_KEY } from '@/lib/onboarding/constants';
import { spacing } from '@/lib/design/spacing';

const SPLASH_BG = '#0A0A0A';

export default function Index() {
  const [target, setTarget] = useState<'onboarding' | 'map' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DONE_KEY).then((done) => {
      setTarget(done === '1' ? 'map' : 'onboarding');
    });
  }, []);

  if (!target) {
    return (
      <View style={styles.splash}>
        <View style={styles.glow} />
        <JumpingEmblem variant="hero" size={72} jumpHeight={16} pauseMs={900} entrance />
        <AppText variant="h2" style={styles.brandName}>
          {APP_NAME}
        </AppText>
      </View>
    );
  }

  return <Redirect href={target === 'onboarding' ? '/onboarding' : '/(tabs)/map'} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SPLASH_BG,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    top: '34%',
  },
  brandName: {
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
});
