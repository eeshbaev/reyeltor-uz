/**
 * Error codes raised by Supabase triggers/functions (see supabase/patch-saved-searches-v1.sql).
 * Postgres puts the code in the error message, so we match on it.
 */
export type ServerErrorCode =
  | 'insufficient_coins'
  | 'listing_rate_limited'
  | 'listing_not_reactivatable'
  | 'checkin_invalid_date'
  | 'checkin_not_available_today'
  | 'checkin_already_claimed'
  | 'saved_search_limit';

const CODES: ServerErrorCode[] = [
  'insufficient_coins',
  'listing_rate_limited',
  'listing_not_reactivatable',
  'checkin_invalid_date',
  'checkin_not_available_today',
  'checkin_already_claimed',
  'saved_search_limit',
];

export function serverErrorCode(error: unknown): ServerErrorCode | null {
  if (!error) return null;
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : String(error);
  return CODES.find((code) => message.includes(code)) ?? null;
}
