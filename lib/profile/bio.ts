export const PROFILE_BIO_MAX_LENGTH = 300;

export function normalizeBio(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, PROFILE_BIO_MAX_LENGTH);
}
