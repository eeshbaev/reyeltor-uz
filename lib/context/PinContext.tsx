import { createContext, useContext, useState, type ReactNode } from 'react';
import { TASHKENT_CENTER } from '@/lib/constants';

interface PinContextValue {
  lat: number;
  lng: number;
  setPin: (lat: number, lng: number) => void;
}

const PinContext = createContext<PinContextValue | null>(null);

export function PinProvider({ children }: { children: ReactNode }) {
  const [lat, setLat] = useState<number>(TASHKENT_CENTER.latitude);
  const [lng, setLng] = useState<number>(TASHKENT_CENTER.longitude);

  return (
    <PinContext.Provider value={{ lat, lng, setPin: (nextLat, nextLng) => { setLat(nextLat); setLng(nextLng); } }}>
      {children}
    </PinContext.Provider>
  );
}

export function usePin() {
  const ctx = useContext(PinContext);
  if (!ctx) throw new Error('usePin must be used within PinProvider');
  return ctx;
}
