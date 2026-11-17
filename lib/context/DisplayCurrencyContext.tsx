import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DISPLAY_CURRENCY_KEY } from '@/lib/constants';
import { StorageCache } from '@/lib/storage/storageCache';
import type { PriceCurrency } from '@/types';

interface DisplayCurrencyContextValue {
  displayCurrency: PriceCurrency;
  setDisplayCurrency: (currency: PriceCurrency) => void;
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null);

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<PriceCurrency>('UZS');

  useEffect(() => {
    let isMounted = true;

    StorageCache.get<PriceCurrency>(DISPLAY_CURRENCY_KEY)
      .then((stored) => {
        if (!isMounted) return;
        if (stored === 'UZS' || stored === 'USD') {
          setDisplayCurrencyState(stored);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Failed to load display currency from storage:', error);
        // Keep default UZS
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setDisplayCurrency = useCallback((currency: PriceCurrency) => {
    setDisplayCurrencyState(currency);
    StorageCache.set(DISPLAY_CURRENCY_KEY, currency);
  }, []);

  const value = useMemo(
    () => ({ displayCurrency, setDisplayCurrency }),
    [displayCurrency, setDisplayCurrency],
  );

  return <DisplayCurrencyContext.Provider value={value}>{children}</DisplayCurrencyContext.Provider>;
}

export function useDisplayCurrency() {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) throw new Error('useDisplayCurrency must be used within DisplayCurrencyProvider');
  return ctx;
}
