import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { EMAIL_CONFIRMED_URL } from '@/lib/constants';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * Client side of supabase/functions/telegram-auth.
 * Registration: confirmWithTelegram('register') -> registerWithTelegram(...)
 * Forgot password: confirmWithTelegram('reset') -> resetPasswordWithTelegram(...)
 * Login: loginWithPassword(phoneOrEmail, password)
 */

export type TelegramPurpose = 'register' | 'reset';
export type TelegramFlowStatus =
  | 'verified'
  | 'phone_taken'
  | 'no_phone'
  | 'not_registered'
  | 'cancelled'
  | 'failed';

export interface TelegramFlow {
  flowId: string;
  secret: string;
  purpose: TelegramPurpose;
  status: TelegramFlowStatus;
  phone: string | null;
  firstName: string;
  lastName: string;
  telegramUsername: string | null;
}

/** Error codes returned by the function, plus client-side network/config failures. */
export type TelegramAuthErrorCode =
  | 'not_configured'
  | 'network'
  | 'server_error'
  | 'flow_expired'
  | 'phone_taken'
  | 'email_taken'
  | 'invalid_email'
  | 'first_name_required'
  | 'last_name_required'
  | 'password_too_short'
  | 'invalid_credentials'
  | 'too_many_attempts'
  | 'not_signed_in'
  | 'confirmation_required'
  | 'email_send_failed';

export class TelegramAuthError extends Error {
  constructor(public readonly code: TelegramAuthErrorCode) {
    super(code);
    this.name = 'TelegramAuthError';
  }
}

async function callFunction<T>(body: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured()) throw new TelegramAuthError('not_configured');
  const { data, error } = await supabase.functions.invoke('telegram-auth', { body });
  if (!error) return data as T;

  if (error instanceof FunctionsHttpError) {
    let code: TelegramAuthErrorCode = 'server_error';
    const status = (error.context as Response | undefined)?.status;
    let payload: { error?: string; message?: string; code?: string } | null = null;
    try {
      payload = (await error.context.json()) as { error?: string; message?: string; code?: string };
      if (payload?.error) code = payload.error as TelegramAuthErrorCode;
    } catch {
      // Non-JSON error body: keep server_error.
    }
    // 404 = the telegram-auth function is not deployed yet (scripts/setup-supabase.sh).
    if (status === 404 && !payload?.error) code = 'not_configured';
    if (__DEV__) console.warn('[telegram-auth]', body.action, status, payload);
    throw new TelegramAuthError(code);
  }
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    if (__DEV__) console.warn('[telegram-auth]', body.action, error.message);
    throw new TelegramAuthError('network');
  }
  throw new TelegramAuthError('server_error');
}

/** Opens the bot chat: the Telegram app if installed, otherwise t.me in the browser. */
export async function openTelegramBot(urls: { appUrl: string; botUrl: string }): Promise<void> {
  try {
    await Linking.openURL(urls.appUrl);
  } catch {
    await Linking.openURL(urls.botUrl);
  }
}

export interface ConfirmOptions {
  locale: string;
  /** Abort to stop waiting (user tapped Cancel or left the screen). */
  signal?: AbortSignal;
  /** Called once the bot link is ready, e.g. to show an "Open Telegram again" button. */
  onStarted?: (urls: { appUrl: string; botUrl: string }) => void;
}

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 15 * 60_000;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Opens the Reyeltor bot in Telegram, where the user taps "Share phone number". Waits for the
 * bot to receive it and resolves with the verified phone and name, or the reason it could
 * not be used (already registered, cancelled...).
 */
export async function confirmWithTelegram(purpose: TelegramPurpose, options: ConfirmOptions): Promise<TelegramFlow> {
  const started = await callFunction<{ flowId: string; secret: string; botUrl: string; appUrl: string }>({
    action: 'start',
    purpose,
    locale: options.locale,
  });
  const urls = { appUrl: started.appUrl, botUrl: started.botUrl };
  options.onStarted?.(urls);
  await openTelegramBot(urls);

  type ResultPayload = {
    status: string;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    telegramUsername: string | null;
  };
  let result: ResultPayload = { status: 'pending', phone: null, firstName: null, lastName: null, telegramUsername: null };
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (!options.signal?.aborted && Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS, options.signal);
    if (options.signal?.aborted) break;
    try {
      result = await callFunction<ResultPayload>({ action: 'result', flowId: started.flowId, secret: started.secret });
    } catch (error) {
      // A flaky connection while the user is in Telegram is normal: keep waiting.
      if (error instanceof TelegramAuthError && error.code === 'network') continue;
      throw error;
    }
    if (result.status !== 'pending') break;
  }

  const status = (result.status === 'pending' ? 'cancelled' : result.status) as TelegramFlowStatus;
  return {
    flowId: started.flowId,
    secret: started.secret,
    purpose,
    status,
    phone: result.phone,
    firstName: result.firstName ?? '',
    lastName: result.lastName ?? '',
    telegramUsername: result.telegramUsername,
  };
}

async function signInWithTokenHash(tokenHash: string): Promise<string> {
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (error || !data.user) throw new TelegramAuthError('server_error');
  return data.user.id;
}

export interface TelegramRegistrationInput {
  firstName: string;
  lastName: string;
  password: string;
  email?: string;
  phoneVisible: boolean;
  locale: string;
}

/** Creates the account from a verified Telegram confirmation and signs in. Returns the user id. */
/**
 * Creates the account from a verified Telegram confirmation and signs in. An email (optional)
 * is not trusted yet: a confirmation link is sent, and it is added once the user clicks it.
 * Returns the user id and whether a confirmation email was sent.
 */
export async function registerWithTelegram(
  flow: TelegramFlow,
  input: TelegramRegistrationInput,
): Promise<{ userId: string; confirmationSentTo: string | null }> {
  const { tokenHash, pendingEmail } = await callFunction<{ tokenHash: string; pendingEmail?: string | null }>({
    action: 'register',
    flowId: flow.flowId,
    secret: flow.secret,
    firstName: input.firstName,
    lastName: input.lastName,
    password: input.password,
    email: input.email?.trim() || null,
    phoneVisible: input.phoneVisible,
    locale: input.locale,
  });
  const userId = await signInWithTokenHash(tokenHash);
  let confirmationSentTo: string | null = null;
  if (pendingEmail) {
    try {
      await requestEmailChange(pendingEmail);
      confirmationSentTo = pendingEmail;
    } catch {
      // The account exists; the email can be added again later from Profile.
    }
  }
  return { userId, confirmationSentTo };
}

/**
 * Starts an email change: Supabase emails a confirmation link to the new address; the
 * profile shows the email once the link is clicked (patch-ops-v1.sql sync_profile_email).
 */
export async function requestEmailChange(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser(
    { email: email.trim().toLowerCase() },
    { emailRedirectTo: EMAIL_CONFIRMED_URL },
  );
  if (!error) return;
  const message = error.message.toLowerCase();
  if (message.includes('already') || error.code === 'email_exists') throw new TelegramAuthError('email_taken');
  if (message.includes('invalid')) throw new TelegramAuthError('invalid_email');
  if (error.status === 429 || message.includes('rate limit')) throw new TelegramAuthError('too_many_attempts');
  throw new TelegramAuthError('email_send_failed');
}

/** Sets a new password after a Telegram confirmation and signs in. */
export async function resetPasswordWithTelegram(flow: TelegramFlow, password: string): Promise<string> {
  const { tokenHash } = await callFunction<{ tokenHash: string }>({
    action: 'reset_password',
    flowId: flow.flowId,
    secret: flow.secret,
    password,
  });
  return signInWithTokenHash(tokenHash);
}

export function looksLikeEmail(identifier: string): boolean {
  return identifier.includes('@');
}

export function isValidLoginIdentifier(identifier: string): boolean {
  const trimmed = identifier.trim();
  if (looksLikeEmail(trimmed)) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  return trimmed.replace(/\D/g, '').length >= 9;
}

/** Phone + password or email + password. */
export async function loginWithPassword(identifier: string, password: string): Promise<void> {
  const trimmed = identifier.trim();
  if (looksLikeEmail(trimmed)) {
    // Accounts created with email sign in directly; if that fails, the server also checks
    // the email saved in the profile (e.g. added after a Telegram registration).
    const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    if (!error) return;
  }
  const { tokenHash } = await callFunction<{ tokenHash: string }>({ action: 'login', identifier: trimmed, password });
  await signInWithTokenHash(tokenHash);
}

/** Removes the account email (login then works with the phone number only). */
export async function clearAccountEmail(): Promise<void> {
  await callFunction<{ ok: true }>({ action: 'sync_email', email: null });
}
