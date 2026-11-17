import { AppState, LogBox } from 'react-native';
import { logger } from '@/lib/logging/logger';
import { supabase } from '@/lib/supabase';

const NETWORK_ERROR_PATTERN = /network request failed|authretryablefetcherror|failed to fetch/i;

/** Supabase recommended: only refresh auth tokens while the app is foregrounded. */
export function configureSupabaseAuthRefresh(): () => void {
  const syncAutoRefresh = (state: AppState['currentState']) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh().catch(() => undefined);
    } else {
      void supabase.auth.stopAutoRefresh().catch(() => undefined);
    }
  };

  syncAutoRefresh(AppState.currentState);
  const sub = AppState.addEventListener('change', syncAutoRefresh);
  return () => sub.remove();
}

/** Dev-only: Supabase background refresh failures are non-fatal but spam LogBox. */
export function configureDevNetworkLogBox(): void {
  if (!__DEV__) return;

  LogBox.ignoreLogs([
    'Network request failed',
    'AuthRetryableFetchError',
    '[AuthRetryableFetchError',
  ]);
}

export function isBenignNetworkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error ?? '');
  const name = error instanceof Error ? error.name : '';
  return NETWORK_ERROR_PATTERN.test(message) || NETWORK_ERROR_PATTERN.test(name);
}

/** Prevent dev toasts from unhandled background network failures. */
export function configureUnhandledNetworkRejectionLogger(): void {
  if (typeof globalThis === 'undefined') return;

  const globalWithTracker = globalThis as typeof globalThis & {
    __reyeltorRejectionHandlerInstalled?: boolean;
  };
  if (globalWithTracker.__reyeltorRejectionHandlerInstalled) return;
  globalWithTracker.__reyeltorRejectionHandlerInstalled = true;

  const tracking = (globalThis as typeof globalThis & {
    HermesInternal?: { enablePromiseRejectionTracker?: (opts: object) => void };
  }).HermesInternal;

  tracking?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (_id: number, error: unknown) => {
      if (!isBenignNetworkError(error)) return;
      logger.warn('Background network request failed (non-fatal)', {
        context: 'networkResilience',
        extra: { message: error instanceof Error ? error.message : String(error) },
      });
    },
    onHandled: () => undefined,
  });
}

export function installNetworkResilience(): () => void {
  configureDevNetworkLogBox();
  configureUnhandledNetworkRejectionLogger();
  return configureSupabaseAuthRefresh();
}
