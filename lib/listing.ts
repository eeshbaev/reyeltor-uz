import { normalizePropertyTypeKey } from '@/lib/i18n/filterLabels';
import type { ListingCategory, ListingStatus, ListingType, ListingWithPhotos, PropertyLevel, PropertyView } from '@/types';

type StatusBadgeVariant = 'default' | 'success' | 'warning' | 'rent' | 'buy' | 'danger' | 'active' | 'expiring' | 'sold' | 'expired';

export function getListingStatusBadge(listing: {
  type: ListingType;
  status?: ListingStatus;
  archived_reason?: ListingWithPhotos['archived_reason'];
}): { labelKey: string; variant: StatusBadgeVariant } {
  if (listing.status === 'deleted') {
    return { labelKey: 'common.noLongerAvailable', variant: 'danger' };
  }

  if (listing.status === 'archived') {
    switch (listing.archived_reason) {
      case 'rented':
        return { labelKey: 'listing.archivedRented', variant: 'warning' };
      case 'sold':
        return { labelKey: 'listing.archivedSold', variant: 'sold' };
      case 'expired':
        return { labelKey: 'listing.archivedExpired', variant: 'expired' };
      case 'manually_archived':
        return { labelKey: 'listing.archivedManual', variant: 'expired' };
      default:
        return { labelKey: 'common.archived', variant: 'expired' };
    }
  }

  if (listing.type === 'rent') return { labelKey: 'filters.rent', variant: 'rent' };
  if (listing.type === 'lease') return { labelKey: 'filters.lease', variant: 'warning' };
  return { labelKey: 'filters.sale', variant: 'buy' };
}

export function getListingCategory(listing: ListingWithPhotos): ListingCategory {
  if (listing.category) return listing.category;
  if (listing.type === 'lease') return 'commercial';
  if (listing.type === 'rent') return 'residential';
  return 'residential';
}

export function getListingPropertyType(listing: ListingWithPhotos): string | null {
  const raw = listing.property_type ?? (getListingCategory(listing) === 'residential' ? 'residential' : 'office');
  return normalizePropertyTypeKey(raw);
}

export function getListingBathrooms(listing: ListingWithPhotos): number | null {
  return listing.bathrooms ?? null;
}

export function getListingYearBuilt(listing: ListingWithPhotos): number | null {
  return listing.year_built ?? null;
}

export function getListingViews(listing: ListingWithPhotos): PropertyView[] {
  return listing.property_views ?? [];
}

export function getListingLevel(listing: ListingWithPhotos): PropertyLevel | null {
  return listing.level ?? null;
}

export function enrichListing(listing: ListingWithPhotos): ListingWithPhotos {
  if (listing.category && listing.property_type) return listing;

  const isCommercial = listing.type === 'lease' || listing.category === 'commercial';
  const floor = listing.floor;

  let level: PropertyLevel | null = listing.level ?? null;
  if (!level && floor != null) {
    if (floor <= 0) level = 'underground';
    else if (floor === 1) level = 'first_floor';
    else if (floor === 2) level = 'second_floor';
    else if (floor === 3) level = 'third_floor';
    else if (floor >= 10) level = 'high_floor';
    else level = 'mid_floor';
  }

  return {
    ...listing,
    category: listing.category ?? (isCommercial ? 'commercial' : 'residential'),
    property_type: normalizePropertyTypeKey(
      listing.property_type ??
        (isCommercial ? 'office' : listing.rooms >= 4 ? 'multi_family' : 'residential'),
    ),
    bathrooms: listing.bathrooms ?? (listing.rooms >= 3 ? 2 : 1),
    year_built: listing.year_built ?? 2012 + (listing.id.charCodeAt(10) % 12),
    property_views: listing.property_views ?? ['city'],
    level,
  };
}
