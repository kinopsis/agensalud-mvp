/**
 * GlobalErrorBoundary Component
 * 
 * Handles chunk loading errors, hydration errors, and other runtime errors
 * in the AgentSalud application with proper recovery mechanisms.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: 'chunk' | 'hydration' | 'runtime' | 'unknown';
  retryCount: number;
}

// =====================================================
// ERROR TYPE DETECTION
// =====================================================

/**
 * Detect the type of error for appropriate handling
 */
function detectErrorType(error: Error): 'chunk' | 'hydration' | 'runtime' | 'unknown' {
  const errorMessage = error.message.toLowerCase();
  const errorStack = error.stack?.toLowerCase() || '';

  // Chunk loading errors
  if (
    errorMessage.includes('loading chunk') ||
    errorMessage.includes('chunkloaderror') ||
    errorStack.includes('chunk')
  ) {
    return 'chunk';
  }

  // Hydration errors
  if (
    errorMessage.includes('hydration') ||
    errorMessage.includes('hydrating') ||
    errorStack.includes('hydration')
  ) {
    return 'hydration';
  }

  // Runtime errors
  if (
    errorMessage.includes('runtime') ||
    errorStack.includes('runtime')
  ) {
    return 'runtime';
  }

  return 'unknown';
}

// =====================================================
// MAIN COMPONENT
// =====================================================

/**
 * GlobalErrorBoundary - Catches and handles all application errors
 * 
 * @description Provides comprehensive error handling for chunk loading,
 * hydration, and runtime errors with appropriate recovery strategies.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorType: detectErrorType(error)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    });

    // Log error details
    console.error('🚨 Global Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      errorInfo,
      errorType: this.state.errorType,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry for chunk loading errors
    if (this.state.errorType === 'chunk' && this.state.retryCount < 3) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  /**
   * Schedule automatic retry for recoverable errors
   */
  private scheduleRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, 2000 + (this.state.retryCount * 1000)); // Exponential backoff
  };

  /**
   * Handle manual or automatic retry
   */
  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  /**
   * Handle hard refresh for persistent errors
   */
  private handleHardRefresh = () => {
    // Clear all caches and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  /**
   * Navigate to home page
   */
  private handleGoHome = () => {
    window.location.href = '/';
  };

  /**
   * Navigate back
   */
  private handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.handleGoHome();
    }
  };

  /**
   * Render error UI based on error type
   */
  private renderErrorUI() {
    const { error, errorType, retryCount } = this.state;

    // Use custom fallback if provided
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const errorConfig = {
      chunk: {
        title: 'Error de Carga',
        message: 'Hubo un problema al cargar parte de la aplicación. Esto puede deberse a una conexión lenta o problemas temporales.',
        icon: RefreshCw,
        color: 'blue',
        showRetry: true,
        showRefresh: true
      },
      hydration: {
        title: 'Error de Sincronización',
        message: 'La aplicación necesita sincronizarse. Esto suele resolverse recargando la página.',
        icon: AlertTriangle,
        color: 'yellow',
        showRetry: false,
        showRefresh: true
      },
      runtime: {
        title: 'Error de Aplicación',
        message: 'Ocurrió un error inesperado en la aplicación. Nuestro equipo ha sido notificado.',
        icon: AlertTriangle,
        color: 'red',
        showRetry: true,
        showRefresh: true
      },
      unknown: {
        title: 'Error Desconocido',
        message: 'Ocurrió un error inesperado. Por favor, intenta recargar la página.',
        icon: AlertTriangle,
        color: 'gray',
        showRetry: true,
        showRefresh: true
      }
    };

    const config = errorConfig[errorType];
    const Icon = config.icon;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          {/* Error Icon */}
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-${config.color}-100 mb-4`}>
            <Icon className={`h-6 w-6 text-${config.color}-600`} />
          </div>

          {/* Error Title */}
          <h1 className="text-lg font-medium text-gray-900 mb-2">
            {config.title}
          </h1>

          {/* Error Message */}
          <p className="text-sm text-gray-600 mb-6">
            {config.message}
          </p>

          {/* Retry Count */}
          {retryCount > 0 && (
            <p className="text-xs text-gray-500 mb-4">
              Intentos de recuperación: {retryCount}/3
            </p>
          )}

          {/* Error Details (Development) */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="text-left mb-6 p-3 bg-gray-100 rounded text-xs">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                Detalles del error (desarrollo)
              </summary>
              <pre className="whitespace-pre-wrap text-red-600">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {config.showRetry && retryCount < 3 && (
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </button>
            )}

            {config.showRefresh && (
              <button
                type="button"
                onClick={this.handleHardRefresh}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recargar Página
              </button>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={this.handleGoBack}
                className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Home className="h-4 w-4 mr-2" />
                Inicio
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
