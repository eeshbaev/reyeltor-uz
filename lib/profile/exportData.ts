import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';

/**
 * "Export my data" (manual O-10): everything the account holds, as one readable JSON file,
 * handed to the system share sheet. Nothing is uploaded anywhere by this.
 */
export async function exportMyData(userId: string): Promise<'shared' | 'unavailable'> {
  const [profile, listings, favorites, savedSearches, coins] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('listings').select('*, listing_photos(*)').eq('user_id', userId),
    supabase.from('favorites').select('listing_id, saved_at').eq('user_id', userId),
    supabase.from('saved_searches').select('name, filters, notify_enabled, kind, created_at').eq('user_id', userId),
    supabase.from('coin_transactions').select('amount, type, created_at').eq('user_id', userId),
  ]);
  const firstError = [profile, listings, favorites, savedSearches, coins].find((r) => r.error)?.error;
  if (firstError) throw firstError;

  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'Reyeltor-uz',
    profile: profile.data,
    listings: listings.data ?? [],
    favorites: favorites.data ?? [],
    savedSearches: savedSearches.data ?? [],
    coinHistory: coins.data ?? [],
  };

  const path = `${FileSystem.cacheDirectory}reyeltor-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Reyeltor-uz' });
  return 'shared';
}
