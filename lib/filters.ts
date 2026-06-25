import { isInsidePolygon } from '@/lib/map/polygon';
import { filterPriceToUzs } from '@/lib/exchange/cbuRate';
import { normalizePropertyTypeKey } from '@/lib/i18n/filterLabels';
import { enrichListing, getListingCategory, getListingPropertyType } from '@/lib/listing';
import type { ListingFilters, ListingWithPhotos } from '@/types';
import { DEFAULT_FILTERS } from '@/types';

export function countActiveFilters(filters: ListingFilters): number {
  let count = 0;
  if (filters.category !== DEFAULT_FILTERS.category) count += 1;
  if (filters.category === 'residential' && filters.residentialTransaction) count += 1;
  if (filters.category === 'commercial' && filters.commercialTransaction) count += 1;
  if (filters.priceMin || filters.priceMax) count += 1;
  if (filters.roomsMin != null) count += 1;
  if (filters.bathroomsMin != null) count += 1;
  if (filters.areaMin || filters.areaMax) count += 1;
  if (filters.propertyType) count += 1;
  if (filters.yearBuiltMin || filters.yearBuiltMax) count += 1;
  if (filters.views.length > 0) count += 1;
  if (filters.level) count += 1;
  if (filters.listedSinceDays != null) count += 1;
  if (filters.keywords.trim()) count += 1;
  if (filters.districts.length > 0) count += 1;
  if (filters.mapArea) count += 1;
  return count;
}

export function hasAreaSearch(filters: ListingFilters): boolean {
  return Boolean(filters.mapArea) || filters.districts.length > 0;
}

export function hasSearchFiltersActive(filters: ListingFilters): boolean {
  const preserved = resetSearchFiltersPreservingArea(filters);
  return JSON.stringify(preserved) !== JSON.stringify(filters);
}

/** Clear price, rooms, type, etc. while keeping category and drawn/selected area. */
export function resetSearchFiltersPreservingArea(filters: ListingFilters): ListingFilters {
  return {
    ...DEFAULT_FILTERS,
    category: filters.category,
    mapArea: filters.mapArea,
    districts: filters.districts,
  };
}

/** Clear drawn polygon and district picks; keep all other filters. */
export function resetAreaSearch(filters: ListingFilters): ListingFilters {
  return {
    ...filters,
    mapArea: null,
    districts: [],
  };
}

export type NoResultsReason = 'none' | 'area' | 'filters' | 'both' | 'empty';

export function getNoResultsReason(
  items: ListingWithPhotos[],
  filters: ListingFilters,
  usdRate = 12_017,
): NoResultsReason {
  if (applyClientFilters(items, filters, usdRate).length > 0) return 'none';

  const areaOnly = resetSearchFiltersPreservingArea(filters);
  const inArea = applyClientFilters(items, areaOnly, usdRate);
  const areaActive = hasAreaSearch(filters);
  const searchActive = hasSearchFiltersActive(filters);

  if (areaActive && inArea.length === 0) return searchActive ? 'both' : 'area';
  if (searchActive) return 'filters';
  if (areaActive) return 'area';
  return 'empty';
}

/** Show district average badges when only the category is selected (no price, area, etc.). */
export function shouldShowDistrictMarketStats(filters: ListingFilters): boolean {
  const count = countActiveFilters(filters);
  if (filters.category === 'residential') return count === 0;
  if (filters.category === 'commercial') return count === 1;
  return false;
}

function matchesTransaction(listing: ListingWithPhotos, filters: ListingFilters): boolean {
  if (filters.category === 'residential') {
    if (!filters.residentialTransaction) return getListingCategory(listing) === 'residential';
    if (getListingCategory(listing) !== 'residential') return false;
    if (filters.residentialTransaction === 'rent') return listing.type === 'rent';
    return listing.type === 'buy';
  }

  if (!filters.commercialTransaction) return getListingCategory(listing) === 'commercial';
  if (getListingCategory(listing) !== 'commercial') return false;
  if (filters.commercialTransaction === 'lease') return listing.type === 'lease';
  return listing.type === 'buy';
}

export function applyClientFilters(
  items: ListingWithPhotos[],
  filters: ListingFilters,
  usdRate = 12_017,
): ListingWithPhotos[] {
  const priceMinUzs = filters.priceMin
    ? filterPriceToUzs(filters.priceMin, filters.priceCurrency, usdRate)
    : null;
  const priceMaxUzs = filters.priceMax
    ? filterPriceToUzs(filters.priceMax, filters.priceCurrency, usdRate)
    : null;

  return items
    .map(enrichListing)
    .filter((item) => {
      if (getListingCategory(item) !== filters.category) return false;
      if (!matchesTransaction(item, filters)) return false;

      if (priceMinUzs != null && item.price < priceMinUzs) return false;
      if (priceMaxUzs != null && item.price > priceMaxUzs) return false;

      if (filters.category === 'residential') {
        if (filters.roomsMin != null && item.rooms < filters.roomsMin) return false;
        if (filters.bathroomsMin != null && (item.bathrooms ?? 0) < filters.bathroomsMin) return false;
        if (filters.views.length > 0) {
          const itemViews = item.property_views ?? [];
          if (!filters.views.some((v) => itemViews.includes(v))) return false;
        }
        if (filters.level && item.level !== filters.level) return false;
      }

      if (filters.areaMin && item.area_m2 < Number(filters.areaMin)) return false;
      if (filters.areaMax && item.area_m2 > Number(filters.areaMax)) return false;

      if (
        filters.propertyType &&
        getListingPropertyType(item) !== normalizePropertyTypeKey(filters.propertyType)
      )
        return false;

      if (filters.yearBuiltMin && (item.year_built ?? 0) < Number(filters.yearBuiltMin)) return false;
      if (filters.yearBuiltMax && (item.year_built ?? 9999) > Number(filters.yearBuiltMax)) return false;

      if (filters.listedSinceDays != null) {
        const posted = new Date(item.posted_at).getTime();
        const cutoff = Date.now() - filters.listedSinceDays * 86_400_000;
        if (posted < cutoff) return false;
      }

      if (filters.keywords.trim()) {
        const haystack = `${item.description ?? ''} ${item.district} ${getListingPropertyType(item) ?? ''}`.toLowerCase();
        const needles = filters.keywords.toLowerCase().split(/\s+/).filter(Boolean);
        if (!needles.every((word) => haystack.includes(word))) return false;
      }

      if (filters.mapArea) {
        if (!isInsidePolygon(filters.mapArea, item.lat, item.lng)) return false;
      } else if (filters.districts.length > 0 && !filters.districts.includes(item.district)) {
        return false;
      }
      return true;
    });
}

export function countFilterResults(
  items: ListingWithPhotos[],
  filters: ListingFilters,
  usdRate = 12_017,
): number {
  return applyClientFilters(items, filters, usdRate).length;
}
