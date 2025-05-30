'use client';

/**
 * LoadingStates Component
 * Unified loading states and skeleton loaders for AgentSalud MVP
 * Provides consistent loading UX across all dashboards and components
 * 
 * Features:
 * - WCAG 2.1 AA compliant with proper ARIA labels
 * - Responsive skeleton loaders
 * - Consistent animation patterns
 * - Mobile-optimized designs
 * 
 * @example
 * ```tsx
 * <SkeletonCard />
 * <SkeletonStats columns={4} />
 * <LoadingSpinner size="lg" message="Cargando citas..." />
 * ```
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Loading spinner with configurable size and message
 */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  message = 'Cargando...', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const containerClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center space-y-2 ${containerClasses[size]} ${className}`}
      role="status"
      aria-label={message}
    >
      <Loader2 
        className={`${sizeClasses[size]} animate-spin text-blue-600`}
        aria-hidden="true"
      />
      <span className="text-gray-600 font-medium">{message}</span>
    </div>
  );
}

/**
 * Full page loading overlay
 */
interface LoadingOverlayProps {
  message?: string;
  transparent?: boolean;
}

export function LoadingOverlay({ 
  message = 'Cargando...', 
  transparent = false 
}: LoadingOverlayProps) {
  return (
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        ${transparent ? 'bg-white bg-opacity-75' : 'bg-white'}
      `}
      role="status"
      aria-label={message}
      aria-live="polite"
    >
      <LoadingSpinner size="xl" message={message} />
    </div>
  );
}

/**
 * Skeleton loader for cards
 */
interface SkeletonCardProps {
  lines?: number;
  showAvatar?: boolean;
  className?: string;
}

export function SkeletonCard({ 
  lines = 3, 
  showAvatar = false, 
  className = '' 
}: SkeletonCardProps) {
  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg p-4 animate-pulse ${className}`}
      role="status"
      aria-label="Cargando contenido..."
    >
      <div className="flex items-start space-x-3">
        {showAvatar && (
          <div className="h-10 w-10 bg-gray-300 rounded-full flex-shrink-0"></div>
        )}
        <div className="flex-1 space-y-2">
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={`h-4 bg-gray-300 rounded ${
                index === lines - 1 ? 'w-2/3' : 'w-full'
              }`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for statistics cards
 */
interface SkeletonStatsProps {
  columns?: number;
  className?: string;
}

export function SkeletonStats({ columns = 4, className = '' }: SkeletonStatsProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
  };

  return (
    <div 
      className={`grid gap-4 ${gridClasses[columns as keyof typeof gridClasses]} ${className}`}
      role="status"
      aria-label="Cargando estadísticas..."
    >
      {Array.from({ length: columns }).map((_, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-gray-300 rounded-md"></div>
            </div>
            <div className="ml-5 flex-1">
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-8 bg-gray-300 rounded mb-1"></div>
              <div className="h-3 bg-gray-300 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for lists
 */
interface SkeletonListProps {
  items?: number;
  showImage?: boolean;
  className?: string;
}

export function SkeletonList({ 
  items = 5, 
  showImage = false, 
  className = '' 
}: SkeletonListProps) {
  return (
    <div 
      className={`space-y-4 ${className}`}
      role="status"
      aria-label="Cargando lista..."
    >
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse"
        >
          <div className="flex items-center space-x-3">
            {showImage && (
              <div className="h-12 w-12 bg-gray-300 rounded-lg flex-shrink-0"></div>
            )}
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
            <div className="flex-shrink-0">
              <div className="h-8 w-16 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for tables
 */
interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}: SkeletonTableProps) {
  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}
      role="status"
      aria-label="Cargando tabla..."
    >
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <div key={index} className="h-4 bg-gray-300 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div 
                  key={colIndex} 
                  className={`h-4 bg-gray-300 rounded animate-pulse ${
                    colIndex === 0 ? 'w-full' : 'w-3/4'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Inline loading state for buttons
 */
interface LoadingButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function LoadingButton({ 
  loading = false, 
  children, 
  className = '', 
  disabled = false,
  onClick,
  type = 'button'
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
      aria-disabled={disabled || loading}
    >
      {loading && (
        <Loader2 
          className="h-4 w-4 animate-spin mr-2" 
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
