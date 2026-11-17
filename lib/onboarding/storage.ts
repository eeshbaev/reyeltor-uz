import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ONBOARDING_DONE_KEY,
  PENDING_WELCOME_NAME_KEY,
  REGISTERED_FULL_NAMES_KEY,
  WELCOME_SHOWN_KEY,
} from './constants';

type RegisteredFullNames = Record<string, string>;

async function readRegisteredFullNames(): Promise<RegisteredFullNames> {
  const raw = await AsyncStorage.getItem(REGISTERED_FULL_NAMES_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as RegisteredFullNames;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function isOnboardingDone(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
  return value === '1';
}

export async function markOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1');
}

export async function markWelcomeShown(): Promise<void> {
  await AsyncStorage.multiSet([
    [WELCOME_SHOWN_KEY, '1'],
    [PENDING_WELCOME_NAME_KEY, ''],
  ]);
}

export async function setPendingWelcomeName(fullName: string): Promise<void> {
  const trimmed = fullName.trim();
  if (!trimmed) return;
  await AsyncStorage.setItem(PENDING_WELCOME_NAME_KEY, trimmed);
}

export async function getPendingWelcomeName(): Promise<string | undefined> {
  const value = await AsyncStorage.getItem(PENDING_WELCOME_NAME_KEY);
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export async function setRegisteredFullName(userId: string, fullName: string): Promise<void> {
  const trimmed = fullName.trim();
  if (!userId || !trimmed) return;
  const names = await readRegisteredFullNames();
  names[userId] = trimmed;
  await AsyncStorage.setItem(REGISTERED_FULL_NAMES_KEY, JSON.stringify(names));
}

export async function getRegisteredFullName(userId: string): Promise<string | undefined> {
  if (!userId) return undefined;
  const names = await readRegisteredFullNames();
  const trimmed = names[userId]?.trim();
  return trimmed || undefined;
}

export async function isWelcomeShown(): Promise<boolean> {
  const value = await AsyncStorage.getItem(WELCOME_SHOWN_KEY);
  return value === '1';
}
