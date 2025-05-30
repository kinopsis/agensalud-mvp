'use client';

/**
 * SelectionCard Component
 * Unified card-based selection component for appointment booking
 * Replaces traditional dropdowns with modern card interface
 */

import React from 'react';
import { SelectionOption } from './types';

interface SelectionCardProps {
  options: SelectionOption[];
  selectedId?: string;
  onSelect: (option: SelectionOption) => void;
  title: string;
  subtitle?: string;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  gridCols?: 1 | 2 | 3 | 4;
}

export default function SelectionCard({
  options,
  selectedId,
  onSelect,
  title,
  subtitle,
  loading = false,
  emptyMessage = 'No hay opciones disponibles',
  className = '',
  gridCols = 1
}: SelectionCardProps) {
  if (loading) {
    return (
      <div className={className}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando opciones...</span>
        </div>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className={className}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
        <div className="text-center py-8">
          <p className="text-gray-600">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4'
  }[gridCols];

  return (
    <div className={className}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
      <div className={`grid ${gridClass} gap-3`} role="listbox" aria-label={title}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => !option.disabled && onSelect(option)}
            disabled={option.disabled}
            aria-label={`${option.title}${option.subtitle ? ` - ${option.subtitle}` : ''}${option.price ? ` - $${option.price.toLocaleString()}` : ''}`}
            aria-selected={selectedId === option.id ? 'true' : 'false'}
            role="option"
            className={`
              p-5 text-left border-2 rounded-xl transition-all duration-300 transform
              min-h-[80px] focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50
              ${option.disabled
                ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                : selectedId === option.id
                  ? 'border-blue-500 bg-blue-50 text-blue-900 ring-4 ring-blue-200 shadow-lg scale-[1.02]'
                  : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-900 hover:shadow-md hover:scale-[1.01]'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {option.icon && (
                  <div className="mb-2 text-gray-500">
                    {option.icon}
                  </div>
                )}
                <div className="font-semibold text-lg text-gray-900">{option.title}</div>
                {option.subtitle && (
                  <div className="text-sm font-medium text-gray-700 mt-1">{option.subtitle}</div>
                )}
                {option.description && (
                  <div className="text-sm text-gray-600 mt-2 leading-relaxed">{option.description}</div>
                )}
              </div>
              {option.price !== undefined && (
                <div className="text-right ml-4 flex-shrink-0">
                  <div className="font-bold text-lg text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                    ${option.price.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Consulta</div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
