'use client';

/**
 * StatsCard Component
 * Reusable statistics card for dashboards
 * Displays metrics with icons, trends, and actions
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  action?: {
    label: string;
    onClick: () => void;
  };
  loading?: boolean;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-500',
    text: 'text-blue-600',
    trend: 'text-blue-600'
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-500',
    text: 'text-green-600',
    trend: 'text-green-600'
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'bg-yellow-500',
    text: 'text-yellow-600',
    trend: 'text-yellow-600'
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-500',
    text: 'text-red-600',
    trend: 'text-red-600'
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-500',
    text: 'text-purple-600',
    trend: 'text-purple-600'
  },
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'bg-indigo-500',
    text: 'text-indigo-600',
    trend: 'text-indigo-600'
  }
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  action,
  loading = false
}: StatsCardProps) {
  const colors = colorClasses[color];

  if (loading) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`${colors.bg} p-3 rounded-md animate-pulse`}>
                <div className="h-6 w-6 bg-gray-300 rounded"></div>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="h-4 bg-gray-300 rounded animate-pulse mb-2"></div>
              <div className="h-8 bg-gray-300 rounded animate-pulse mb-1"></div>
              <div className="h-3 bg-gray-300 rounded animate-pulse w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return (
          <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'down':
        return (
          <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'neutral':
        return (
          <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    if (!trend) return '';
    
    switch (trend.direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div
      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
      role="article"
      aria-labelledby={`stats-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`${colors.bg} p-3 rounded-md`} aria-hidden="true">
              <Icon className={`h-6 w-6 text-white ${colors.icon}`} aria-hidden="true" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt
                id={`stats-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
                className="text-sm font-medium text-gray-500 truncate"
              >
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div
                  className="text-2xl font-semibold text-gray-900"
                  aria-label={`${title}: ${typeof value === 'number' ? value.toLocaleString() : value}`}
                >
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
                {trend && (
                  <div
                    className={`ml-2 flex items-baseline text-sm font-semibold ${getTrendColor()}`}
                    aria-label={`Tendencia: ${trend.value > 0 ? 'aumento' : trend.value < 0 ? 'disminución' : 'sin cambios'} de ${Math.abs(trend.value)}%`}
                  >
                    {getTrendIcon()}
                    <span className="ml-1" aria-hidden="true">
                      {trend.value > 0 ? '+' : ''}{trend.value}%
                    </span>
                  </div>
                )}
              </dd>
              {(subtitle || trend?.label) && (
                <dd className="text-sm text-gray-600 mt-1">
                  {subtitle || trend?.label}
                </dd>
              )}
            </dl>
          </div>
        </div>

        {action && (
          <div className="mt-4">
            <button
              type="button"
              onClick={action.onClick}
              className={`
                text-sm font-medium ${colors.text} hover:${colors.text} hover:underline
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                transition-all duration-200 touch-manipulation
              `}
              aria-label={`${action.label} para ${title}`}
            >
              {action.label} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton loader component
export function StatsCardSkeleton() {
  return (
    <div
      className="bg-white overflow-hidden shadow rounded-lg"
      role="status"
      aria-label="Cargando estadística..."
    >
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="bg-gray-200 p-3 rounded-md animate-pulse" aria-hidden="true">
              <div className="h-6 w-6 bg-gray-300 rounded"></div>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <div className="space-y-2" aria-hidden="true">
              <div className="h-4 bg-gray-300 rounded animate-pulse w-3/4"></div>
              <div className="h-8 bg-gray-300 rounded animate-pulse w-1/2"></div>
              <div className="h-3 bg-gray-300 rounded animate-pulse w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Grid container for stats cards
interface StatsGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
}

export function StatsGrid({ children, columns = 4 }: StatsGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-6`}>
      {children}
    </div>
  );
}
