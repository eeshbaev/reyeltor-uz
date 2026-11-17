import { ReactNode } from 'react';
import { MapChromeProvider } from '@/lib/context/MapChromeContext';
import { MapFocusProvider } from '@/lib/context/MapFocusContext';
import { PinProvider } from '@/lib/context/PinContext';

interface MapContextProviderProps {
  children: ReactNode;
}

/**
 * Combines all map-related providers into a single provider to reduce nesting depth.
 * Groups: MapFocusProvider, MapChromeProvider, PinProvider
 */
export function MapContextProvider({ children }: MapContextProviderProps) {
  return (
    <MapFocusProvider>
      <MapChromeProvider>
        <PinProvider>
          {children}
        </PinProvider>
      </MapChromeProvider>
    </MapFocusProvider>
  );
}
