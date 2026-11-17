import i18n from 'i18next';
/**
 * AppError - Custom error class for application errors
 * Provides structured error handling and tracking
 */

export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Auth errors
  AUTH_FAILED = 'AUTH_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  // Database errors
  DB_ERROR = 'DB_ERROR',
  DB_CONSTRAINT = 'DB_CONSTRAINT',

  // Server errors
  SERVER_ERROR = 'SERVER_ERROR',
  NOT_FOUND = 'NOT_FOUND',

  // Application errors
  UNKNOWN = 'UNKNOWN',
}

export class AppError extends Error {
  public code: ErrorCode;
  public originalError?: unknown;
  public context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    originalError?: unknown,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.originalError = originalError;
    this.context = context;
    this.name = 'AppError';
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.NETWORK_ERROR]: 'No internet connection',
      [ErrorCode.TIMEOUT]: 'Request timed out',
      [ErrorCode.AUTH_FAILED]: 'Authentication failed',
      [ErrorCode.PERMISSION_DENIED]: 'Permission denied',
      [ErrorCode.SESSION_EXPIRED]: 'Session expired, please log in again',
      [ErrorCode.INVALID_INPUT]: 'Invalid input',
      [ErrorCode.VALIDATION_FAILED]: 'Validation failed',
      [ErrorCode.DB_ERROR]: 'Database error',
      [ErrorCode.DB_CONSTRAINT]: 'Operation violates database constraints',
      [ErrorCode.SERVER_ERROR]: 'Server error',
      [ErrorCode.NOT_FOUND]: 'Not found',
      [ErrorCode.UNKNOWN]: 'An error occurred',
    };
    const fallback = messages[this.code] || messages[ErrorCode.UNKNOWN];
    return i18n.t(`errors.app.${this.code}`, { defaultValue: fallback });
  }

  /**
   * Check if error is retriable
   */
  isRetriable(): boolean {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT,
      ErrorCode.SERVER_ERROR,
    ].includes(this.code);
  }
}

/**
 * Create AppError from various error sources
 */
export function createAppError(error: unknown, context?: Record<string, unknown>): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message;

    // Detect error type from message
    if (message.includes('network') || message.includes('offline')) {
      return new AppError(ErrorCode.NETWORK_ERROR, message, error, context);
    }
    if (message.includes('timeout')) {
      return new AppError(ErrorCode.TIMEOUT, message, error, context);
    }
    if (message.includes('auth') || message.includes('unauthorized')) {
      return new AppError(ErrorCode.AUTH_FAILED, message, error, context);
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return new AppError(ErrorCode.PERMISSION_DENIED, message, error, context);
    }
    if (message.includes('validation')) {
      return new AppError(ErrorCode.VALIDATION_FAILED, message, error, context);
    }
    if (message.includes('not found') || message.includes('404')) {
      return new AppError(ErrorCode.NOT_FOUND, message, error, context);
    }

    return new AppError(ErrorCode.UNKNOWN, message, error, context);
  }

  return new AppError(
    ErrorCode.UNKNOWN,
    'An unexpected error occurred',
    error,
    context,
  );
}
