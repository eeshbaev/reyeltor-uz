import * as Sentry from '@sentry/react-native';
import { reportErrorRemotely } from '@/lib/logging/remoteErrors';

/**
 * Centralized logging utility for Reyeltor.uz
 * In development: logs to console
 * In production: can be extended to send to error tracking service (Sentry, etc.)
 */

const isDev = __DEV__;

interface LogContext {
  context?: string;
  extra?: Record<string, unknown>;
}

export const logger = {
  /**
   * Log error messages - highest severity
   */
  error: (message: string, error?: unknown, context?: LogContext) => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, error, context?.extra);
    }
    logToService('error', message, error, context);
  },

  /**
   * Log warning messages - medium severity
   */
  warn: (message: string, context?: LogContext) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, context?.extra);
    }
    logToService('warn', message, undefined, context);
  },

  /**
   * Log info messages - low severity
   */
  info: (message: string, context?: LogContext) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(`[INFO] ${message}`, context?.extra);
    }
    logToService('info', message, undefined, context);
  },

  /**
   * Log debug messages - development only
   */
  debug: (message: string, context?: LogContext) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] ${message}`, context?.extra);
    }
  },
};

/**
 * Sends errors and warnings to Sentry (no-op until initSentry() runs with a DSN).
 */
function logToService(
  level: 'error' | 'warn' | 'info' | 'debug',
  message: string,
  error?: unknown,
  context?: LogContext,
) {
  if (level === 'debug') return;
  try {
    if (level === 'error') {
      // Without a Sentry key, errors go to the app's own error log (Supabase app_errors).
      reportErrorRemotely('error', message, error, context?.context, context?.extra);
      Sentry.captureException(error instanceof Error ? error : new Error(message), {
        tags: context?.context ? { context: context.context } : undefined,
        extra: { message, ...(context?.extra ?? {}), ...(error instanceof Error ? {} : { error }) },
      });
    } else {
      Sentry.addBreadcrumb({
        level: level === 'warn' ? 'warning' : 'info',
        category: context?.context ?? 'app',
        message,
        data: context?.extra,
      });
    }
  } catch {
    // Logging must never crash the app.
  }
}
