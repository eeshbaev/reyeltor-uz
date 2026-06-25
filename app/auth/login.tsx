import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LoginRedirect() {
  const { message } = useLocalSearchParams<{ message?: string }>();

  return (
    <Redirect
      href={
        typeof message === 'string'
          ? { pathname: '/(tabs)/profile/login', params: { message } }
          : '/(tabs)/profile/login'
      }
    />
  );
}
