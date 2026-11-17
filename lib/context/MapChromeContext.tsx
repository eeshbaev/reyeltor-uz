import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';

type MapOverlayDismissHandler = () => void;

interface MapChromeContextValue {
  registerMapOverlayDismiss: (handler: MapOverlayDismissHandler | null) => void;
  dismissMapOverlays: () => void;
}

const MapChromeContext = createContext<MapChromeContextValue | null>(null);

export function MapChromeProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<MapOverlayDismissHandler | null>(null);

  const registerMapOverlayDismiss = useCallback((handler: MapOverlayDismissHandler | null) => {
    handlerRef.current = handler;
  }, []);

  const dismissMapOverlays = useCallback(() => {
    handlerRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ registerMapOverlayDismiss, dismissMapOverlays }),
    [registerMapOverlayDismiss, dismissMapOverlays],
  );

  return <MapChromeContext.Provider value={value}>{children}</MapChromeContext.Provider>;
}

export function useMapChrome() {
  const ctx = useContext(MapChromeContext);
  if (!ctx) throw new Error('useMapChrome must be used within MapChromeProvider');
  return ctx;
}
