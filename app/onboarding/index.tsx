import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { LanguageTopBar } from '@/components/i18n/LanguageTopBar';
import { OnboardingPager } from '@/components/onboarding/OnboardingPager';
import { markOnboardingDone } from '@/lib/onboarding/storage';

export default function OnboardingScreen() {
  const router = useRouter();

  const handleComplete = useCallback(async () => {
    await markOnboardingDone();
    router.replace('/(tabs)/map');
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden={false} />
      <OnboardingPager onComplete={handleComplete} />
      <View style={styles.languageBar} pointerEvents="box-none">
        <LanguageTopBar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  languageBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
