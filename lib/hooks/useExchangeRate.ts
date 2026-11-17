import { useEffect, useState } from 'react';
import { fetchCbuUsdRate } from '@/lib/exchange/cbuRate';

export function useExchangeRate() {
  const [usdRate, setUsdRate] = useState(12_017);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchCbuUsdRate()
      .then((rate) => {
        if (active) {
          setUsdRate(rate);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch USD rate:', error);
        if (active) {
          setLoading(false);
          // Keep default rate
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return { usdRate, loading };
}
