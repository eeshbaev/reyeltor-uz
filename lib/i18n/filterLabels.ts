import type { TFunction } from 'i18next';

/** Legacy / demo values mapped to canonical filter option keys. */
const PROPERTY_TYPE_ALIASES: Record<string, string> = {
  condo: 'condo_strata',
};

function humanizeToken(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function translateKey(t: TFunction, key: string): string {
  const value = t(key);
  return value === key ? humanizeToken(key.split('.').pop() ?? key) : value;
}

export function normalizePropertyTypeKey(value: string): string {
  return PROPERTY_TYPE_ALIASES[value] ?? value;
}

export function translatePropertyType(
  t: TFunction,
  category: 'residential' | 'commercial',
  propertyType: string | null | undefined,
): string {
  if (!propertyType) return t(`filters.${category}Types.any`);
  const normalized = normalizePropertyTypeKey(propertyType);
  return translateKey(t, `filters.${category}Types.${normalized}`);
}

export function translatePropertyView(t: TFunction, view: string): string {
  return translateKey(t, `filters.views.${view}`);
}

export function translatePropertyLevel(t: TFunction, level: string): string {
  return translateKey(t, `filters.levels.${level}`);
}

export function translateListedSince(t: TFunction, key: string): string {
  return translateKey(t, `filters.listedSinceOptions.${key}`);
}
