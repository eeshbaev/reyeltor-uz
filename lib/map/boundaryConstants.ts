/** Zoom thresholds for district / region name labels on the map. */
export const BOUNDARY_LABEL_MIN_ZOOM = 8;
/** Below this zoom: district/region names only. Above: rent/sale averages when no filters. */
export const BOUNDARY_MARKET_LABEL_MIN_ZOOM = 9;
/** Labels begin fading out above this zoom (approaching street detail). */
export const BOUNDARY_LABEL_FADE_START = 12.5;
/** Labels hidden at and above this zoom (street / building level). */
export const BOUNDARY_LABEL_MAX_ZOOM = 13;

export function getBoundaryLabelOpacity(zoom: number): number {
  if (zoom < BOUNDARY_LABEL_MIN_ZOOM || zoom >= BOUNDARY_LABEL_MAX_ZOOM) return 0;
  if (zoom >= BOUNDARY_LABEL_FADE_START) return BOUNDARY_LABEL_MAX_ZOOM - zoom;
  return 1;
}

export const BOUNDARY_LABEL_FRAME = {
  city: {
    border: 'rgba(15, 23, 42, 0.1)',
    title: '#0F172A',
    subtitle: '#64748B',
    background: 'rgba(255, 255, 255, 0.94)',
  },
  region: {
    border: 'rgba(120, 53, 15, 0.14)',
    title: '#1C1917',
    subtitle: '#78716C',
    background: 'rgba(255, 255, 255, 0.92)',
  },
} as const;

export const CITY_BOUNDARY_STYLE = {
  fill: 'rgba(15, 118, 110, 0.06)',
  stroke: 'rgba(15, 118, 110, 0.45)',
  strokeWidth: 1.25,
} as const;

export const REGION_BOUNDARY_STYLE = {
  fill: 'rgba(194, 65, 12, 0.05)',
  stroke: 'rgba(194, 65, 12, 0.38)',
  strokeWidth: 1.1,
} as const;
