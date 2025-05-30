'use client';

/**
 * DateGroupHeader Component
 * Visual header for grouped appointments by date
 * Provides clear temporal separation and context
 */

import React from 'react';
import { Calendar, Clock, History } from 'lucide-react';

export interface DateGroupHeaderProps {
  title: string;
  subtitle?: string;
  icon: 'calendar' | 'clock' | 'history';
  appointmentCount: number;
  className?: string;
}

/**
 * Get icon component based on type
 */
const getIcon = (iconType: 'calendar' | 'clock' | 'history') => {
  switch (iconType) {
    case 'clock':
      return Clock;
    case 'history':
      return History;
    case 'calendar':
    default:
      return Calendar;
  }
};

/**
 * Get color scheme based on icon type
 */
const getColorScheme = (iconType: 'calendar' | 'clock' | 'history') => {
  switch (iconType) {
    case 'clock':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-900',
        subtitle: 'text-blue-700',
        count: 'bg-blue-100 text-blue-800'
      };
    case 'history':
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        icon: 'text-gray-600',
        title: 'text-gray-900',
        subtitle: 'text-gray-700',
        count: 'bg-gray-100 text-gray-800'
      };
    case 'calendar':
    default:
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        title: 'text-green-900',
        subtitle: 'text-green-700',
        count: 'bg-green-100 text-green-800'
      };
  }
};

/**
 * DateGroupHeader Component
 */
export default function DateGroupHeader({
  title,
  subtitle,
  icon,
  appointmentCount,
  className = ''
}: DateGroupHeaderProps) {
  const IconComponent = getIcon(icon);
  const colors = getColorScheme(icon);

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-4 mb-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-white ${colors.border} border`}>
            <IconComponent className={`h-5 w-5 ${colors.icon}`} />
          </div>
          
          <div>
            <h3 className={`text-lg font-semibold ${colors.title}`}>
              {title}
            </h3>
            {subtitle && (
              <p className={`text-sm ${colors.subtitle} mt-1`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${colors.count}`}>
          {appointmentCount} {appointmentCount === 1 ? 'cita' : 'citas'}
        </div>
      </div>
    </div>
  );
}
