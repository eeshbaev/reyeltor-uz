import { fixedColors } from '@/lib/design/colors';
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
  metro: fixedColors.blueDeep,
  park: fixedColors.green,
  railway: fixedColors.slate600,
  airport: fixedColors.sky,
  museum: fixedColors.violet,
  stadium: fixedColors.orange,
};

export const METRO_MARKER_SIZE = 14;
export const METRO_MARKER_COLOR = fixedColors.blueDeep;
export const LANDMARK_MARKER_SIZE = 12;
export const LANDMARK_MARKER_OPACITY = 0.72;
