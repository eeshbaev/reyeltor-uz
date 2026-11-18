import { fixedColors } from '@/lib/design/colors';
import type { AmenityCategory } from '@/lib/neighborhood/amenities';

export const POI_CATEGORY_ICON: Record<AmenityCategory, string> = {
  park: 'leaf-outline',
  market: 'storefront-outline',
  school: 'school-outline',
  health: 'medical-outline',
  transport: 'bus-outline',
  culture: 'business-outline',
};

export const POI_CATEGORY_COLOR: Record<AmenityCategory, string> = {
  park: fixedColors.green,
  market: fixedColors.violet,
  school: fixedColors.blue,
  health: fixedColors.red,
  transport: fixedColors.orange,
  culture: fixedColors.teal,
};

export const POI_MARKER_SIZE = 28;
export const POI_CONTEXT_MARKER_SIZE = 18;

/** Ambient city context — intentionally smaller and softer than listing bubbles. */
export const AMBIENT_POI_MARKER_SIZE = 11;
export const AMBIENT_POI_OPACITY = 0.52;
export const METRO_MARKER_SIZE = 10;
export const METRO_MARKER_COLOR = fixedColors.slate500;

export const POI_CATEGORY_ORDER: AmenityCategory[] = [
  'market',
  'park',
  'school',
  'health',
  'transport',
  'culture',
];
