export const typography = {
  h1: { fontSize: 28, fontWeight: '500' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '500' as const, lineHeight: 28 },
  h3: { fontSize: 17, fontWeight: '500' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: '400' as const, lineHeight: 14 },
  label: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Arabic needs extra line height for readability */
export function getLineHeight(variant: TypographyVariant, isRtl: boolean): number {
  const base = typography[variant].lineHeight;
  return isRtl ? Math.round(base * 1.8) : base;
}
