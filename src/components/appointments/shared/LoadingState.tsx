'use client';

/**
 * LoadingState Component
 * Unified loading state component for appointment booking
 * Provides consistent loading indicators across flows
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  inline?: boolean;
}

export default function LoadingState({
  message = 'Cargando...',
  size = 'md',
  className = '',
  inline = false
}: LoadingStateProps) {
  const sizeConfig = {
    sm: {
      spinner: 'h-4 w-4',
      text: 'text-sm'
    },
    md: {
      spinner: 'h-6 w-6',
      text: 'text-base'
    },
    lg: {
      spinner: 'h-8 w-8',
      text: 'text-lg'
    }
  }[size];

  if (inline) {
    return (
      <div className={`flex items-center ${className}`}>
        <Loader2 className={`${sizeConfig.spinner} animate-spin text-blue-600 mr-2`} />
        <span className={`text-gray-600 ${sizeConfig.text}`}>{message}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <div className="text-center">
        <Loader2 className={`${sizeConfig.spinner} animate-spin text-blue-600 mx-auto mb-2`} />
        <span className={`text-gray-600 ${sizeConfig.text}`}>{message}</span>
      </div>
    </div>
  );
}
