export const RESIDENTIAL_PROPERTY_TYPES = [
  'any',
  'residential',
  'condo_strata',
  'vacant_land',
  'recreational',
  'multi_family',
  'mansion',
  'country_house',
  'parking',
  'apartment',
  'townhouse',
  'duplex',
] as const;

export const COMMERCIAL_PROPERTY_TYPES = [
  'any',
  'business',
  'retail',
  'industrial',
  'office',
  'vacant_land',
  'agriculture',
  'hospitality',
  'institutional',
  'warehouse',
] as const;

export const PROPERTY_VIEWS = ['city', 'mountain', 'river', 'park', 'road', 'playground'] as const;

export const PROPERTY_LEVELS = [
  'underground',
  'first_floor',
  'second_floor',
  'third_floor',
  'mid_floor',
  'high_floor',
  'top_floor',
  'penthouse',
] as const;

export const LISTED_SINCE_OPTIONS = [
  { days: null, key: 'any' },
  { days: 7, key: 'days7' },
  { days: 30, key: 'days30' },
  { days: 90, key: 'days90' },
  { days: 180, key: 'days180' },
] as const;

export type ResidentialPropertyType = (typeof RESIDENTIAL_PROPERTY_TYPES)[number];
export type CommercialPropertyType = (typeof COMMERCIAL_PROPERTY_TYPES)[number];
export type PropertyView = (typeof PROPERTY_VIEWS)[number];
export type PropertyLevel = (typeof PROPERTY_LEVELS)[number];
