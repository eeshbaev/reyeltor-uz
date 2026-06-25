import { useEffect, useState } from 'react';
import { getMarketDataUpdatedAt, subscribeMarketData } from '@/lib/market/marketDataStore';

/** Re-render when synced market averages / tool costs change. */
export function useMarketDataVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setVersion(getMarketDataUpdatedAt() ?? 0);
    return subscribeMarketData(() => {
      setVersion(getMarketDataUpdatedAt() ?? Date.now());
    });
  }, []);

  return version;
}
