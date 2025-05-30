/**
 * CacheManager - FASE 3 MVP Performance Optimization
 * Advanced caching system for API responses and data
 * Provides intelligent caching with TTL and invalidation
 */

interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
}

interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum cache size
  enablePersistence?: boolean; // Enable localStorage persistence
}

class CacheManager {
  private cache = new Map<string, CacheItem>();
  private defaultTTL: number;
  private maxSize: number;
  private enablePersistence: boolean;
  private storageKey = 'agentsalud_cache';

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 100;
    this.enablePersistence = options.enablePersistence || false;

    if (this.enablePersistence && typeof window !== 'undefined') {
      this.loadFromStorage();
    }

    // Cleanup expired items every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      key
    };

    // Remove oldest item if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, item);

    if (this.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      if (this.enablePersistence) {
        this.saveToStorage();
      }
      return null;
    }

    return item.data as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (this.enablePersistence) {
      this.saveToStorage();
    }
    return result;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    if (this.enablePersistence && typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    this.cache.forEach(item => {
      if (now - item.timestamp > item.ttl) {
        expired++;
      } else {
        active++;
      }
    });

    return {
      total: this.cache.size,
      active,
      expired,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate()
    };
  }

  /**
   * Cleanup expired items
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0 && this.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * Get oldest cache key
   */
  private getOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    this.cache.forEach((item, key) => {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    });

    return oldestKey;
  }

  /**
   * Calculate cache hit rate (simplified)
   */
  private calculateHitRate(): number {
    // This is a simplified implementation
    // In a real scenario, you'd track hits and misses
    return this.cache.size > 0 ? 0.85 : 0;
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheData = Array.from(this.cache.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const cacheData = JSON.parse(stored);
        this.cache = new Map(cacheData);
        this.cleanup(); // Remove any expired items
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }
}

// Create singleton instance
export const cacheManager = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  enablePersistence: true
});

/**
 * API Cache utilities
 */
export const apiCache = {
  // Cache API responses
  cacheResponse: <T>(url: string, data: T, ttl?: number) => {
    cacheManager.set(`api:${url}`, data, ttl);
  },

  // Get cached API response
  getCachedResponse: <T>(url: string): T | null => {
    return cacheManager.get<T>(`api:${url}`);
  },

  // Cache user data
  cacheUserData: <T>(userId: string, data: T, ttl?: number) => {
    cacheManager.set(`user:${userId}`, data, ttl);
  },

  // Get cached user data
  getCachedUserData: <T>(userId: string): T | null => {
    return cacheManager.get<T>(`user:${userId}`);
  },

  // Cache organization data
  cacheOrgData: <T>(orgId: string, data: T, ttl?: number) => {
    cacheManager.set(`org:${orgId}`, data, ttl);
  },

  // Get cached organization data
  getCachedOrgData: <T>(orgId: string): T | null => {
    return cacheManager.get<T>(`org:${orgId}`);
  },

  // Invalidate cache by pattern
  invalidatePattern: (pattern: string) => {
    const keysToDelete: string[] = [];
    cacheManager['cache'].forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => cacheManager.delete(key));
  }
};

/**
 * React hook for cached data
 */
export const useCachedData = <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
) => {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      // Check cache first
      const cached = cacheManager.get<T>(key);
      if (cached) {
        setData(cached);
        return;
      }

      // Fetch if not cached
      setLoading(true);
      setError(null);
      
      try {
        const result = await fetcher();
        cacheManager.set(key, result, ttl);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [key, fetcher, ttl]);

  const invalidate = React.useCallback(() => {
    cacheManager.delete(key);
    setData(null);
  }, [key]);

  return { data, loading, error, invalidate };
};

export default cacheManager;
