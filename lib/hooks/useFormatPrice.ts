import { useMemo } from 'react';
import { useDisplayCurrency } from '@/lib/context/DisplayCurrencyContext';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { formatListingPrice, formatPriceShort as formatPriceShortBase } from '@/lib/format';

export function useFormatPrice() {
  const { displayCurrency } = useDisplayCurrency();
  const { usdRate } = useListingsCache();

  return useMemo(
    () => ({
      displayCurrency,
      formatPrice: (priceUzs: number) => formatListingPrice(priceUzs, displayCurrency, usdRate),
      formatPriceShort: (priceUzs: number) => formatPriceShortBase(priceUzs, displayCurrency, usdRate),
    }),
    [displayCurrency, usdRate],
  );
}
