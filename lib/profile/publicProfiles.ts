import { supabase } from '@/lib/supabase';
import type { ListingWithPhotos, User } from '@/types';

/**
 * Seller details buyers may see (supabase/patch-privacy-v1.sql → public_profiles).
 * Phone is null unless the seller chose to show it. Other users' rows in `users`
 * are not readable at all.
 */
export const PUBLIC_PROFILE_COLUMNS =
  'id, full_name, avatar_url, bio, telegram_username, email, phone, phone_visible, total_posted, total_rented, total_sold, total_expired, avg_days_on_market, close_rate, created_at, last_active_at';

export type PublicProfile = NonNullable<ListingWithPhotos['users']> & Pick<User, 'bio'>;

export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('fetchPublicProfile failed:', error.message);
    return null;
  }
  return (data as PublicProfile | null) ?? null;
}
