import type { AuthError } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';

export type RegisterErrorCode =
  | 'emailAlreadyRegistered'
  | 'phoneAlreadyRegistered'
  | 'registerError';

export interface MappedRegisterError {
  code: RegisterErrorCode;
  message: string;
}

function pickText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

export function formatAuthErrorMessage(error: AuthError | null | undefined): string {
  if (!error) return '';
  return pickText(error.message, error.code);
}

export function formatPostgrestErrorMessage(error: PostgrestError | null | undefined): string {
  if (!error) return '';
  return pickText(error.message, error.details, error.hint, error.code);
}

export function mapRegisterErrorMessage(rawMessage: string): MappedRegisterError {
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes('already registered') || normalized.includes('users_email_key')) {
    return { code: 'emailAlreadyRegistered', message: rawMessage };
  }

  if (normalized.includes('users_phone_key') || normalized.includes('duplicate key') && normalized.includes('phone')) {
    return { code: 'phoneAlreadyRegistered', message: rawMessage };
  }

  return { code: 'registerError', message: rawMessage };
}

export function toDisplayError(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return pickText(record.message, record.details, record.hint, record.code);
  }
  return '';
}
