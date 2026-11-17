# Error Handling Quick Reference

Quick lookup guide for common error handling patterns in Reyeltor.uz.

## Pattern 1: Basic Try-Catch

```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', error);
  throw error;
}
```

## Pattern 2: With AppError

```typescript
import { AppError, ErrorCode } from '@/lib/error/AppError';

try {
  const data = await fetchData();
  return data;
} catch (error) {
  throw new AppError(
    ErrorCode.NETWORK_ERROR,
    'Failed to fetch data',
    error,
    { endpoint: '/api/data' }
  );
}
```

## Pattern 3: Promise Chain with Fallback

```typescript
AsyncStorage.getItem('cache_key')
  .then(value => value ? JSON.parse(value) : null)
  .catch(error => {
    logger.warn('Cache read failed');
    return null;
  });
```

## Pattern 4: Database Operations

```typescript
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('id', id);

if (error) {
  throw new AppError(ErrorCode.DB_ERROR, error.message);
}
```

## Pattern 5: Async with Race Prevention

```typescript
useEffect(() => {
  let isMounted = true;
  const controller = new AbortController();
  
  (async () => {
    try {
      const data = await fetch(url, { signal: controller.signal });
      if (isMounted) setData(data);
    } catch (error) {
      if (!controller.signal.aborted) {
        logger.error('Fetch failed');
      }
    }
  })();
  
  return () => {
    isMounted = false;
    controller.abort();
  };
}, [url]);
```

## Pattern 6: Route Parameter Validation

```typescript
import { validateRouteId } from '@/lib/validation/uuid';

const { id } = useLocalSearchParams<{ id: string }>();

useEffect(() => {
  if (!id || !validateRouteId(id)) {
    setError(true);
    return;
  }
  // Use validated id
}, [id]);
```

## Pattern 7: Event Handler with Error Handling

```typescript
const handlePress = useCallback(async () => {
  try {
    await riskyOperation();
  } catch (error) {
    handleError(error, { showAlert: true });
  }
}, []);
```

## Pattern 8: Component Error Boundary

```typescript
export default function MyScreen() {
  return (
    <ErrorBoundary context="MyScreen">
      <MyScreenContent />
    </ErrorBoundary>
  );
}
```

## Pattern 9: User Alert on Error

```typescript
import { Alert } from 'react-native';

try {
  await operation();
} catch (error) {
  const appError = new AppError(...);
  Alert.alert('Error', appError.getUserMessage());
}
```

## Pattern 10: Retry Logic

```typescript
async function retryOperation(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1 || !new AppError(...).isRetriable()) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Error Codes

| Code | Use Case |
|------|----------|
| `NETWORK_ERROR` | Network connectivity issues, connection refused |
| `TIMEOUT` | Request timeouts, slow responses |
| `AUTH_FAILED` | Invalid credentials, login failed |
| `PERMISSION_DENIED` | Insufficient permissions, access denied |
| `SESSION_EXPIRED` | Auth token expired, need re-login |
| `INVALID_INPUT` | User input validation failed |
| `VALIDATION_FAILED` | Server validation failed |
| `DB_ERROR` | Database operation failed |
| `DB_CONSTRAINT` | Unique constraint, foreign key violation |
| `SERVER_ERROR` | 5xx server errors |
| `NOT_FOUND` | Resource not found (404) |
| `UNKNOWN` | Uncategorized errors |

## Logger Usage

```typescript
import { logger } from '@/lib/logging/logger';

logger.error('Operation failed', error, { context: 'operationName' });
logger.warn('Deprecated method used', { context: 'myFunction' });
logger.info('User logged in', { context: 'auth', extra: { userId } });
logger.debug('Cache hit', { context: 'cacheManager' });
```

## Common Mistakes to Avoid

❌ **Don't:**
```typescript
try {
  await operation();
} catch (error) {
  console.error(error); // Use logger instead
}
```

✅ **Do:**
```typescript
try {
  await operation();
} catch (error) {
  logger.error('Operation failed', error);
}
```

---

❌ **Don't:**
```typescript
throw new Error('Something failed'); // Generic error
```

✅ **Do:**
```typescript
throw new AppError(ErrorCode.DB_ERROR, 'Failed to save user');
```

---

❌ **Don't:**
```typescript
Alert.alert('Error', error.message); // Raw error message
```

✅ **Do:**
```typescript
const appError = new AppError(...);
Alert.alert('Error', appError.getUserMessage());
```

---

❌ **Don't:**
```typescript
const { id } = useLocalSearchParams<{ id: string }>();
// Use id without validation
```

✅ **Do:**
```typescript
const { id } = useLocalSearchParams<{ id: string }>();
if (!validateRouteId(id)) {
  setError(true);
  return;
}
```

## File References

- Core: `lib/error/AppError.ts`, `lib/error/errorHandler.ts`
- Logging: `lib/logging/logger.ts`
- Validation: `lib/validation/uuid.ts`
- Components: `components/ui/ErrorBoundary.tsx`
- Documentation: `lib/error/ERROR_HANDLING.md` (this file)
