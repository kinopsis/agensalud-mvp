'use client';

/**
 * DateSelector Component
 * Unified date selection component for appointment booking
 * Provides both calendar card view and traditional date picker
 */

import React from 'react';
import { Calendar } from 'lucide-react';

interface DateOption {
  date: string; // YYYY-MM-DD format
  label: string;
  disabled?: boolean;
}

interface DateSelectorProps {
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  mode?: 'cards' | 'input';
  title?: string;
  subtitle?: string;
  minDate?: string;
  maxDate?: string;
  className?: string;
  disabled?: boolean;
}

export default function DateSelector({
  selectedDate,
  onDateSelect,
  mode = 'cards',
  title = '¿Cuándo te gustaría la cita?',
  subtitle,
  minDate,
  maxDate,
  className = '',
  disabled = false
}: DateSelectorProps) {
  // Generate next 7 days for card mode
  const getNextWeekDays = (): DateOption[] => {
    const days: DateOption[] = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const isToday = i === 0;
      const isTomorrow = i === 1;
      
      let label: string;
      if (isToday) {
        label = 'Hoy';
      } else if (isTomorrow) {
        label = 'Mañana';
      } else {
        label = date.toLocaleDateString('es-ES', { 
          weekday: 'short', 
          day: 'numeric',
          month: 'short'
        });
      }
      
      days.push({
        date: dateStr,
        label,
        disabled: (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)
      });
    }
    
    return days;
  };

  if (mode === 'input') {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {title}
        </label>
        {subtitle && (
          <p className="text-sm text-gray-600 mb-3">{subtitle}</p>
        )}
        <input
          type="date"
          value={selectedDate || ''}
          onChange={(e) => onDateSelect(e.target.value)}
          min={minDate || new Date().toISOString().split('T')[0]}
          max={maxDate}
          disabled={disabled}
          className="
            block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
            focus:outline-none focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          "
        />
      </div>
    );
  }

  const weekDays = getNextWeekDays();

  return (
    <div className={className}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {weekDays.map((day) => (
          <button
            key={day.date}
            type="button"
            onClick={() => !day.disabled && !disabled && onDateSelect(day.date)}
            disabled={day.disabled || disabled}
            className={`
              p-3 text-center border rounded-lg transition-all duration-200
              ${day.disabled || disabled
                ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                : selectedDate === day.date
                  ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }
            `}
          >
            <Calendar className="h-5 w-5 mx-auto mb-1 text-gray-600" />
            <div className="text-sm font-medium">{day.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
