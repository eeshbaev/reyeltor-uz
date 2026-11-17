/**
 * UUID validation utilities
 */

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if string is valid UUID v4
 */
export function isValidUUIDv4(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

/**
 * Check if string is valid UUID (any version)
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validate route parameter ID (UUID format)
 */
export function validateRouteId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return isValidUUID(id);
}

/**
 * Parse and validate route ID with error handling
 */
export function parseRouteId(id: unknown): string {
  if (!validateRouteId(id)) {
    throw new Error(`Invalid route ID: ${id}`);
  }
  return id;
}
