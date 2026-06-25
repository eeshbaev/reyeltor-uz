import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_FILTERS, type ListingFilters } from '@/types';

interface FilterContextValue {
  filters: ListingFilters;
  setFilters: (filters: ListingFilters) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      resetFilters: () => setFilters(DEFAULT_FILTERS),
    }),
    [filters],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}
