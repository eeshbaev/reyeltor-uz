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
    border: '#1d4ed8',
    title: '#1e3a8a',
    subtitle: '#475569',
    background: 'rgba(255, 255, 255, 0.96)',
  },
  region: {
    border: '#b45309',
    title: '#92400e',
    subtitle: '#78716c',
    background: 'rgba(255, 255, 255, 0.96)',
  },
} as const;

export const CITY_BOUNDARY_STYLE = {
  fill: 'rgba(37, 99, 235, 0.08)',
  stroke: '#1d4ed8',
  strokeWidth: 1.5,
} as const;

export const REGION_BOUNDARY_STYLE = {
  fill: 'rgba(217, 119, 6, 0.07)',
  stroke: '#b45309',
  strokeWidth: 1.25,
} as const;
