import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { TASHKENT_CENTER } from '@/lib/constants';

interface PinContextValue {
  lat: number;
  lng: number;
  addressLabel: string | null;
  setPin: (lat: number, lng: number, addressLabel?: string | null) => void;
}

const PinContext = createContext<PinContextValue | null>(null);

export function PinProvider({ children }: { children: ReactNode }) {
  const [lat, setLat] = useState<number>(TASHKENT_CENTER.latitude);
  const [lng, setLng] = useState<number>(TASHKENT_CENTER.longitude);
  const [addressLabel, setAddressLabel] = useState<string | null>(null);

  // OPTIMIZATION #5: Memoize context value to prevent unnecessary re-renders
  const setPin = useCallback((nextLat: number, nextLng: number, nextAddress: string | null = null) => {
    setLat(nextLat);
    setLng(nextLng);
    setAddressLabel(nextAddress);
  }, []);

  const value = useMemo(
    () => ({
      lat,
      lng,
      addressLabel,
      setPin,
    }),
    [lat, lng, addressLabel, setPin],
  );

  return <PinContext.Provider value={value}>{children}</PinContext.Provider>;
}

export function usePin() {
  const ctx = useContext(PinContext);
  if (!ctx) throw new Error('usePin must be used within PinProvider');
  return ctx;
}
