export type ListingType = 'rent' | 'buy' | 'lease';
export type ListingCategory = 'residential' | 'commercial';
export type PriceCurrency = 'UZS' | 'USD';
export type ListingStatus = 'active' | 'archived' | 'deleted';
export type ArchivedReason = 'rented' | 'sold' | 'expired' | 'manually_archived';
export type FlagReason = 'already_rented' | 'wrong_price' | 'fake_photos' | 'duplicate';
export type CoinType = 'welcome' | 'checkin' | 'post_cost' | 'reactivation';

export interface User {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  telegram_username?: string | null;
  avatar_url?: string | null;
  total_posted: number;
  total_rented: number;
  total_sold: number;
  total_expired: number;
  avg_days_on_market: number | null;
  close_rate: number | null;
  coin_balance: number;
  last_active_at: string;
  created_at: string;
}

export interface Listing {
  id: string;
  user_id: string;
  type: ListingType;
  category?: ListingCategory;
  property_type?: string | null;
  bathrooms?: number | null;
  year_built?: number | null;
  property_views?: PropertyView[];
  level?: PropertyLevel | null;
  price: number;
  rooms: number;
  area_m2: number;
  floor: number | null;
  total_floors: number | null;
  district: string;
  lat: number;
  lng: number;
  description: string | null;
  status: ListingStatus;
  archived_reason: ArchivedReason | null;
  is_featured: boolean;
  view_count: number;
  posted_at: string;
  last_edited_at: string;
  expires_at: string;
  archived_at: string | null;
  deletes_at: string | null;
}

export type PropertyView = 'city' | 'mountain' | 'river' | 'park' | 'road' | 'playground';
export type PropertyLevel =
  | 'underground'
  | 'first_floor'
  | 'second_floor'
  | 'third_floor'
  | 'mid_floor'
  | 'high_floor'
  | 'top_floor'
  | 'penthouse';

export interface ListingPhoto {
  id: string;
  listing_id: string;
  storage_path: string;
  order_index: number;
}

export interface PriceHistoryEntry {
  id: string;
  listing_id: string;
  old_price: number;
  new_price: number;
  changed_at: string;
}

export interface Flag {
  id: string;
  listing_id: string;
  user_id: string | null;
  reason: FlagReason;
  device_id: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  saved_at: string;
}

export interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: CoinType;
  listing_id: string | null;
  created_at: string;
}

export interface CheckinLog {
  id: string;
  user_id: string;
  checked_in_on: string;
}

export interface ListingWithPhotos extends Listing {
  listing_photos?: ListingPhoto[];
  users?: Pick<
    User,
    | 'id'
    | 'full_name'
    | 'phone'
    | 'telegram_username'
    | 'avatar_url'
    | 'created_at'
    | 'last_active_at'
    | 'close_rate'
    | 'total_posted'
    | 'total_rented'
    | 'total_sold'
    | 'total_expired'
    | 'avg_days_on_market'
  >;
}

export interface MapListingPoint {
  id: string;
  lat: number;
  lng: number;
  price: number;
  type: ListingType;
  rooms: number;
  is_featured?: boolean;
}

export interface MapAreaPoint {
  lat: number;
  lng: number;
}

/** User-drawn search area on the map (freehand polygon). */
export interface MapAreaPolygon {
  points: MapAreaPoint[];
}

/** @deprecated Use MapAreaPolygon — kept for legacy filter payloads. */
export interface MapAreaCircle {
  lat: number;
  lng: number;
  radiusM: number;
}

export interface ListingFilters {
  category: ListingCategory;
  residentialTransaction: 'rent' | 'sale' | null;
  commercialTransaction: 'sale' | 'lease' | null;
  priceCurrency: PriceCurrency;
  priceMin: string;
  priceMax: string;
  roomsMin: number | null;
  bathroomsMin: number | null;
  areaMin: string;
  areaMax: string;
  propertyType: string | null;
  yearBuiltMin: string;
  yearBuiltMax: string;
  views: PropertyView[];
  level: PropertyLevel | null;
  listedSinceDays: number | null;
  keywords: string;
  districts: string[];
  mapArea: MapAreaPolygon | null;
}

export const DEFAULT_FILTERS: ListingFilters = {
  category: 'residential',
  residentialTransaction: null,
  commercialTransaction: null,
  priceCurrency: 'UZS',
  priceMin: '',
  priceMax: '',
  roomsMin: null,
  bathroomsMin: null,
  areaMin: '',
  areaMax: '',
  propertyType: null,
  yearBuiltMin: '',
  yearBuiltMax: '',
  views: [],
  level: null,
  listedSinceDays: null,
  keywords: '',
  districts: [],
  mapArea: null,
};

export interface GuestFavoriteSnapshot {
  listing_id: string;
  price?: number;
  rooms?: number;
  district?: string;
}
