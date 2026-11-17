import type { TFunction } from 'i18next';
import { TelegramAuthError } from '@/lib/auth/telegramAuth';

/** User-facing message for a telegram-auth failure. */
export function telegramErrorMessage(t: TFunction, error: unknown): string {
  const code = error instanceof TelegramAuthError ? error.code : 'server_error';
  switch (code) {
    case 'not_configured':
      return t('telegramAuth.notConfigured');
    case 'network':
      return t('auth.serverUnreachable');
    case 'flow_expired':
      return t('telegramAuth.expired');
    case 'phone_taken':
      return t('telegramAuth.phoneTaken');
    case 'email_taken':
      return t('telegramAuth.emailTaken');
    case 'invalid_email':
      return t('auth.invalidEmail');
    case 'first_name_required':
    case 'last_name_required':
      return t('auth.nameTooShort');
    case 'password_too_short':
      return t('auth.passwordTooShort');
    case 'invalid_credentials':
      return t('telegramAuth.invalidCredentials');
    case 'too_many_attempts':
      return t('telegramAuth.tooManyAttempts');
    default:
      return t('telegramAuth.failed');
  }
}
