/** Internal sign-in address of accounts registered via Telegram without an email (see telegram-auth). */
export const PLACEHOLDER_EMAIL_DOMAIN = 'telegram.reyeltor.invalid';

/** The user's real email, or null for the internal placeholder / missing email. */
export function realEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim();
  if (!trimmed || trimmed.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)) return null;
  return trimmed;
}
