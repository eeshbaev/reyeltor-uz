/**
 * Four corner radii only (design doc: Design system). Nested corners: inner = outer − padding.
 * sm: chips, inputs, thumbnails · md: buttons, cards · lg: sheets, large cards, galleries · pill.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
  /** @deprecated use lg */
  xl: 20,
} as const;
