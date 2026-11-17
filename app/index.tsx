import { useEffect, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { isOnboardingDone } from '@/lib/onboarding/storage';
/** If AsyncStorage is slow on older devices, assume first launch → show onboarding. */
const ROUTE_DECISION_TIMEOUT_MS = 4_000;

export default function Index() {
  const [target, setTarget] = useState<'onboarding' | 'map' | null>(null);
  const resolvedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const resolve = (next: 'onboarding' | 'map') => {
      if (cancelled || resolvedRef.current) return;
      resolvedRef.current = true;
      setTarget(next);
    };

    const timeout = setTimeout(() => resolve('onboarding'), ROUTE_DECISION_TIMEOUT_MS);

    isOnboardingDone()
      .then((done) => resolve(done ? 'map' : 'onboarding'))
      .catch(() => resolve('onboarding'));

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  if (target === null) {
    return <AppLoadingScreen />;
  }

  return <Redirect href={target === 'onboarding' ? '/onboarding' : '/(tabs)/map'} />;
}
