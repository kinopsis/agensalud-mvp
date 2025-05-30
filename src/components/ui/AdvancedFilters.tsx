/**
 * AdvancedFilters Component
 * Provides advanced filtering capabilities for data tables and lists
 * Supports multiple filter types, date ranges, and custom operators
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, Filter, X, Plus, Search, ChevronDown } from 'lucide-react';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'number' | 'boolean';
  options?: { value: string; label: string }[];
  operators?: FilterOperator[];
  placeholder?: string;
}

export interface FilterOperator {
  value: string;
  label: string;
  symbol: string;
}

export interface FilterRule {
  id: string;
  field: string;
  operator: string;
  value: any;
  type: string;
}

interface AdvancedFiltersProps {
  fields: FilterField[];
  onFiltersChange: (filters: FilterRule[]) => void;
  initialFilters?: FilterRule[];
  className?: string;
  showQuickFilters?: boolean;
  quickFilters?: { label: string; filters: FilterRule[] }[];
}

const DEFAULT_OPERATORS: Record<string, FilterOperator[]> = {
  text: [
    { value: 'contains', label: 'Contiene', symbol: '⊃' },
    { value: 'equals', label: 'Igual a', symbol: '=' },
    { value: 'starts_with', label: 'Comienza con', symbol: '→' },
    { value: 'ends_with', label: 'Termina con', symbol: '←' },
    { value: 'not_contains', label: 'No contiene', symbol: '⊅' }
  ],
  select: [
    { value: 'equals', label: 'Igual a', symbol: '=' },
    { value: 'not_equals', label: 'Diferente de', symbol: '≠' }
  ],
  number: [
    { value: 'equals', label: 'Igual a', symbol: '=' },
    { value: 'greater_than', label: 'Mayor que', symbol: '>' },
    { value: 'less_than', label: 'Menor que', symbol: '<' },
    { value: 'greater_equal', label: 'Mayor o igual', symbol: '≥' },
    { value: 'less_equal', label: 'Menor o igual', symbol: '≤' },
    { value: 'between', label: 'Entre', symbol: '↔' }
  ],
  date: [
    { value: 'equals', label: 'Igual a', symbol: '=' },
    { value: 'after', label: 'Después de', symbol: '>' },
    { value: 'before', label: 'Antes de', symbol: '<' },
    { value: 'between', label: 'Entre', symbol: '↔' }
  ],
  boolean: [
    { value: 'equals', label: 'Es', symbol: '=' }
  ]
};

export default function AdvancedFilters({
  fields,
  onFiltersChange,
  initialFilters = [],
  className = '',
  showQuickFilters = true,
  quickFilters = []
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterRule[]>(initialFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generate unique ID for new filters
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Add new filter rule
  const addFilter = useCallback(() => {
    const firstField = fields[0];
    const fieldType = firstField?.type || 'text';
    const operators = DEFAULT_OPERATORS[fieldType] || DEFAULT_OPERATORS.text;

    const newFilter: FilterRule = {
      id: generateId(),
      field: firstField?.key || '',
      operator: (operators && operators[0]?.value) || 'equals',
      value: '',
      type: fieldType
    };

    const updatedFilters = [...filters, newFilter];
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  }, [fields, filters, onFiltersChange]);

  // Remove filter rule
  const removeFilter = useCallback((filterId: string) => {
    const updatedFilters = filters.filter(f => f.id !== filterId);
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  }, [filters, onFiltersChange]);

  // Update filter rule
  const updateFilter = useCallback((filterId: string, updates: Partial<FilterRule>) => {
    const updatedFilters = filters.map(f =>
      f.id === filterId ? { ...f, ...updates } : f
    );
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  }, [filters, onFiltersChange]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters([]);
    onFiltersChange([]);
  }, [onFiltersChange]);

  // Apply quick filter preset
  const applyQuickFilter = useCallback((quickFilter: { label: string; filters: FilterRule[] }) => {
    const filtersWithIds = quickFilter.filters.map(f => ({
      ...f,
      id: generateId()
    }));
    setFilters(filtersWithIds);
    onFiltersChange(filtersWithIds);
  }, [onFiltersChange]);

  // Get field configuration
  const getField = useCallback((fieldKey: string) => {
    return fields.find(f => f.key === fieldKey);
  }, [fields]);

  // Get operators for field type
  const getOperators = useCallback((fieldType: string, customOperators?: FilterOperator[]) => {
    return customOperators || DEFAULT_OPERATORS[fieldType] || DEFAULT_OPERATORS.text;
  }, []);

  // Render filter value input
  const renderValueInput = useCallback((filter: FilterRule) => {
    const field = getField(filter.field);
    if (!field) return null;

    const commonProps = {
      value: filter.value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        updateFilter(filter.id, { value: e.target.value }),
      className: "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    };

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={field.placeholder || `Ingrese ${field.label.toLowerCase()}`}
            {...commonProps}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            placeholder={field.placeholder || "0"}
            {...commonProps}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            {...commonProps}
          />
        );

      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Seleccionar...</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <select {...commonProps}>
            <option value="">Seleccionar...</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        );

      case 'daterange':
        return (
          <div className="flex space-x-2">
            <input
              type="date"
              value={filter.value?.from || ''}
              onChange={(e) => updateFilter(filter.id, {
                value: { ...filter.value, from: e.target.value }
              })}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Fecha desde"
              placeholder="Fecha desde"
            />
            <span className="text-gray-500 self-center">a</span>
            <input
              type="date"
              value={filter.value?.to || ''}
              onChange={(e) => updateFilter(filter.id, {
                value: { ...filter.value, to: e.target.value }
              })}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Fecha hasta"
              placeholder="Fecha hasta"
            />
          </div>
        );

      default:
        return null;
    }
  }, [getField, updateFilter]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    return filters.filter(f => f.value && f.value !== '').length;
  }, [filters]);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900">Filtros</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {filters.length > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Limpiar todo
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
          >
            Filtros avanzados
            <ChevronDown className={`h-4 w-4 ml-1 transform transition-transform ${
              showAdvanced ? 'rotate-180' : ''
            }`} />
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      {showQuickFilters && quickFilters.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((quickFilter, index) => (
              <button
                key={index}
                type="button"
                onClick={() => applyQuickFilter(quickFilter)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm transition-colors"
              >
                {quickFilter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-3">
          {filters.map((filter) => {
            const field = getField(filter.field);
            const operators = getOperators(filter.type, field?.operators);

            return (
              <div key={filter.id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                {/* Field Selection */}
                <select
                  value={filter.field}
                  onChange={(e) => {
                    const newField = getField(e.target.value);
                    const newOperators = getOperators(newField?.type || 'text', newField?.operators);
                    updateFilter(filter.id, {
                      field: e.target.value,
                      type: newField?.type || 'text',
                      operator: (newOperators && newOperators[0]?.value) || 'equals',
                      value: ''
                    });
                  }}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Seleccionar campo"
                >
                  {fields.map(field => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>

                {/* Operator Selection */}
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Seleccionar operador"
                >
                  {operators && operators.map(op => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>

                {/* Value Input */}
                <div className="flex-1">
                  {renderValueInput(filter)}
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeFilter(filter.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Eliminar filtro"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}

          {/* Add Filter Button */}
          <button
            type="button"
            onClick={addFilter}
            className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar filtro
          </button>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && !showAdvanced && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {filters
              .filter(f => f.value && f.value !== '')
              .map(filter => {
                const field = getField(filter.field);
                const operators = getOperators(filter.type, field?.operators);
                const operator = operators && operators.find(op => op.value === filter.operator);

                return (
                  <div
                    key={filter.id}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center"
                  >
                    <span>
                      {field?.label} {operator?.symbol} {
                        typeof filter.value === 'object'
                          ? `${filter.value.from} - ${filter.value.to}`
                          : filter.value
                      }
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFilter(filter.id)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                      title="Eliminar filtro"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
