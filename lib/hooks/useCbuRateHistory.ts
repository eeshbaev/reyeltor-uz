import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  getLastYearPoints,
  loadCurrencyData,
  type CbuRatePoint,
  type CurrencyDataSource,
} from '@/lib/exchange/cbuRateHistory';
import { getBundledRatePoints } from '@/lib/tools/currencyHistory';

export function useCbuRateHistory() {
  const [points, setPoints] = useState<CbuRatePoint[]>(() => getLastYearPoints(getBundledRatePoints()));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [source, setSource] = useState<CurrencyDataSource>('bundled');
  const loadRef = useRef<Promise<void> | null>(null);

  const applyLoad = useCallback(
    (result: Awaited<ReturnType<typeof loadCurrencyData>>) => {
      setPoints(getLastYearPoints(result.points));
      setUpdatedAt(result.updatedAt);
      setSource(result.source);
    },
    [],
  );

  const refresh = useCallback(async (force = false) => {
    if (loadRef.current) {
      await loadRef.current;
      if (!force) return;
    }

    const task = (async () => {
      try {
        const cached = await loadCurrencyData(false, { cacheOnly: true });
        applyLoad(cached);
        setLoading(false);

        setRefreshing(true);
        const fresh = await loadCurrencyData(force);
        applyLoad(fresh);
      } finally {
        loadRef.current = null;
        setRefreshing(false);
        setLoading(false);
      }
    })();

    loadRef.current = task;
    await task;
  }, [applyLoad]);

  useEffect(() => {
    void refresh(false);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh(false);
    });

    return () => sub.remove();
  }, [refresh]);

  return {
    points,
    loading,
    refreshing,
    updatedAt,
    source,
    fromCache: source !== 'network',
    refresh,
  };
}
