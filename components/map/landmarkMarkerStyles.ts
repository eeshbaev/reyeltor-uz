import type { MapLandmarkKind } from '@/lib/map/tashkentMapLandmarks';

export const LANDMARK_KIND_ICON: Record<MapLandmarkKind, string> = {
  metro: 'train-outline',
  park: 'leaf-outline',
  railway: 'train-outline',
  airport: 'airplane-outline',
  museum: 'business-outline',
  stadium: 'football-outline',
};

export const LANDMARK_KIND_COLOR: Record<MapLandmarkKind, string> = {
  metro: '#0057B8',
  park: '#16a34a',
  railway: '#475569',
  airport: '#0ea5e9',
  museum: '#7c3aed',
  stadium: '#ea580c',
};

export const METRO_MARKER_SIZE = 14;
export const METRO_MARKER_COLOR = '#0057B8';
export const LANDMARK_MARKER_SIZE = 12;
export const LANDMARK_MARKER_OPACITY = 0.72;
