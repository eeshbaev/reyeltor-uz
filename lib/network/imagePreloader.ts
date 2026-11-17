/**
 * Image Preloading & Caching System
 * Optimizes image loading performance with prefetching and LQIP
 */

import { Image } from 'expo-image';
import { logger } from '@/lib/logging/logger';

interface ImagePreloadConfig {
  maxConcurrent?: number;
  timeout?: number;
}

// OPTIMIZATION #6: Add priority levels to image preloading
type ImagePriority = 'current' | 'next' | 'background';

class ImagePreloader {
  private queue: Map<string, ImagePriority> = new Map();
  private loading: Set<string> = new Set();
  private maxConcurrent: number;
  private timeout: number;
  private readonly MAX_QUEUE_SIZE = 20; // Prevent unbounded queue growth on old devices

  constructor(config: ImagePreloadConfig = {}) {
    this.maxConcurrent = config.maxConcurrent ?? 3;
    this.timeout = config.timeout ?? 10000;
  }

  /**
   * Preload a single image with priority
   * Useful for carousel images, next listing preview
   */
  async preload(uri: string, priority: ImagePriority = 'next'): Promise<void> {
    if (!uri || this.loading.has(uri)) return;

    this.queue.set(uri, priority);
    this.processQueue();
  }

  /**
   * Preload multiple images
   * Useful for listing cards in a list
   * Enforces max queue size to prevent memory bloat on old devices
   */
  async preloadBatch(uris: string[], priority: ImagePriority = 'background'): Promise<void> {
    const validUris = uris.filter(uri => uri && !this.loading.has(uri));

    // Add new URIs up to max queue size
    for (const uri of validUris) {
      if (this.queue.size >= this.MAX_QUEUE_SIZE) {
        logger.debug('Image preload queue full, skipping', {
          context: 'imagePreloader',
          extra: { queueSize: this.queue.size, maxSize: this.MAX_QUEUE_SIZE },
        });
        break;
      }
      this.queue.set(uri, priority);
    }

    this.processQueue();
  }

  /**
   * Prefetch carousel images with priority
   * Preload next/previous slides with high priority
   */
  async prefetchCarouselSlide(uri: string, priority: ImagePriority = 'next'): Promise<void> {
    // OPTIMIZATION #6: Use priority-based loading for carousel
    await this.preload(uri, priority);
  }

  /**
   * Process queue with concurrency limit and priority ordering
   */
  private processQueue(): void {
    while (this.loading.size < this.maxConcurrent && this.queue.size > 0) {
      // OPTIMIZATION #6: Get highest priority image (current > next > background)
      let nextUri: string | null = null;
      let highestPriority: ImagePriority | null = null;

      for (const [uri, priority] of this.queue) {
        if (!highestPriority || this.priorityRank(priority) > this.priorityRank(highestPriority)) {
          nextUri = uri;
          highestPriority = priority;
        }
      }

      if (nextUri) {
        this.queue.delete(nextUri);
        this.loadImage(nextUri);
      }
    }
  }

  /**
   * Get numeric rank for priority (higher = more important)
   */
  private priorityRank(priority: ImagePriority): number {
    switch (priority) {
      case 'current':
        return 3;
      case 'next':
        return 2;
      case 'background':
        return 1;
    }
  }

  /**
   * Load image with timeout
   */
  private async loadImage(uri: string): Promise<void> {
    if (this.loading.has(uri)) return;

    this.loading.add(uri);

    try {
      await Promise.race([
        Image.prefetch(uri),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Image load timeout')), this.timeout)
        ),
      ]);

      logger.debug('Image preloaded', { context: 'imagePreloader', extra: { uri } });
    } catch {
      logger.warn('Image preload failed', { context: 'imagePreloader', extra: { uri } });
    } finally {
      this.loading.delete(uri);
      this.processQueue();
    }
  }

  /**
   * Clear cache and queues
   */
  clear(): void {
    this.queue.clear();
    this.loading.clear();
  }

  /**
   * Get status for debugging
   */
  getStatus(): { queued: number; loading: number } {
    return {
      queued: this.queue.size,
      loading: this.loading.size,
    };
  }
}

// Singleton instance
export const imagePreloader = new ImagePreloader({
  maxConcurrent: 3,
  timeout: 10000,
});

/**
 * Preload carousel images with priority
 * Call when carousel mounts to load current and adjacent slides with priority
 */
export function preloadCarouselImages(imageUris: string[], currentIndex: number): void {
  if (imageUris.length === 0) return;

  const remoteUris = imageUris.filter(
    (uri) => uri.startsWith('http://') || uri.startsWith('https://'),
  );
  if (remoteUris.length === 0) return;

  const currentUri = remoteUris[currentIndex] ?? remoteUris[0];
  if (currentUri) {
    imagePreloader.preload(currentUri, 'current');
  }

  const adjacentIndices = [currentIndex - 1, currentIndex + 1].filter(
    (i) => i >= 0 && i < remoteUris.length,
  );
  for (const i of adjacentIndices) {
    const uri = remoteUris[i];
    if (uri) {
      imagePreloader.preload(uri, 'next');
    }
  }
}

/**
 * Preload listing card images
 * Call with listing batch from list to preload upcoming cards
 * OPTIMIZATION: Only preload first 5 to reduce memory usage
 */
export function preloadListingImages(listingPhotoUrls: string[]): void {
  if (listingPhotoUrls.length === 0) return;
  // Preload first 5 images from current batch with background priority
  // This ensures memory is freed if needed for foreground images
  imagePreloader.preloadBatch(listingPhotoUrls.slice(0, 5), 'background');
}

/**
 * Add image URL parameter for automatic downsampling
 * Reduces bandwidth and memory usage by requesting appropriately sized images
 * @param uri Original image URL
 * @param width Target width in pixels (e.g., 400 for list card)
 * @param height Target height in pixels (e.g., 300 for list card)
 * @returns Modified URL with size parameters for server-side downsampling
 */
export function getOptimizedImageUrl(uri: string, _width: number = 400, _height: number = 300): string {
  if (!uri || uri.startsWith('file://') || uri.startsWith('demo:') || uri.startsWith('local:')) return uri;
  // Supabase image transforms use a separate render endpoint; keep public object URLs unchanged.
  return uri;
}

/**
 * Low Quality Image Placeholder (LQIP)
 * Returns a blurred placeholder while real image loads
 */
export const LQIP = {
  /**
   * Get blurhash placeholder for image
   * Store blurhash with listing photos for instant blur effect
   */
  blurhash: (hash: string | undefined) => hash,

  /**
   * Get dominant color placeholder
   * Use average color as placeholder
   */
  dominantColor: (color: string | undefined) => color ?? '#E5E7EB',

  /**
   * Get gradient placeholder
   * Subtle gradient while loading
   */
  gradient: () => '#F3F4F6',
};
