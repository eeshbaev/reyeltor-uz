/** True when Supabase/PostgREST reports a missing table or column (live DB behind schema.sql). */
export function isMissingSchemaError(message: string | undefined): boolean {
  if (!message) return false;
  return /schema cache|does not exist|could not find the table|column .* does not exist/i.test(message);
}
