import { useEffect, useState } from 'react';
import { getDistrictTwelveMonthTrend, type DistrictTrendPoint } from '@/lib/market/districtPriceHistory';
import { getMarketDataSnapshot, subscribeMarketData } from '@/lib/market/marketDataStore';

/** Load 12-month rent/sale trend for a district; refreshes when market data syncs. */
export function useDistrictTwelveMonthTrend(
  district: string,
  category: 'residential' | 'commercial',
): DistrictTrendPoint[] {
  const [data, setData] = useState<DistrictTrendPoint[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const snapshot = getMarketDataSnapshot();
      const series = await getDistrictTwelveMonthTrend(district, category, snapshot);
      if (!cancelled) setData(series);
    };

    void load();
    return subscribeMarketData(() => {
      void load();
    });
  }, [district, category]);

  return data;
}
