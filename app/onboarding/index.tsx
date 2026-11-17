import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LanguageTopBar } from '@/components/i18n/LanguageTopBar';
import { OnboardingPager } from '@/components/onboarding/OnboardingPager';
import { PurposePicker } from '@/components/onboarding/PurposePicker';
import { AppSystemBars } from '@/components/ui/AppSystemBars';
import { useAuth } from '@/lib/context/AuthContext';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { markOnboardingDone } from '@/lib/onboarding/storage';
import { filtersForPurposes, SAVE_SEARCH_HINT_KEY, saveUserPurposes, storePendingPurposes } from '@/lib/purposes';
import type { UserPurpose } from '@/types';

export default function OnboardingScreen() {
  const router = useRouter();
  const { session, refreshProfile } = useAuth();
  const { setFilters } = useListingsCache();
  const [step, setStep] = useState<'slides' | 'purposes'>('slides');

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
      router.replace('/(tabs)/map');
    },
    [refreshProfile, router, session?.user?.id, setFilters],
  );

  return (
    <View style={styles.container}>
      <AppSystemBars style="light" />
      {step === 'slides' ? (
        <OnboardingPager onComplete={() => setStep('purposes')} />
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
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  languageBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
