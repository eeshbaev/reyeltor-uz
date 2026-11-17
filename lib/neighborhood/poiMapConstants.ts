/** Context POIs only appear when a listing is focused and zoom >= this. */
export const POI_MAP_MIN_ZOOM = 14;

/** City-wide ambient POI + metro layers appear at and above this zoom. */
export const AMBIENT_MAP_MIN_ZOOM = 10;

/** Tap ambient POI / metro markers to show names at and above this zoom. */
export const POI_AMBIENT_TAP_MIN_ZOOM = 15;

/** Full POI list radius for the neighborhood sheet (m). */
export const POI_FOCUS_RADIUS_M = 800;

/** Tighter radius for subtle map context dots (m). */
export const POI_MAP_OVERLAY_RADIUS_M = 450;

/** Max context markers on the map around a focused listing. */
export const POI_MAP_OVERLAY_MAX = 10;
