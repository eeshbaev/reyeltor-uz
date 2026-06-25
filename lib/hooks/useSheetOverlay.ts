import { useEffect } from 'react';
import { useOverlayChrome } from '@/lib/context/OverlayChromeContext';

/** Hides the tab bar and registers an overlay while a sheet/modal is open. */
export function useSheetOverlay(key: string, isOpen: boolean) {
  const { setOverlayOpen } = useOverlayChrome();

  useEffect(() => {
    setOverlayOpen(key, isOpen);
    return () => setOverlayOpen(key, false);
  }, [isOpen, key, setOverlayOpen]);
}
