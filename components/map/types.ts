import type { MapCoverage } from '@/lib/constants';
import type { ListingCategory, MapAreaPolygon, MapListingPoint } from '@/types';

export interface FocusedListingPin {
  id: string;
  lat: number;
  lng: number;
  price: number;
  featured?: boolean;
}

export interface MapViewport {
  centerLng: number;
  centerLat: number;
  zoom: number;
  width: number;
  height: number;
}

export interface MapViewProps {
  listings: MapListingPoint[];
  listingCategory: ListingCategory;
  onListingPress: (id: string) => void;
  initialCenter?: { latitude: number; longitude: number; zoom: number };
  coverage?: MapCoverage;
  drawMode?: boolean;
  /** Active pen-drawn search polygon — shown as a map highlight when not drawing. */
  searchArea?: MapAreaPolygon | null;
  /** When false, listing/cluster bubbles are hidden (e.g. while a bottom sheet is open). */
  showMarkers?: boolean;
  /** Selected listing — hides other markers and shows nearby amenities instead. */
  focusedListing?: FocusedListingPin | null;
  /** Builds multi-line district detail (market stats). Name-only labels are shown when zoomed out. */
  districtDetail?: (district: string) => string | null;
}

export interface MapViewRef {
  flyToCoverage: (center: { latitude: number; longitude: number; zoom: number }) => void;
  flyToArea: (area: MapAreaPolygon) => void;
  getViewport: () => MapViewport | null;
  project: (lng: number, lat: number) => { x: number; y: number } | null;
  unproject: (x: number, y: number) => { lat: number; lng: number } | null;
}
