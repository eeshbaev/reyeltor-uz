import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { JumpingEmblem } from '@/components/brand/JumpingEmblem';
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
      <View style={[styles.splash, { backgroundColor: theme.colors.background }]}>
        <JumpingEmblem size={88} jumpHeight={22} pauseMs={800} entrance />
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
  },
});
