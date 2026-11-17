import { ensureUserProfile } from '@/lib/auth/ensureUserProfile';
import { notifyFavoritesChanged } from '@/lib/favorites/events';
import { setLocalFavorite, usesLocalFavoriteStorage } from '@/lib/favorites/storage';
import { requestFavoriteNotificationPermission } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

export async function saveListingFavorite(userId: string, listingId: string): Promise<boolean> {
  if (usesLocalFavoriteStorage(listingId)) {
    await setLocalFavorite(listingId, true);
    notifyFavoritesChanged();
    return true;
  }

  let { error } = await supabase.from('favorites').insert({ user_id: userId, listing_id: listingId });

  if (error?.code === '23503') {
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) await ensureUserProfile(authData.user);
    ({ error } = await supabase.from('favorites').insert({ user_id: userId, listing_id: listingId }));
  }

  if (error) {
    console.warn('Favorite insert failed:', error.message);
    return false;
  }

  notifyFavoritesChanged();
  void requestFavoriteNotificationPermission(userId);
  void (async () => {
    const { count } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (count === 1) {
      const { processReferralFirstFavorite } = await import('@/lib/growth/referral');
      void processReferralFirstFavorite(userId);
    }
  })();
  return true;
}

export async function removeListingFavorite(userId: string, listingId: string): Promise<boolean> {
  if (usesLocalFavoriteStorage(listingId)) {
    await setLocalFavorite(listingId, false);
    notifyFavoritesChanged();
    return true;
  }

  const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId);
  if (error) {
    console.warn('Favorite delete failed:', error.message);
    return false;
  }
  notifyFavoritesChanged();
  return true;
}
