import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LanguageTopBar } from '@/components/i18n/LanguageTopBar';
import { OnboardingPromise } from '@/components/onboarding/OnboardingPromise';
import { PurposePicker } from '@/components/onboarding/PurposePicker';
import { AppSystemBars } from '@/components/ui/AppSystemBars';
import { useAuth } from '@/lib/context/AuthContext';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { fixedColors } from '@/lib/design/colors';
import { markOnboardingDone } from '@/lib/onboarding/storage';
import { filtersForPurposes, SAVE_SEARCH_HINT_KEY, saveUserPurposes, storePendingPurposes } from '@/lib/purposes';
import type { UserPurpose } from '@/types';

export default function OnboardingScreen() {
  const router = useRouter();
  const { session, refreshProfile } = useAuth();
  const { setFilters } = useListingsCache();
  // One promise screen, then one goal question, then the map (strategy doc, onboarding).
  const [step, setStep] = useState<'promise' | 'goal'>('promise');

  const handlePurposes = useCallback(
    async (purposes: UserPurpose[]) => {
      if (purposes.length > 0) {
        // Remembered locally; synced to the profile once the user signs in (PurposesSync).
        await storePendingPurposes(purposes);
        if (session?.user?.id && (await saveUserPurposes(session.user.id, purposes))) {
          await refreshProfile();
        }
      }

      const firstSearch = filtersForPurposes(purposes);
      if (firstSearch) {
        setFilters(firstSearch);
        await AsyncStorage.setItem(SAVE_SEARCH_HINT_KEY, '1');
      }

      await markOnboardingDone();
      router.replace({ pathname: '/(tabs)/map', params: { welcomeGoal: purposes[0] ?? 'browse' } });
    },
    [refreshProfile, router, session?.user?.id, setFilters],
  );

  return (
    <View style={styles.container}>
      <AppSystemBars style="light" />
      {step === 'promise' ? (
        <OnboardingPromise
          onStart={() => setStep('goal')}
          onSignIn={() => {
            void markOnboardingDone().then(() => router.replace('/(tabs)/profile/login'));
          }}
        />
      ) : (
        <PurposePicker onDone={(purposes) => void handlePurposes(purposes)} />
      )}
      <View style={styles.languageBar} pointerEvents="box-none">
        <LanguageTopBar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fixedColors.ink },
  languageBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
