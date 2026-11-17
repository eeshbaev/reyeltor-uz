/** True when a string is mostly digits and looks like a phone, not a person's name. */
export function looksLikePhoneNumber(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 13) return false;

  const letterCount = (trimmed.match(/\p{L}/gu) ?? []).length;
  if (letterCount >= 2) return false;

  return /^\d+$/.test(digits);
}

function pickFirstValidName(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (!trimmed || looksLikePhoneNumber(trimmed)) continue;
    return trimmed;
  }
  return undefined;
}

export function resolveWelcomeDisplayName(input: {
  routeName?: string;
  storedName?: string;
  registeredFullName?: string;
  metadataName?: string;
  profileName?: string;
}): string {
  return (
    pickFirstValidName(
      input.routeName,
      input.storedName,
      input.registeredFullName,
      input.metadataName,
      input.profileName,
    ) ?? 'there'
  );
}

export function resolveUserDisplayName(input: {
  registeredFullName?: string;
  metadataName?: string;
  profileName?: string;
}): string | null {
  return pickFirstValidName(input.registeredFullName, input.metadataName, input.profileName) ?? null;
}

export function pickProfileFullName(input: {
  registeredFullName?: string;
  metadataName?: string;
  email?: string;
  currentName?: string;
  fallbackName?: string;
}): string | null {
  return (
    pickFirstValidName(
      input.fallbackName,
      input.registeredFullName,
      input.metadataName,
      input.currentName,
      input.email?.split('@')[0],
    ) ?? null
  );
}
