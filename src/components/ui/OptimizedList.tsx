/**
 * OptimizedList Component
 * High-performance list component with virtual scrolling and lazy loading
 * Optimized for large datasets and smooth scrolling
 */

import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useVirtualScrolling, useDebounce, useIntersectionObserver } from '@/hooks/usePerformanceOptimization';
import { Search, Loader2 } from 'lucide-react';

interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFunction?: (items: T[], query: string) => T[];
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  className?: string;
  onItemClick?: (item: T, index: number) => void;
  keyExtractor?: (item: T, index: number) => string;
}

export default function OptimizedList<T>({
  items,
  renderItem,
  itemHeight = 60,
  containerHeight = 400,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  searchFunction,
  loading = false,
  loadingComponent,
  emptyComponent,
  className = '',
  onItemClick,
  keyExtractor = (_, index) => index.toString()
}: OptimizedListProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchable || !debouncedSearchQuery.trim()) {
      return items;
    }

    if (searchFunction) {
      return searchFunction(items, debouncedSearchQuery);
    }

    // Default search implementation (assumes items have searchable string properties)
    return items.filter((item) => {
      const searchableText = Object.values(item as any)
        .filter(value => typeof value === 'string')
        .join(' ')
        .toLowerCase();
      return searchableText.includes(debouncedSearchQuery.toLowerCase());
    });
  }, [items, debouncedSearchQuery, searchFunction, searchable]);

  // Virtual scrolling for performance
  const { visibleItems, handleScroll, totalHeight } = useVirtualScrolling(
    filteredItems,
    itemHeight,
    containerHeight
  );

  const handleItemClick = useCallback((item: T, index: number) => {
    if (onItemClick) {
      onItemClick(item, index);
    }
  }, [onItemClick]);

  // Loading state
  if (loading) {
    return (
      <div className={`${className}`}>
        {searchable && (
          <div className="mb-4">
            <div className="relative">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                disabled
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
              />
            </div>
          </div>
        )}
        <div 
          className="flex items-center justify-center bg-gray-50 rounded-lg"
          style={{ height: containerHeight }}
        >
          {loadingComponent || (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-500">Cargando...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (filteredItems.length === 0) {
    return (
      <div className={`${className}`}>
        {searchable && (
          <div className="mb-4">
            <div className="relative">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
        <div 
          className="flex items-center justify-center bg-gray-50 rounded-lg"
          style={{ height: containerHeight }}
        >
          {emptyComponent || (
            <div className="text-center">
              <p className="text-gray-500">
                {searchQuery ? 'No se encontraron resultados' : 'No hay elementos para mostrar'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Search Input */}
      {searchable && (
        <div className="mb-4">
          <div className="relative">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-gray-600">
              {filteredItems.length} de {items.length} elementos
            </div>
          )}
        </div>
      )}

      {/* Virtual Scrolled List */}
      <div
        ref={containerRef}
        className="overflow-auto border border-gray-200 rounded-lg bg-white"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              transform: `translateY(${visibleItems.offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {visibleItems.items.map((item, index) => {
              const actualIndex = visibleItems.startIndex + index;
              return (
                <div
                  key={keyExtractor(item, actualIndex)}
                  style={{ height: itemHeight }}
                  className={`border-b border-gray-100 last:border-b-0 ${
                    onItemClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  }`}
                  onClick={() => handleItemClick(item, actualIndex)}
                >
                  {renderItem(item, actualIndex)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mt-2 text-xs text-gray-500 text-right">
        Mostrando {visibleItems.items.length} de {filteredItems.length} elementos
      </div>
    </div>
  );
}

// Memoized list item wrapper for better performance
export const MemoizedListItem = React.memo(function MemoizedListItem<T>({
  item,
  index,
  renderItem,
  onClick,
  keyExtractor
}: {
  item: T;
  index: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  onClick?: (item: T, index: number) => void;
  keyExtractor?: (item: T, index: number) => string;
}) {
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(item, index);
    }
  }, [item, index, onClick]);

  return (
    <div
      key={keyExtractor ? keyExtractor(item, index) : index}
      onClick={handleClick}
      className={onClick ? 'cursor-pointer hover:bg-gray-50' : ''}
    >
      {renderItem(item, index)}
    </div>
  );
});

// Lazy loading list item component
export function LazyListItem({ 
  children, 
  threshold = 0.1 
}: { 
  children: React.ReactNode;
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(ref, { threshold });
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    if (isVisible && !hasBeenVisible) {
      setHasBeenVisible(true);
    }
  }, [isVisible, hasBeenVisible]);

  return (
    <div ref={ref}>
      {hasBeenVisible ? children : (
        <div className="h-16 bg-gray-100 animate-pulse rounded" />
      )}
    </div>
  );
}
