import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { PostLoginWelcomeBack } from '@/components/registration/PostLoginWelcomeBack';
import { PostRegistrationWelcome } from '@/components/registration/PostRegistrationWelcome';
import { AppSystemBars } from '@/components/ui/AppSystemBars';
import { resolveWelcomeDisplayName } from '@/lib/auth/displayName';
import { useAuth } from '@/lib/context/AuthContext';
import i18n from '@/lib/i18n';
import { parseRouteParam } from '@/lib/navigation/routeParams';
import { getPendingWelcomeName, getRegisteredFullName } from '@/lib/onboarding/storage';

export default function RegistrationWelcomeScreen() {
  const params = useLocalSearchParams<{
    name?: string | string[];
    mode?: string | string[];
    returnTo?: string | string[];
  }>();
  const { profile, session } = useAuth();
  const [storedName, setStoredName] = useState<string | undefined>();
  const [registeredFullName, setRegisteredFullName] = useState<string | undefined>();
  const mode = parseRouteParam(params.mode) === 'returning' ? 'returning' : 'first';
  const returnTo = parseRouteParam(params.returnTo);

  useEffect(() => {
    getPendingWelcomeName()
      .then(setStoredName)
      .catch((error) => {
        console.error(i18n.t('errors.auth.welcomeNameLoadFailed'), error);
      });
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setRegisteredFullName(undefined);
      return;
    }
    getRegisteredFullName(userId)
      .then(setRegisteredFullName)
      .catch((error) => {
        console.error(i18n.t('errors.auth.registrationNameLoadFailed'), error);
        setRegisteredFullName(undefined);
      });
  }, [session?.user?.id]);

  const metadataName =
    typeof session?.user?.user_metadata?.full_name === 'string'
      ? session.user.user_metadata.full_name
      : undefined;
  const fullName = resolveWelcomeDisplayName({
    routeName: parseRouteParam(params.name),
    storedName,
    registeredFullName,
    metadataName,
    profileName: profile?.full_name,
  });

  return (
    <View style={styles.container}>
      <AppSystemBars hidden />
      {mode === 'returning' ? (
        <PostLoginWelcomeBack fullName={fullName} returnTo={returnTo} />
      ) : (
        <PostRegistrationWelcome fullName={fullName} returnTo={returnTo} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
});
