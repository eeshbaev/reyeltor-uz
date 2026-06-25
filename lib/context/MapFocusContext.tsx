import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export interface MapFocusTarget {
  listingId: string;
  lat: number;
  lng: number;
}

interface MapFocusContextValue {
  focusVersion: number;
  focusListingOnMap: (target: MapFocusTarget) => void;
  consumeFocus: () => MapFocusTarget | null;
}

const MapFocusContext = createContext<MapFocusContextValue | null>(null);

export function MapFocusProvider({ children }: { children: ReactNode }) {
  const pendingRef = useRef<MapFocusTarget | null>(null);
  const [focusVersion, setFocusVersion] = useState(0);

  const focusListingOnMap = useCallback((target: MapFocusTarget) => {
    pendingRef.current = target;
    setFocusVersion((v) => v + 1);
  }, []);

  const consumeFocus = useCallback(() => {
    const target = pendingRef.current;
    pendingRef.current = null;
    return target;
  }, []);

  const value = useMemo(
    () => ({ focusVersion, focusListingOnMap, consumeFocus }),
    [focusVersion, focusListingOnMap, consumeFocus],
  );

  return <MapFocusContext.Provider value={value}>{children}</MapFocusContext.Provider>;
}

export function useMapFocus() {
  const ctx = useContext(MapFocusContext);
  if (!ctx) throw new Error('useMapFocus must be used within MapFocusProvider');
  return ctx;
}
