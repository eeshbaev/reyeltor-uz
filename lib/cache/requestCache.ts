/**
 * In-memory cache for API requests to avoid redundant calls.
 * Useful for caching frequently-accessed data that doesn't change often.
 */
class RequestCache {
  private cache = new Map<string, { data: unknown; time: number }>();
  private readonly ttl: number; // milliseconds

  constructor(ttlMs: number = 5 * 60 * 1000) {
    // Default 5 minutes
    this.ttl = ttlMs;
  }

  /**
   * Get or fetch data using a cache key.
   * If cached and fresh, returns immediately. Otherwise calls fetcher and caches result.
   */
  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Return cached if fresh
    if (cached && now - cached.time < this.ttl) {
      return cached.data as T;
    }

    // Fetch and cache
    try {
      const data = await fetcher();
      this.cache.set(key, { data, time: now });
      return data;
    } catch (error) {
      // If fetch fails and we have stale cache, return it
      if (cached) {
        return cached.data as T;
      }
      throw error;
    }
  }

  /**
   * Manually set a cache entry.
   */
  set<T>(key: string, data: T) {
    this.cache.set(key, { data, time: Date.now() });
  }

  /**
   * Invalidate a specific cache entry.
   */
  invalidate(key: string) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries.
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache stats for debugging.
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instances for different cache durations
export const requestCacheShort = new RequestCache(1 * 60 * 1000); // 1 minute
export const requestCacheMedium = new RequestCache(5 * 60 * 1000); // 5 minutes
export const requestCacheLong = new RequestCache(30 * 60 * 1000); // 30 minutes
