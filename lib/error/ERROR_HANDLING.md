# Error Handling Architecture

This document outlines the comprehensive error handling strategy used throughout the Reyeltor.uz mobile application.

## Overview

The error handling system follows a layered approach with three main components:

1. **AppError** - Structured error classification and user-friendly messages
2. **Error Handlers** - Utility functions for consistent error processing
3. **Error Boundaries** - React components to catch and display rendering errors
4. **Logging System** - Centralized error logging and tracking

## Error Classification

All errors in the application fall into one of 12 error codes, defined in `AppError.ts`:

```typescript
enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',           // Network connectivity issues
  TIMEOUT = 'TIMEOUT',                       // Request timeouts
  AUTH_FAILED = 'AUTH_FAILED',               // Authentication failures
  PERMISSION_DENIED = 'PERMISSION_DENIED',   // Authorization/permission issues
  SESSION_EXPIRED = 'SESSION_EXPIRED',       // User session has expired
  INVALID_INPUT = 'INVALID_INPUT',           // User input validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',   // Server validation failures
  DB_ERROR = 'DB_ERROR',                     // Database operation errors
  DB_CONSTRAINT = 'DB_CONSTRAINT',           // Database constraint violations
  SERVER_ERROR = 'SERVER_ERROR',             // Server-side errors
  NOT_FOUND = 'NOT_FOUND',                   // Resource not found
  UNKNOWN = 'UNKNOWN',                       // Uncategorized errors
}
```

## Core Components

### 1. AppError Class

Located in `lib/error/AppError.ts`, this class provides structured error representation:

```typescript
class AppError extends Error {
  code: ErrorCode;
  originalError?: Error;
  context?: Record<string, unknown>;
  
  getUserMessage(): string;  // User-friendly message
  isRetriable(): boolean;    // Can the operation be retried?
}
```

**Usage:**
```typescript
throw new AppError(ErrorCode.NETWORK_ERROR, 'Failed to fetch listing', {
  url: '/listings/123',
  statusCode: 500,
});
```

### 2. Error Handlers

Located in `lib/error/errorHandler.ts`, these utilities provide consistent error processing:

#### `handleError(error, options?)`
Basic error handler with optional alert display and re-throwing.

```typescript
try {
  await riskOperation();
} catch (error) {
  handleError(error, {
    alert: true,  // Show user alert
    rethrow: true // Re-throw after handling
  });
}
```

#### `withErrorHandling(fn)`
Wraps async functions with automatic error handling.

```typescript
const safeFetch = withErrorHandling(async () => {
  return await fetchListings();
});
```

#### `safeHandle(fn)`
Catches all errors and logs without throwing. Ideal for background operations.

```typescript
safeHandle(async () => {
  await syncNotifications();
  // Silently fails if sync fails
});
```

### 3. Error Boundaries

Located in `components/ui/ErrorBoundary.tsx`, React Error Boundaries catch component render errors:

**Features:**
- Prevents white-screen crashes
- Provides retry mechanism
- Shows error details in development mode only
- Logs errors through centralized logger

**Usage:**
```typescript
export default function MyScreen() {
  return (
    <ErrorBoundary context="MyScreen">
      <MyScreenContent />
    </ErrorBoundary>
  );
}
```

### 4. Centralized Logging

Located in `lib/logging/logger.ts`, the logger provides environment-aware logging:

```typescript
logger.error('Operation failed', { context: 'listingFetch' });
logger.warn('Deprecated API used', { endpoint: '/v1/listings' });
logger.info('User logged in', { userId: user.id });
logger.debug('Cache hit', { key: 'listings' });
```

**Environment Behavior:**
- **Development** (__DEV__): Logs to console with full details
- **Production**: Logs prepared for integration with error tracking services (e.g., Sentry)

## Common Patterns

### Async Operation Error Handling

For most async operations, wrap in try-catch with AppError construction:

```typescript
async function fetchListingById(id: string): Promise<Listing | null> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new AppError(ErrorCode.DB_ERROR, error.message);
    return data;
  } catch (error) {
    logger.error('Failed to fetch listing', { listingId: id });
    throw error;
  }
}
```

### Promise Chain Error Handling

For Promise chains, attach .catch() handlers:

```typescript
AsyncStorage.getItem(CACHE_KEY)
  .then(cached => cached ? JSON.parse(cached) : null)
  .catch(error => {
    logger.warn('Failed to read cache', { key: CACHE_KEY });
    return null; // Provide sensible default
  });
```

### Database Operation Safety

Always check for errors after database mutations:

```typescript
const { error } = await supabase
  .from('users')
  .update({ bio })
  .eq('id', userId);

if (error) {
  handleError(new AppError(ErrorCode.DB_ERROR, error.message), {
    alert: true,
  });
  return;
}
```

### Race Condition Prevention

Use `isMounted` flag with `AbortController` for async cleanup:

```typescript
useEffect(() => {
  let isMounted = true;
  const controller = new AbortController();
  
  (async () => {
    try {
      const data = await fetchProfile(signal: controller.signal);
      if (isMounted) setProfile(data);
    } catch (error) {
      if (!controller.signal.aborted) {
        logger.error('Failed to fetch profile');
      }
    }
  })();
  
  return () => {
    isMounted = false;
    controller.abort();
  };
}, []);
```

### Input Validation

Validate route parameters and user input early:

```typescript
import { validateRouteId } from '@/lib/validation/uuid';

const { id } = useLocalSearchParams<{ id: string }>();

useEffect(() => {
  if (!id || !validateRouteId(id)) {
    setError(true);
    return;
  }
  // Proceed with valid ID
}, [id]);
```

## Best Practices

### 1. Always Provide Error Context
Include relevant data in error context for debugging:
```typescript
throw new AppError(ErrorCode.NETWORK_ERROR, 'Request failed', {
  url: endpoint,
  method: 'GET',
  statusCode: 500,
  timestamp: new Date().toISOString(),
});
```

### 2. Use Appropriate Error Types
Match error code to the actual problem:
- Use `VALIDATION_FAILED` for user input issues
- Use `TIMEOUT` for slow requests
- Use `SESSION_EXPIRED` for auth token expiration
- Use `DB_CONSTRAINT` for uniqueness/foreign key violations

### 3. Provide User-Friendly Messages
The `AppError.getUserMessage()` method returns appropriate messages for display. Always use this for user-facing alerts, never show raw error messages.

### 4. Implement Retry Logic
Mark retriable errors so higher-level code can retry:
```typescript
if (error.isRetriable()) {
  // Retry the operation
}
```

Common retriable errors: `NETWORK_ERROR`, `TIMEOUT`, `SERVER_ERROR`

### 5. Log Before Throwing
Always log errors before propagating them:
```typescript
logger.error('Operation failed', { operation: 'fetchListings' });
throw error;
```

### 6. Clean Up Resources
Always clean up subscriptions, timers, and requests on error:
```typescript
useEffect(() => {
  const subscription = listener.subscribe(...);
  return () => subscription.unsubscribe();
}, []);
```

### 7. Test Error Paths
Include test cases for error scenarios:
- Network failures
- Invalid input
- Permission denied
- Database errors
- Timeout scenarios

## File Structure

```
lib/
├── error/
│   ├── AppError.ts              # Error class definition
│   ├── errorHandler.ts          # Error handling utilities
│   └── ERROR_HANDLING.md         # This file
├── logging/
│   └── logger.ts                # Centralized logging
├── validation/
│   └── uuid.ts                  # Input validation utilities
└── context/
    └── AuthContext.tsx          # Auth state with error handling
components/
└── ui/
    └── ErrorBoundary.tsx        # React error boundary
```

## Migration Guide

### From Console Logs to Logger
```typescript
// Before
console.error('Error:', error);
console.warn('Warning');

// After
import { logger } from '@/lib/logging/logger';
logger.error('Error message', { context: 'operationName' });
logger.warn('Warning message');
```

### From Inline Error Handling to AppError
```typescript
// Before
throw new Error('Network failed');

// After
import { AppError, ErrorCode } from '@/lib/error/AppError';
throw new AppError(ErrorCode.NETWORK_ERROR, 'Network request failed');
```

### From Unvalidated Route Parameters
```typescript
// Before
const { id } = useLocalSearchParams<{ id: string }>();
// Using id without validation

// After
import { validateRouteId } from '@/lib/validation/uuid';
const { id } = useLocalSearchParams<{ id: string }>();
if (!validateRouteId(id)) {
  setError(true);
  return;
}
```

## Integration with Error Tracking

The logging system is designed to work with external error tracking services:

### Adding Sentry (Example)
```typescript
import * as Sentry from '@sentry/react-native';

// In logger.error()
if (process.env.NODE_ENV === 'production') {
  Sentry.captureException(error, { tags: { context } });
}
```

### Adding Custom Error Tracking
The `logger` module can be extended to support any error tracking service:
```typescript
// In lib/logging/logger.ts
export async function initializeErrorTracking() {
  // Initialize third-party service
}
```

## Monitoring and Alerts

Key metrics to monitor:
- Error rate by type
- Most common error contexts
- Error recovery success rate
- Network timeout frequency
- Database constraint violations

## Support and Questions

For questions about error handling patterns or debugging specific errors, refer to:
- `lib/error/AppError.ts` - Error definitions
- `lib/error/errorHandler.ts` - Handler implementations
- Individual route/component files - Real-world usage examples
