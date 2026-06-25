import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_DONE_KEY, WELCOME_SHOWN_KEY } from './constants';

export async function isOnboardingDone(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
  return value === '1';
}

export async function markOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1');
}

export async function markWelcomeShown(): Promise<void> {
  await AsyncStorage.setItem(WELCOME_SHOWN_KEY, '1');
}
