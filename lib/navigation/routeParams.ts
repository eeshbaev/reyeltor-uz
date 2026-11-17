/** Normalize expo-router search param values to a single string. */
export function parseRouteParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) return entry.trim();
    }
  }
  return undefined;
}
