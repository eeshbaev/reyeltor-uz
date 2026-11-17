import AsyncStorage from '@react-native-async-storage/async-storage';
import { GUEST_FAVORITES_KEY } from '@/lib/constants';
import { isDemoId } from '@/lib/demo';

/** Demo listing IDs and other listings that cannot be stored in Supabase favorites. */
export function usesLocalFavoriteStorage(listingId: string): boolean {
  return isDemoId(listingId);
}

export async function readLocalFavoriteIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(GUEST_FAVORITES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export async function isLocallyFavorited(listingId: string): Promise<boolean> {
  const ids = await readLocalFavoriteIds();
  return ids.includes(listingId);
}

export async function setLocalFavorite(listingId: string, favorited: boolean): Promise<string[]> {
  const ids = await readLocalFavoriteIds();
  const next = favorited ? (ids.includes(listingId) ? ids : [...ids, listingId]) : ids.filter((id) => id !== listingId);
  await AsyncStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(next));
  return next;
}

export function partitionFavoriteIds(ids: string[]): { remoteIds: string[]; localIds: string[] } {
  const remoteIds: string[] = [];
  const localIds: string[] = [];
  for (const id of ids) {
    if (usesLocalFavoriteStorage(id)) localIds.push(id);
    else remoteIds.push(id);
  }
  return { remoteIds, localIds };
}
