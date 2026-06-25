import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  getLastYearPoints,
  loadCbuRateHistory,
  syncCbuRateHistory,
  type CbuRatePoint,
} from '@/lib/exchange/cbuRateHistory';

export function useCbuRateHistory() {
  const [points, setPoints] = useState<CbuRatePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(true);

  const applyResult = useCallback(
    (result: { points: CbuRatePoint[]; fromCache: boolean; updatedAt: number | null }) => {
      setPoints(getLastYearPoints(result.points));
      setFromCache(result.fromCache);
      setUpdatedAt(result.updatedAt);
    },
    [],
  );

  const refresh = useCallback(
    async (force = false) => {
      setRefreshing(true);
      try {
        const result = await syncCbuRateHistory({ force });
        applyResult(result);
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [applyResult],
  );

  useEffect(() => {
    let active = true;

    (async () => {
      const cached = await loadCbuRateHistory();
      if (active && cached.length) {
        setPoints(getLastYearPoints(cached));
        setLoading(false);
      }
      if (active) await refresh(false);
    })();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh(false);
    });

    return () => {
      active = false;
      sub.remove();
    };
  }, [refresh]);

  return { points, loading, refreshing, updatedAt, fromCache, refresh };
}
