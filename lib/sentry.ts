import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/**
 * Sentry configuration for performance monitoring and error tracking
 * DSN should be set in environment variables or app.json
 *
 * Production DSN: Set via env or hardcode after testing
 * Testing: Set to empty string or use Sentry demo project
 */
export const initSentry = () => {
  // Use environment variable or fallback for testing
  const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

  if (!DSN) {
    console.warn('⚠️ Sentry DSN not configured. Monitoring disabled.');
    return;
  }

  Sentry.init({
    // Use a real DSN in production
    dsn: DSN,

    // Tracing: 20% of sessions is plenty for performance trends and keeps quota low.
    tracesSampleRate: 0.2,
    enableAppStartTracking: true,

    // Error tracking
    maxBreadcrumbs: 50,
    attachStacktrace: true,

    // Integrations
    // Sentry v8 API: integrations are factory functions (the old `new XIntegration()` classes
    // were removed and would throw at startup as soon as a DSN was configured).
    integrations: [
      Sentry.reactNavigationIntegration(),
      Sentry.nativeLinkedErrorsIntegration(),
      Sentry.httpClientIntegration(),
    ],

    // Before sending - filter sensitive data
    beforeSend(event) {
      // Don't send events in development unless explicitly enabled
      if (__DEV__ && !process.env.EXPO_PUBLIC_SENTRY_DEBUG) {
        return null;
      }
      return event;
    },

    // Environment
    environment: process.env.NODE_ENV || 'production',

    // Release = app.json version unless overridden.
    release: process.env.EXPO_PUBLIC_APP_VERSION || Constants.expoConfig?.version || 'unknown',
  });

};

/**
 * Wrap a React component with Sentry error boundary and profiler
 * This enables automatic performance tracking for that component
 */
export const withSentryProfiler = <P extends object>(
  Component: React.ComponentType<P>,
  name: string
) => {
  return Sentry.withProfiler(Component, { name });
};

/**
 * Start a custom performance span (Sentry v8 replaced transactions with spans).
 * Usage: const span = startTransaction('map_load'); ...; span.end()
 */
export const startTransaction = (name: string, op?: string) => {
  return Sentry.startInactiveSpan({
    name,
    op: op || 'operation',
  });
};

/**
 * Manually track performance of a function
 * Usage: await trackPerformance('api_call', async () => { ... })
 */
export const trackPerformance = async <T>(
  name: string,
  fn: () => Promise<T>,
  op?: string
): Promise<T> => {
  const span = startTransaction(name, op);
  try {
    return await fn();
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  } finally {
    span?.end();
  }
};

/**
 * Capture a custom metric
 * Usage: captureMetric('map_listings_count', listings.length)
 */
export const captureMetric = (name: string, value: number) => {
  Sentry.captureMessage(`Metric: ${name}=${value}`, 'info');
};

/**
 * Set user context for better error tracking
 * Usage: setUserContext({ id: '123', email: 'user@example.com' })
 */
export const setUserContext = (user: { id?: string; email?: string; username?: string }) => {
  Sentry.setUser(user);
};

/**
 * Clear user context when logging out
 */
export const clearUserContext = () => {
  Sentry.setUser(null);
};
