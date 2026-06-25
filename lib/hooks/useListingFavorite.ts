import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { GUEST_FAVORITES_KEY } from '@/lib/constants';
import { useAuth } from '@/lib/context/AuthContext';
import { hapticLight } from '@/lib/haptics';
import { isDemoId } from '@/lib/demo';
import { supabase } from '@/lib/supabase';

export function useListingFavorite(listingId: string | null) {
  const { session } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!listingId) {
      setIsFavorite(false);
      return;
    }

    (async () => {
      if (session?.user?.id && !isDemoId(listingId)) {
        const { data } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('listing_id', listingId)
          .maybeSingle();
        setIsFavorite(!!data);
        return;
      }

      const raw = await AsyncStorage.getItem(GUEST_FAVORITES_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      setIsFavorite(ids.includes(listingId));
    })();
  }, [listingId, session?.user?.id]);

  const toggleFavorite = useCallback(async () => {
    if (!listingId) return;

    if (session?.user?.id && !isDemoId(listingId)) {
      if (isFavorite) {
        await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('listing_id', listingId);
      } else {
        await supabase.from('favorites').insert({ user_id: session.user.id, listing_id: listingId });
        hapticLight();
      }
      setIsFavorite(!isFavorite);
      return;
    }

    const raw = await AsyncStorage.getItem(GUEST_FAVORITES_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const next = isFavorite ? ids.filter((id) => id !== listingId) : [...ids, listingId];
    await AsyncStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(next));
    if (!isFavorite) hapticLight();
    setIsFavorite(!isFavorite);
  }, [isFavorite, listingId, session?.user?.id]);

  return { isFavorite, toggleFavorite };
}
