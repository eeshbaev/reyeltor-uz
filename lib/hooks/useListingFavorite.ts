import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useGuestFavoriteAuth } from '@/lib/context/GuestFavoriteAuthContext';
import { subscribeFavoritesChanged } from '@/lib/favorites/events';
import { removeListingFavorite, saveListingFavorite } from '@/lib/favorites/saveListingFavorite';
import { isLocallyFavorited, usesLocalFavoriteStorage } from '@/lib/favorites/storage';
import { hapticLight } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';

export function useListingFavorite(listingId: string | null) {
  const { session } = useAuth();
  const { openGuestFavoriteAuth } = useGuestFavoriteAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const refreshFavoriteState = useCallback(async () => {
    if (!listingId) {
      setIsFavorite(false);
      setJustSaved(false);
      return;
    }

    if (!session?.user?.id) {
      setIsFavorite(false);
      return;
    }

    if (usesLocalFavoriteStorage(listingId)) {
      const local = await isLocallyFavorited(listingId);
      setIsFavorite(local);
      return;
    }

    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('listing_id', listingId)
      .maybeSingle();
    setIsFavorite(!!data);
  }, [listingId, session?.user?.id]);

  useEffect(() => {
    void refreshFavoriteState();
  }, [refreshFavoriteState]);

  useEffect(() => {
    if (!listingId) return;
    return subscribeFavoritesChanged(() => {
      void refreshFavoriteState();
    });
  }, [listingId, refreshFavoriteState]);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 1600);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const toggleFavorite = useCallback(async () => {
    if (!listingId) return;

    if (!session?.user?.id) {
      openGuestFavoriteAuth(listingId);
      return;
    }

    const previous = isFavorite;
    const next = !previous;
    setIsFavorite(next);
    if (next) {
      hapticLight();
      setJustSaved(true);
    } else {
      setJustSaved(false);
    }

    const rollback = () => {
      setIsFavorite(previous);
      setJustSaved(false);
    };

    const ok = next
      ? await saveListingFavorite(session.user.id, listingId)
      : await removeListingFavorite(session.user.id, listingId);

    if (!ok) {
      rollback();
    }
  }, [isFavorite, listingId, openGuestFavoriteAuth, session?.user?.id]);

  return { isFavorite, justSaved, toggleFavorite };
}
