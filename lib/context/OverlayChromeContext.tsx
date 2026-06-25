import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface OverlayChromeContextValue {
  isSuppressed: boolean;
  setOverlayOpen: (key: string, open: boolean) => void;
}

const OverlayChromeContext = createContext<OverlayChromeContextValue | null>(null);

export function OverlayChromeProvider({ children }: { children: ReactNode }) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());

  const setOverlayOpen = useCallback((key: string, open: boolean) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (open) next.add(key);
      else next.delete(key);
      if (next.size === prev.size && [...next].every((k) => prev.has(k))) return prev;
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ isSuppressed: openKeys.size > 0, setOverlayOpen }),
    [openKeys, setOverlayOpen],
  );

  return <OverlayChromeContext.Provider value={value}>{children}</OverlayChromeContext.Provider>;
}

export function useOverlayChrome() {
  const ctx = useContext(OverlayChromeContext);
  if (!ctx) throw new Error('useOverlayChrome must be used within OverlayChromeProvider');
  return ctx;
}
