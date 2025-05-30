'use client';

/**
 * AlertMessage Component
 * Unified alert/notification component for appointment booking
 * Provides consistent error, success, and info messaging
 */

import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface AlertMessageProps {
  type: 'error' | 'success' | 'info' | 'warning';
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export default function AlertMessage({
  type,
  title,
  message,
  onDismiss,
  className = ''
}: AlertMessageProps) {
  const config = {
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-400',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
      icon: AlertCircle
    },
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-400',
      titleColor: 'text-green-800',
      messageColor: 'text-green-700',
      icon: CheckCircle
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-400',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
      icon: Info
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-400',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700',
      icon: AlertCircle
    }
  }[type];

  const Icon = config.icon;

  return (
    <div className={`
      ${config.bgColor} ${config.borderColor} border rounded-md p-4 ${className}
    `}>
      <div className="flex">
        <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0`} />
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.titleColor}`}>
              {title}
            </h3>
          )}
          <p className={`text-sm ${config.messageColor} ${title ? 'mt-1' : ''}`}>
            {message}
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={`
              ml-3 flex-shrink-0 ${config.iconColor} hover:opacity-75 transition-opacity
            `}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
