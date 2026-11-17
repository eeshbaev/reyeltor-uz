import type { ListingWithPhotos } from '@/types';

/**
 * In-memory LRU cache for listings to prevent memory bloat when account switching.
 * Automatically evicts least-recently-used items when size exceeds limit.
 */
export class ListingMemoryCache {
  private cache = new Map<string, ListingWithPhotos>();
  private accessTime = new Map<string, number>();
  private readonly maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  /**
   * Add or update a listing in the cache.
   */
  set(listing: ListingWithPhotos) {
    this.cache.set(listing.id, listing);
    this.accessTime.set(listing.id, Date.now());

    // Evict LRU item if cache exceeds max size
    if (this.cache.size > this.maxSize) {
      const lruEntry = Array.from(this.accessTime.entries())
        .sort((a, b) => a[1] - b[1])[0];

      if (lruEntry) {
        const [id] = lruEntry;
        this.cache.delete(id);
        this.accessTime.delete(id);
      }
    }
  }

  /**
   * Get a listing from cache and update its access time (LRU).
   */
  get(id: string): ListingWithPhotos | undefined {
    const listing = this.cache.get(id);
    if (listing) {
      // Update access time for LRU tracking
      this.accessTime.set(id, Date.now());
    }
    return listing;
  }

  /**
   * Check if a listing exists in cache.
   */
  has(id: string): boolean {
    return this.cache.has(id);
  }

  /**
   * Get all cached listings.
   */
  getAll(): ListingWithPhotos[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get cache size and stats.
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: `${Math.round((this.cache.size / this.maxSize) * 100)}%`,
    };
  }

  /**
   * Clear entire cache (useful on account switch).
   */
  clear() {
    this.cache.clear();
    this.accessTime.clear();
  }
}

// Export singleton instance
export const listingCache = new ListingMemoryCache(500);
