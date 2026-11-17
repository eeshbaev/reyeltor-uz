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

  if (
    normalized.includes('users_phone_key') ||
    (normalized.includes('duplicate key') && normalized.includes('phone')) ||
    // Supabase's message when the profile trigger hits the unique phone constraint.
    normalized.includes('database error saving new user')
  ) {
    return { code: 'phoneAlreadyRegistered', message: rawMessage };
  }

  return { code: 'registerError', message: rawMessage };
}

export type AuthFlowErrorCode =
  | 'loginError'
  | 'emailNotConfirmed'
  | 'networkTimeout'
  | 'serverUnreachable'
  | 'resetPasswordError';

export function mapAuthFlowError(
  error: AuthError | null | undefined,
  timedOut = false,
  fallback: AuthFlowErrorCode = 'loginError',
): AuthFlowErrorCode {
  if (timedOut) return 'networkTimeout';

  const message = formatAuthErrorMessage(error).toLowerCase();
  if (!message) return 'loginError';

  if (
    message.includes('fetch failed') ||
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('enotfound') ||
    message.includes('getaddrinfo')
  ) {
    return 'serverUnreachable';
  }

  if (message.includes('email not confirmed')) {
    return 'emailNotConfirmed';
  }

  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return 'loginError';
  }

  return fallback;
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
