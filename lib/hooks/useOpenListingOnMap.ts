import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useMapFocus } from '@/lib/context/MapFocusContext';

export function useOpenListingOnMap() {
  const router = useRouter();
  const { focusListingOnMap } = useMapFocus();

  return useCallback(
    (listingId: string, lat: number, lng: number) => {
      focusListingOnMap({ listingId, lat, lng });
      router.push('/(tabs)/map');
    },
    [focusListingOnMap, router],
  );
}
