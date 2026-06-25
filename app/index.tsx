import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ONBOARDING_DONE_KEY } from '@/lib/onboarding/constants';
import { useTheme } from '@/lib/theme';

export default function Index() {
  const theme = useTheme();
  const [target, setTarget] = useState<'onboarding' | 'map' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DONE_KEY).then((done) => {
      setTarget(done === '1' ? 'map' : 'onboarding');
    });
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return <Redirect href={target === 'onboarding' ? '/onboarding' : '/(tabs)/map'} />;
}
