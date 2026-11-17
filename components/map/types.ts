import type { MapCoverage } from '@/lib/constants';
import type { ListingCategory, MapAreaPolygon, MapListingPoint } from '@/types';

export type { MapAreaPolygon };

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
  /** Tap-to-place pin mode for posting a listing. */
  pinPicker?: {
    lat: number;
    lng: number;
    onPinChange: (lat: number, lng: number) => void;
    /** Highlight a building footprint selected via building picker. */
    buildingOutline?: MapAreaPolygon | null;
    /** When true, taps resolve to OSM building outlines instead of free placement. */
    buildingPickerMode?: boolean;
    onBuildingTap?: (lat: number, lng: number) => void;
  };
}

export interface MapViewRef {
  flyToCoverage: (center: { latitude: number; longitude: number; zoom: number }) => void;
  flyToArea: (area: MapAreaPolygon) => void;
  getViewport: () => MapViewport | null;
  zoomBy: (delta: number) => void;
  project: (lng: number, lat: number) => { x: number; y: number } | null;
  unproject: (x: number, y: number) => { lat: number; lng: number } | null;
}
