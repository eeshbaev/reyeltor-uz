import type { ListingFilters, MapAreaPolygon } from '@/types';

/** Apply a drawn map polygon while keeping all other active filters (price, type, rooms, etc.). */
export function buildFiltersForMapArea(base: ListingFilters, area: MapAreaPolygon): ListingFilters {
  return {
    ...base,
    mapArea: area,
    districts: [],
  };
}
