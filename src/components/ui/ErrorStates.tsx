'use client';

/**
 * ErrorStates Component
 * Unified error handling and display for AgentSalud MVP
 * Provides consistent error UX across all dashboards and components
 * 
 * Features:
 * - WCAG 2.1 AA compliant with proper ARIA labels
 * - Responsive error displays
 * - Actionable error messages
 * - Mobile-optimized designs
 * 
 * @example
 * ```tsx
 * <ErrorAlert 
 *   title="Error al cargar citas" 
 *   message="No se pudieron cargar las citas. Intenta nuevamente."
 *   onRetry={() => refetch()}
 * />
 * ```
 */

import React from 'react';
import { AlertCircle, RefreshCw, Home, ArrowLeft, Wifi, WifiOff } from 'lucide-react';

/**
 * Standard error alert component
 */
interface ErrorAlertProps {
  title: string;
  message?: string;
  type?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorAlert({
  title,
  message,
  type = 'error',
  onRetry,
  onDismiss,
  retryLabel = 'Reintentar',
  className = ''
}: ErrorAlertProps) {
  const getStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  const getIcon = () => {
    return <AlertCircle className="h-5 w-5" aria-hidden="true" />;
  };

  return (
    <div 
      className={`${getStyles()} border rounded-lg p-4 ${className}`}
      role="alert"
      aria-labelledby="error-title"
      aria-describedby={message ? "error-message" : undefined}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 id="error-title" className="text-sm font-medium">
            {title}
          </h3>
          {message && (
            <p id="error-message" className="mt-1 text-sm opacity-90">
              {message}
            </p>
          )}
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex space-x-3">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="
                    inline-flex items-center text-sm font-medium underline 
                    hover:no-underline focus:outline-none focus:ring-2 
                    focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200
                  "
                >
                  <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />
                  {retryLabel}
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="
                    text-sm font-medium underline hover:no-underline
                    focus:outline-none focus:ring-2 focus:ring-blue-500 
                    focus:ring-offset-1 transition-all duration-200
                  "
                >
                  Cerrar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state component for when no data is available
 */
interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = AlertCircle,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div 
      className={`text-center py-12 px-6 ${className}`}
      role="status"
      aria-label={`Estado vacío: ${title}`}
    >
      <Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="
            inline-flex items-center bg-blue-600 hover:bg-blue-700 
            text-white px-4 py-2 rounded-md text-sm font-medium
            focus:outline-none focus:ring-2 focus:ring-blue-500 
            focus:ring-offset-2 transition-colors duration-200
          "
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Network error component
 */
interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function NetworkError({ onRetry, className = '' }: NetworkErrorProps) {
  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg p-6 text-center ${className}`}
      role="alert"
      aria-labelledby="network-error-title"
    >
      <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
      <h3 id="network-error-title" className="text-lg font-medium text-gray-900 mb-2">
        Sin conexión a internet
      </h3>
      <p className="text-gray-600 mb-6">
        Verifica tu conexión a internet e intenta nuevamente.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="
            inline-flex items-center bg-blue-600 hover:bg-blue-700 
            text-white px-4 py-2 rounded-md text-sm font-medium
            focus:outline-none focus:ring-2 focus:ring-blue-500 
            focus:ring-offset-2 transition-colors duration-200
          "
        >
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Reintentar
        </button>
      )}
    </div>
  );
}

/**
 * Permission denied error component
 */
interface PermissionErrorProps {
  message?: string;
  onGoHome?: () => void;
  onGoBack?: () => void;
  className?: string;
}

export function PermissionError({
  message = 'No tienes permisos para acceder a esta página.',
  onGoHome,
  onGoBack,
  className = ''
}: PermissionErrorProps) {
  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg p-6 text-center ${className}`}
      role="alert"
      aria-labelledby="permission-error-title"
    >
      <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" aria-hidden="true" />
      <h3 id="permission-error-title" className="text-lg font-medium text-gray-900 mb-2">
        Acceso denegado
      </h3>
      <p className="text-gray-600 mb-6">
        {message}
      </p>
      <div className="flex justify-center space-x-3">
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="
              inline-flex items-center bg-gray-600 hover:bg-gray-700 
              text-white px-4 py-2 rounded-md text-sm font-medium
              focus:outline-none focus:ring-2 focus:ring-gray-500 
              focus:ring-offset-2 transition-colors duration-200
            "
          >
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Volver
          </button>
        )}
        {onGoHome && (
          <button
            type="button"
            onClick={onGoHome}
            className="
              inline-flex items-center bg-blue-600 hover:bg-blue-700 
              text-white px-4 py-2 rounded-md text-sm font-medium
              focus:outline-none focus:ring-2 focus:ring-blue-500 
              focus:ring-offset-2 transition-colors duration-200
            "
          >
            <Home className="h-4 w-4 mr-2" aria-hidden="true" />
            Ir al inicio
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Generic error boundary fallback component
 */
interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  className?: string;
}

export function ErrorFallback({ 
  error, 
  resetError, 
  className = '' 
}: ErrorFallbackProps) {
  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg p-6 text-center ${className}`}
      role="alert"
      aria-labelledby="error-fallback-title"
    >
      <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" aria-hidden="true" />
      <h3 id="error-fallback-title" className="text-lg font-medium text-gray-900 mb-2">
        Algo salió mal
      </h3>
      <p className="text-gray-600 mb-6">
        {error?.message || 'Ha ocurrido un error inesperado. Por favor, intenta nuevamente.'}
      </p>
      {resetError && (
        <button
          type="button"
          onClick={resetError}
          className="
            inline-flex items-center bg-blue-600 hover:bg-blue-700 
            text-white px-4 py-2 rounded-md text-sm font-medium
            focus:outline-none focus:ring-2 focus:ring-blue-500 
            focus:ring-offset-2 transition-colors duration-200
          "
        >
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Intentar nuevamente
        </button>
      )}
    </div>
  );
}

/**
 * Hook for standardized error handling
 */
export function useErrorHandler() {
  const handleError = (error: Error | string, context?: string) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
    
    console.error('Error handled:', fullMessage, error);
    
    // Here you could integrate with error reporting services
    // like Sentry, LogRocket, etc.
    
    return {
      title: 'Error',
      message: fullMessage,
      type: 'error' as const
    };
  };

  const handleNetworkError = () => {
    return {
      title: 'Error de conexión',
      message: 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
      type: 'error' as const
    };
  };

  const handlePermissionError = () => {
    return {
      title: 'Acceso denegado',
      message: 'No tienes permisos para realizar esta acción.',
      type: 'error' as const
    };
  };

  return {
    handleError,
    handleNetworkError,
    handlePermissionError
  };
}
