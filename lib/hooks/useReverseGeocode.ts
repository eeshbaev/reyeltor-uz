import { useEffect, useState } from 'react';
import { reverseGeocode, type ReverseGeocodeResult } from '@/lib/map/reverseGeocode';

export function useReverseGeocode(lat: number, lng: number, language: string, enabled = true) {
  const [result, setResult] = useState<ReverseGeocodeResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setResult(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      const next = await reverseGeocode(lat, lng, language);
      if (cancelled) return;
      setResult(next);
      setLoading(false);
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lat, lng, language, enabled]);

  return { result, loading };
}
