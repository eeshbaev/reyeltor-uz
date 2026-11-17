import { useEffect, useState } from 'react';
import { searchLocationSuggestions, type LocationSuggestion } from '@/lib/map/locationSuggestions';

export function useLocationSearch(query: string, language: string, enabled = true) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      const next = await searchLocationSuggestions(trimmed, language);
      if (cancelled) return;
      setSuggestions(next);
      setLoading(false);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, language, enabled]);

  return { suggestions, loading };
}
