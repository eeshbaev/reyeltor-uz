import * as Linking from 'expo-linking';

/** Deep link Supabase should redirect to after password recovery email is opened. */
export function getPasswordResetRedirectUrl(): string {
  return Linking.createURL('auth/reset-password');
}
