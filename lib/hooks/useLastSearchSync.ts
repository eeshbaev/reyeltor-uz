import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/context/AuthContext';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { savedSearchesKey } from '@/lib/hooks/useSavedSearches';
import { requestSavedSearchNotificationPermission } from '@/lib/notifications';
import { defaultSavedSearchName, isAlertableSearch, savedFiltersKey, setLastSearch } from '@/lib/savedSearches';

/** Asked once: alerts for the last search need notification permission. */
const PERMISSION_ASKED_KEY = 'last-search-permission-asked';

/** Wait for the user to stop adjusting filters before storing the search. */
const SYNC_DELAY_MS = 4_000;

/**
 * Keeps the signed-in user's latest map search on the server, so new listings that match it
 * can be pushed ("last search" alerts). Only specific searches are stored (district, price,
 * rooms, type, area or keywords) — "everything" would alert on every listing.
 */
export function useLastSearchSync(): void {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { filters } = useListingsCache();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const lastSentKey = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !isAlertableSearch(filters)) return undefined;
    const key = savedFiltersKey(filters);
    if (key === lastSentKey.current) return undefined;

    const timer = setTimeout(() => {
      lastSentKey.current = key;
      setLastSearch(filters, defaultSavedSearchName(t, filters))
        .then(async () => {
          await queryClient.invalidateQueries({ queryKey: savedSearchesKey(userId) });
          if ((await AsyncStorage.getItem(PERMISSION_ASKED_KEY)) !== '1') {
            await AsyncStorage.setItem(PERMISSION_ASKED_KEY, '1');
            await requestSavedSearchNotificationPermission(userId);
          }
        })
        .catch((error) => {
          lastSentKey.current = null; // retry on the next change
          if (__DEV__) console.warn('[last-search] not stored:', error instanceof Error ? error.message : error);
        });
    }, SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [filters, queryClient, t, userId]);
}
