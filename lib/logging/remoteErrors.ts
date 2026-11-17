import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Built-in crash/error reporting: used when no Sentry DSN is configured, so errors from
 * real users still reach you (Supabase table app_errors — see supabase/patch-ops-v1.sql).
 * At most a few reports per app session, duplicates skipped, never throws.
 */
const MAX_REPORTS_PER_SESSION = 15;
const sent = new Set<string>();
let count = 0;

export function sentryEnabled(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN);
}

function errorParts(error: unknown, fallback: string): { message: string; stack: string | null } {
  if (error instanceof Error) return { message: error.message || fallback, stack: error.stack ?? null };
  if (typeof error === 'string') return { message: error, stack: null };
  return { message: fallback, stack: null };
}

export function reportErrorRemotely(
  level: 'error' | 'fatal',
  message: string,
  error?: unknown,
  context?: string,
  extra?: Record<string, unknown>,
): void {
  if (__DEV__ || sentryEnabled() || count >= MAX_REPORTS_PER_SESSION) return;
  try {
    const parts = errorParts(error, message);
    const key = `${context ?? ''}|${parts.message}|${parts.stack?.split('\n')[1] ?? ''}`;
    if (sent.has(key)) return;
    sent.add(key);
    count += 1;

    let extraJson: Record<string, unknown> | null = null;
    if (extra) {
      const text = JSON.stringify(extra);
      extraJson = text.length <= 4000 ? extra : { truncated: text.slice(0, 4000) };
    }

    const row = {
      level,
      message: `${message}${parts.message && parts.message !== message ? `: ${parts.message}` : ''}`.slice(0, 500),
      context: context?.slice(0, 100) ?? null,
      stack: parts.stack?.slice(0, 4000) ?? null,
      extra: extraJson,
      platform: `${Platform.OS} ${String(Platform.Version)}`.slice(0, 40),
      app_version: (Constants.expoConfig?.version ?? 'unknown').slice(0, 20),
    };
    // Imported lazily: supabase.ts imports the logger, so a static import would be circular.
    void import('@/lib/supabase')
      .then(({ supabase, isSupabaseConfigured }) => {
        if (!isSupabaseConfigured()) return;
        return supabase.from('app_errors').insert(row).then(() => undefined);
      })
      .catch(() => undefined);
  } catch {
    // Reporting must never crash the app.
  }
}

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;

/** Reports uncaught JS errors (crashes), then lets React Native handle them as before. */
export function installGlobalErrorReporter(): void {
  const utils = (globalThis as { ErrorUtils?: { getGlobalHandler: () => GlobalHandler; setGlobalHandler: (h: GlobalHandler) => void } }).ErrorUtils;
  if (!utils || sentryEnabled()) return;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    reportErrorRemotely(isFatal ? 'fatal' : 'error', 'Uncaught error', error, 'global');
    previous(error, isFatal);
  });
}
