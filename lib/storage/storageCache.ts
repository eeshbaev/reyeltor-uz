import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * In-memory cache for frequently accessed AsyncStorage keys.
 * Pre-loads critical keys at startup to avoid blocking reads on navigation.
 */
class StorageCacheManager {
  private cache = new Map<string, unknown>();
  private initialized = false;

  /**
   * Initialize cache by pre-loading critical storage keys.
   * Call this once during app startup (non-blocking).
   */
  async init() {
    if (this.initialized) return;

    const criticalKeys = [
      'displayCurrency',
      'FILTER_TOOLTIP_KEY',
      'userPreferences',
      'lastSearchFilters',
      'onboardingCompleted',
      'userProfileCache',
    ];

    // Load all keys in parallel
    const entries = await AsyncStorage.multiGet(criticalKeys);
    for (const [key, value] of entries) {
      if (value) {
        try {
          this.cache.set(key, JSON.parse(value));
        } catch {
          // Invalid JSON, store as string
          this.cache.set(key, value);
        }
      }
    }

    this.initialized = true;
  }

  /**
   * Get a value from cache. Falls back to AsyncStorage if not cached.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    // Return from memory cache if available
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // Fall back to AsyncStorage for uncached keys
    try {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          this.cache.set(key, parsed);
          return parsed as T;
        } catch {
          this.cache.set(key, value);
          return value as T;
        }
      }
    } catch (error) {
      console.warn(`Failed to read ${key} from AsyncStorage:`, error);
    }

    return null;
  }

  /**
   * Set a value in both cache and AsyncStorage (async).
   */
  set<T = unknown>(key: string, value: T) {
    // Update memory cache immediately for sync access
    this.cache.set(key, value);

    // Write to AsyncStorage asynchronously (non-blocking)
    AsyncStorage.setItem(key, JSON.stringify(value)).catch((error) => {
      console.warn(`Failed to write ${key} to AsyncStorage:`, error);
    });
  }

  /**
   * Remove a value from both cache and AsyncStorage.
   */
  async remove(key: string) {
    this.cache.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from AsyncStorage:`, error);
    }
  }

  /**
   * Clear entire cache and AsyncStorage.
   */
  async clear() {
    this.cache.clear();
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.warn('Failed to clear AsyncStorage:', error);
    }
  }
}

export const StorageCache = new StorageCacheManager();
