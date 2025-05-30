/**
 * Performance Optimization Hooks
 * Provides hooks for optimizing component performance
 * Includes debouncing, memoization, and lazy loading utilities
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Debounce hook for search inputs and API calls
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for scroll events and frequent updates
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsIntersecting(entry.isIntersecting);
        }
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options]);

  return isIntersecting;
}

// Virtual scrolling hook for large lists
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [items, itemHeight, containerHeight, scrollTop]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    handleScroll,
    totalHeight: visibleItems.totalHeight,
  };
}

// Memoized API call hook with caching
export function useMemoizedApiCall<T>(
  apiCall: () => Promise<T>,
  dependencies: any[],
  cacheKey?: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const cacheTimeout = 5 * 60 * 1000; // 5 minutes

  const memoizedApiCall = useCallback(async () => {
    const key = cacheKey || JSON.stringify(dependencies);
    const cached = cache.current.get(key);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      setData(cached.data);
      return cached.data;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();

      // Cache the result
      cache.current.set(key, {
        data: result,
        timestamp: Date.now()
      });

      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    memoizedApiCall();
  }, dependencies);

  return { data, loading, error, refetch: memoizedApiCall };
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    renderCount.current += 1;
  });

  useEffect(() => {
    const endTime = Date.now();
    const renderTime = endTime - startTime.current;

    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} - Renders: ${renderCount.current}, Time: ${renderTime}ms`);
    }

    startTime.current = endTime;
  });

  return {
    renderCount: renderCount.current,
    logPerformance: (action: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} - ${action} at render ${renderCount.current}`);
      }
    }
  };
}

// Optimized search hook with debouncing and caching
export function useOptimizedSearch<T>(
  searchFunction: (query: string) => Promise<T[]>,
  debounceMs: number = 300
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, debounceMs);
  const cache = useRef<Map<string, T[]>>(new Map());
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    // Check cache first
    const cached = cache.current.get(debouncedQuery);
    if (cached) {
      setResults(cached);
      return;
    }

    // Abort previous request
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    setLoading(true);
    setError(null);

    searchFunction(debouncedQuery)
      .then((searchResults) => {
        if (!abortController.current?.signal.aborted) {
          setResults(searchResults);
          cache.current.set(debouncedQuery, searchResults);
        }
      })
      .catch((err) => {
        if (!abortController.current?.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Error en la búsqueda');
        }
      })
      .finally(() => {
        if (!abortController.current?.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      abortController.current?.abort();
    };
  }, [debouncedQuery, searchFunction]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    clearResults: () => setResults([])
  };
}

// Image lazy loading hook
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const isInView = useIntersectionObserver(imgRef);

  useEffect(() => {
    if (isInView && src && !isLoaded && !isError) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      img.onerror = () => {
        setIsError(true);
      };
      img.src = src;
    }
  }, [isInView, src, isLoaded, isError]);

  return {
    imgRef,
    imageSrc,
    isLoaded,
    isError
  };
}

// Bundle size optimization - dynamic imports
export function useDynamicImport<T>(
  importFunction: () => Promise<{ default: T }>,
  dependencies: any[] = []
) {
  const [component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    importFunction()
      .then((module) => {
        setComponent(module.default);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error al cargar componente');
      })
      .finally(() => {
        setLoading(false);
      });
  }, dependencies);

  return { component, loading, error };
}
