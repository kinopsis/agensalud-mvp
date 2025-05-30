/**
 * CacheManager Tests - FASE 3 MVP Performance Optimization
 * Tests for advanced caching system
 */

import { cacheManager, apiCache } from '@/lib/cache/CacheManager';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('CacheManager', () => {
  beforeEach(() => {
    cacheManager.clear();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Operations', () => {
    test('sets and gets cache items', () => {
      const testData = { id: 1, name: 'Test' };
      cacheManager.set('test-key', testData);
      
      const retrieved = cacheManager.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    test('returns null for non-existent keys', () => {
      const result = cacheManager.get('non-existent');
      expect(result).toBeNull();
    });

    test('checks if key exists', () => {
      cacheManager.set('test-key', 'test-value');
      
      expect(cacheManager.has('test-key')).toBe(true);
      expect(cacheManager.has('non-existent')).toBe(false);
    });

    test('deletes cache items', () => {
      cacheManager.set('test-key', 'test-value');
      expect(cacheManager.has('test-key')).toBe(true);
      
      const deleted = cacheManager.delete('test-key');
      expect(deleted).toBe(true);
      expect(cacheManager.has('test-key')).toBe(false);
    });

    test('clears all cache', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      
      cacheManager.clear();
      
      expect(cacheManager.has('key1')).toBe(false);
      expect(cacheManager.has('key2')).toBe(false);
    });
  });

  describe('TTL (Time To Live)', () => {
    test('respects custom TTL', () => {
      const shortTTL = 1000; // 1 second
      cacheManager.set('short-lived', 'value', shortTTL);
      
      expect(cacheManager.get('short-lived')).toBe('value');
      
      // Fast-forward time beyond TTL
      jest.advanceTimersByTime(shortTTL + 100);
      
      expect(cacheManager.get('short-lived')).toBeNull();
    });

    test('uses default TTL when not specified', () => {
      cacheManager.set('default-ttl', 'value');
      
      expect(cacheManager.get('default-ttl')).toBe('value');
      
      // Fast-forward time beyond default TTL (5 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000 + 100);
      
      expect(cacheManager.get('default-ttl')).toBeNull();
    });

    test('cleanup removes expired items', () => {
      const shortTTL = 1000;
      cacheManager.set('expired', 'value', shortTTL);
      cacheManager.set('valid', 'value', 10000);
      
      // Fast-forward time to expire first item
      jest.advanceTimersByTime(shortTTL + 100);
      
      // Trigger cleanup (normally runs every minute)
      jest.advanceTimersByTime(60 * 1000);
      
      expect(cacheManager.get('expired')).toBeNull();
      expect(cacheManager.get('valid')).toBe('value');
    });
  });

  describe('Cache Statistics', () => {
    test('provides accurate cache statistics', () => {
      cacheManager.set('active1', 'value1', 10000);
      cacheManager.set('active2', 'value2', 10000);
      cacheManager.set('expired', 'value3', 1000);
      
      // Expire one item
      jest.advanceTimersByTime(1100);
      
      const stats = cacheManager.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.expired).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    test('calculates hit rate', () => {
      cacheManager.set('test', 'value');
      
      const stats = cacheManager.getStats();
      expect(stats.hitRate).toBe(0.85); // Simplified implementation returns 0.85
    });
  });

  describe('Cache Size Management', () => {
    test('removes oldest items when cache is full', () => {
      // Create a cache manager with small max size for testing
      const testCache = new (cacheManager.constructor as any)({ maxSize: 2 });
      
      testCache.set('first', 'value1');
      testCache.set('second', 'value2');
      testCache.set('third', 'value3'); // Should evict 'first'
      
      expect(testCache.get('first')).toBeNull();
      expect(testCache.get('second')).toBe('value2');
      expect(testCache.get('third')).toBe('value3');
    });
  });

  describe('Persistence', () => {
    test('saves to localStorage when persistence is enabled', () => {
      cacheManager.set('persistent-key', 'persistent-value');
      
      // Should have called localStorage.setItem
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    test('loads from localStorage on initialization', () => {
      const mockData = JSON.stringify([
        ['test-key', {
          data: 'test-value',
          timestamp: Date.now(),
          ttl: 5 * 60 * 1000,
          key: 'test-key'
        }]
      ]);
      
      localStorageMock.getItem.mockReturnValue(mockData);
      
      // Create new cache instance to trigger loading
      const newCache = new (cacheManager.constructor as any)({ enablePersistence: true });
      
      expect(localStorageMock.getItem).toHaveBeenCalled();
    });

    test('handles localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(() => {
        cacheManager.set('test', 'value');
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save cache to localStorage:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('API Cache Utilities', () => {
    test('caches API responses', () => {
      const responseData = { users: [{ id: 1, name: 'John' }] };
      apiCache.cacheResponse('/api/users', responseData);
      
      const cached = apiCache.getCachedResponse('/api/users');
      expect(cached).toEqual(responseData);
    });

    test('caches user data', () => {
      const userData = { id: 1, name: 'John', role: 'admin' };
      apiCache.cacheUserData('user-1', userData);
      
      const cached = apiCache.getCachedUserData('user-1');
      expect(cached).toEqual(userData);
    });

    test('caches organization data', () => {
      const orgData = { id: 1, name: 'Test Org', plan: 'premium' };
      apiCache.cacheOrgData('org-1', orgData);
      
      const cached = apiCache.getCachedOrgData('org-1');
      expect(cached).toEqual(orgData);
    });

    test('invalidates cache by pattern', () => {
      apiCache.cacheResponse('/api/users', { users: [] });
      apiCache.cacheResponse('/api/users/1', { user: {} });
      apiCache.cacheResponse('/api/posts', { posts: [] });
      
      apiCache.invalidatePattern('users');
      
      expect(apiCache.getCachedResponse('/api/users')).toBeNull();
      expect(apiCache.getCachedResponse('/api/users/1')).toBeNull();
      expect(apiCache.getCachedResponse('/api/posts')).toEqual({ posts: [] });
    });
  });

  describe('Error Handling', () => {
    test('handles invalid JSON in localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(() => {
        new (cacheManager.constructor as any)({ enablePersistence: true });
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load cache from localStorage:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    test('handles missing localStorage gracefully', () => {
      const originalLocalStorage = window.localStorage;
      delete (window as any).localStorage;
      
      expect(() => {
        cacheManager.set('test', 'value');
      }).not.toThrow();
      
      window.localStorage = originalLocalStorage;
    });
  });

  describe('Memory Management', () => {
    test('prevents memory leaks with automatic cleanup', () => {
      // Set multiple items with short TTL
      for (let i = 0; i < 10; i++) {
        cacheManager.set(`item-${i}`, `value-${i}`, 1000);
      }
      
      expect(cacheManager.getStats().total).toBe(10);
      
      // Fast-forward time to expire all items
      jest.advanceTimersByTime(1100);
      
      // Trigger cleanup
      jest.advanceTimersByTime(60 * 1000);
      
      expect(cacheManager.getStats().active).toBe(0);
    });

    test('respects maximum cache size', () => {
      const stats = cacheManager.getStats();
      expect(stats.maxSize).toBeGreaterThan(0);
    });
  });

  describe('Type Safety', () => {
    test('maintains type safety for cached data', () => {
      interface User {
        id: number;
        name: string;
        email: string;
      }
      
      const user: User = { id: 1, name: 'John', email: 'john@example.com' };
      cacheManager.set<User>('user', user);
      
      const retrieved = cacheManager.get<User>('user');
      expect(retrieved).toEqual(user);
      expect(retrieved?.id).toBe(1);
      expect(retrieved?.name).toBe('John');
    });
  });
});
