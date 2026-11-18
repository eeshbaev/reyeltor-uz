/**
 * Type scale (design doc: Design system). One scale for the whole app — screens never set a
 * raw fontSize. Weights 600/700 carry hierarchy; prices use tabular figures (see AppText).
 * Font: Inter (loaded in app/_layout.tsx); Chinese falls back to the system font.
 */
export const typography = {
  display: { fontSize: 34, fontWeight: '700' as const, lineHeight: 40 },
  h1: { fontSize: 28, fontWeight: '600' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28 },
  h3: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  callout: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: '500' as const, lineHeight: 14 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Arabic needs extra line height for readability */
export function getLineHeight(variant: TypographyVariant, isRtl: boolean): number {
  const base = typography[variant].lineHeight;
  return isRtl ? Math.round(base * 1.8) : base;
}
