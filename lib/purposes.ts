import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { DEFAULT_FILTERS, type ListingFilters, type UserPurpose } from '@/types';

/**
 * User purposes personalize onboarding and the first map search only.
 * They never gate features — every user can browse, post, save searches, and get alerts.
 */
export const USER_PURPOSES: readonly UserPurpose[] = ['investor', 'realtor', 'rent', 'buy'] as const;

const PENDING_KEY = '@reyeltor/pending_purposes';
export const SAVE_SEARCH_HINT_KEY = '@reyeltor/save_search_hint';

export function sanitizePurposes(value: unknown): UserPurpose[] {
  if (!Array.isArray(value)) return [];
  return USER_PURPOSES.filter((purpose) => value.includes(purpose));
}

/** Chosen during onboarding, before the user has an account. */
export async function storePendingPurposes(purposes: UserPurpose[]): Promise<void> {
  if (purposes.length === 0) {
    await AsyncStorage.removeItem(PENDING_KEY);
    return;
  }
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(sanitizePurposes(purposes)));
}

export async function readPendingPurposes(): Promise<UserPurpose[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? sanitizePurposes(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export async function clearPendingPurposes(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}

export async function saveUserPurposes(userId: string, purposes: UserPurpose[]): Promise<boolean> {
  const { error } = await supabase.from('users').update({ purposes: sanitizePurposes(purposes) }).eq('id', userId);
  if (error) {
    console.warn('saveUserPurposes failed:', error.message);
    return false;
  }
  return true;
}

/**
 * Starting map filters for the selected purposes (the "first search").
 * Renting is usually the most urgent need, then buying, then investing.
 */
export function filtersForPurposes(purposes: UserPurpose[]): ListingFilters | null {
  if (purposes.includes('rent')) {
    return { ...DEFAULT_FILTERS, category: 'residential', residentialTransaction: 'rent' };
  }
  if (purposes.includes('buy')) {
    return { ...DEFAULT_FILTERS, category: 'residential', residentialTransaction: 'sale' };
  }
  if (purposes.includes('investor')) {
    return { ...DEFAULT_FILTERS, category: 'commercial', commercialTransaction: 'sale' };
  }
  return null;
}
