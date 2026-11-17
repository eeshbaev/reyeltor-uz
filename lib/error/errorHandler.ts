/**
 * Central error handler for application
 * Coordinates logging, user notifications, and error recovery
 */

import i18n from 'i18next';
import { Alert } from 'react-native';
import { AppError, createAppError } from './AppError';
import { logger } from '@/lib/logging/logger';

interface ErrorHandlerOptions {
  showAlert?: boolean;
  shouldThrow?: boolean;
  context?: string;
}

/**
 * Handle errors with logging, optional alerts, and optional re-throwing
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {},
): AppError {
  const { showAlert = true, shouldThrow = false, context } = options;

  // Convert to AppError
  const appError = createAppError(error, context ? { context } : undefined);

  // Log the error
  logger.error(appError.message, appError.originalError, {
    context: context || 'handleError',
    extra: {
      code: appError.code,
      ...appError.context,
    },
  });

  // Show user alert if requested
  if (showAlert) {
    const userMessage = appError.getUserMessage();
    Alert.alert(i18n.t('common.error'), userMessage);
  }

  // Re-throw if requested
  if (shouldThrow) {
    throw appError;
  }

  return appError;
}

/**
 * Handle errors with custom recovery
 */
export async function handleErrorWithRecovery(
  error: unknown,
  recover: (appError: AppError) => Promise<void>,
  options: ErrorHandlerOptions = {},
): Promise<void> {
  const appError = handleError(error, { ...options, shouldThrow: false });

  if (appError.isRetriable()) {
    try {
      await recover(appError);
    } catch (recoveryError) {
      handleError(recoveryError, { ...options, shouldThrow: true });
    }
  }
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: ErrorHandlerOptions,
): Promise<T> {
  return fn().catch((error) => {
    handleError(error, options);
    throw error;
  });
}

/**
 * Wrap async function with error handling and recovery
 */
export function withErrorHandlingAndRecovery<T>(
  fn: () => Promise<T>,
  recover: (appError: AppError) => Promise<T>,
  options?: ErrorHandlerOptions,
): Promise<T> {
  return fn().catch((error) => {
    const appError = createAppError(error, options?.context ? { context: options.context } : undefined);
    logger.error(appError.message, appError.originalError, {
      context: options?.context || 'withErrorHandlingAndRecovery',
    });

    if (appError.isRetriable()) {
      return recover(appError);
    }

    throw appError;
  });
}

/**
 * Safe error handler - catches errors and logs without throwing
 */
export function safeHandle(
  fn: () => void | Promise<void>,
  context?: string,
): void {
  Promise.resolve(fn()).catch((error) => {
    logger.error('Safe handle error', error, { context: context || 'safeHandle' });
  });
}
