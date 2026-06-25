import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DISPLAY_CURRENCY_KEY } from '@/lib/constants';
import type { PriceCurrency } from '@/types';

interface DisplayCurrencyContextValue {
  displayCurrency: PriceCurrency;
  setDisplayCurrency: (currency: PriceCurrency) => void;
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null);

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<PriceCurrency>('UZS');

  useEffect(() => {
    AsyncStorage.getItem(DISPLAY_CURRENCY_KEY).then((stored) => {
      if (stored === 'UZS' || stored === 'USD') {
        setDisplayCurrencyState(stored);
      }
    });
  }, []);

  const setDisplayCurrency = useCallback((currency: PriceCurrency) => {
    setDisplayCurrencyState(currency);
    AsyncStorage.setItem(DISPLAY_CURRENCY_KEY, currency);
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
