/**
 * Dashboard Error Boundary Component
 * 
 * Specialized error boundary for dashboard layout that handles
 * authentication-related hydration errors and webpack module loading failures.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, LogOut } from 'lucide-react';

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
  errorType: 'auth' | 'hydration' | 'webpack' | 'unknown';
  retryCount: number;
}

// =====================================================
// ERROR DETECTION UTILITIES
// =====================================================

/**
 * Detect the type of error for appropriate handling
 */
function detectDashboardErrorType(error: Error): 'auth' | 'hydration' | 'webpack' | 'unknown' {
  const errorMessage = error.message.toLowerCase();
  const errorStack = error.stack?.toLowerCase() || '';

  // Authentication-related errors
  if (
    errorMessage.includes('useauth must be used within') ||
    errorMessage.includes('usetenant must be used within') ||
    errorMessage.includes('no user logged in') ||
    errorStack.includes('auth-context') ||
    errorStack.includes('tenant-context')
  ) {
    return 'auth';
  }

  // Webpack module loading errors
  if (
    errorMessage.includes('cannot read properties of undefined (reading \'call\')') ||
    errorMessage.includes('loading chunk') ||
    errorMessage.includes('chunkloaderror') ||
    errorMessage.includes('__webpack_require__') ||
    errorStack.includes('webpack')
  ) {
    return 'webpack';
  }

  // Hydration errors
  if (
    errorMessage.includes('hydration') ||
    errorMessage.includes('hydrating') ||
    errorMessage.includes('text content does not match') ||
    errorStack.includes('hydration')
  ) {
    return 'hydration';
  }

  return 'unknown';
}

// =====================================================
// MAIN COMPONENT
// =====================================================

/**
 * DashboardErrorBoundary - Specialized error boundary for dashboard layout
 */
export class DashboardErrorBoundary extends Component<Props, State> {
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
      errorType: detectDashboardErrorType(error)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    });

    // Enhanced logging for dashboard errors
    console.error('🚨 Dashboard Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      errorInfo,
      errorType: this.state.errorType,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      isDashboard: true
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry for webpack and hydration errors
    if ((this.state.errorType === 'webpack' || this.state.errorType === 'hydration') && this.state.retryCount < 2) {
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
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 5000); // Exponential backoff, max 5s
    
    this.retryTimeoutId = setTimeout(() => {
      console.log(`🔄 Dashboard Error Boundary: Auto-retry attempt ${this.state.retryCount + 1}`);
      this.handleRetry();
    }, delay);
  };

  /**
   * Handle manual retry
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
   * Handle logout and redirect to login
   */
  private handleLogout = () => {
    // Clear any stored auth data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    }
    
    // Redirect to login
    window.location.href = '/login';
  };

  /**
   * Handle hard refresh
   */
  private handleHardRefresh = () => {
    // Clear caches and reload
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
   * Render error UI based on error type
   */
  private renderErrorUI() {
    const { error, errorType, retryCount } = this.state;

    // Use custom fallback if provided
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const errorConfig = {
      auth: {
        title: 'Error de Autenticación',
        message: 'Hubo un problema con la autenticación. Por favor, inicia sesión nuevamente.',
        icon: LogOut,
        color: 'red',
        showRetry: false,
        showLogout: true,
        showRefresh: false
      },
      webpack: {
        title: 'Error de Carga del Sistema',
        message: 'Hubo un problema al cargar componentes del dashboard. Esto suele resolverse recargando la página.',
        icon: RefreshCw,
        color: 'blue',
        showRetry: true,
        showLogout: false,
        showRefresh: true
      },
      hydration: {
        title: 'Error de Sincronización',
        message: 'La aplicación necesita sincronizarse. Esto suele resolverse recargando la página.',
        icon: AlertTriangle,
        color: 'yellow',
        showRetry: true,
        showLogout: false,
        showRefresh: true
      },
      unknown: {
        title: 'Error Inesperado',
        message: 'Ocurrió un error inesperado en el dashboard. Nuestro equipo ha sido notificado.',
        icon: AlertTriangle,
        color: 'red',
        showRetry: true,
        showLogout: true,
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
              Intentos de recuperación: {retryCount}/2
            </p>
          )}

          {/* Error Details (Development only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="text-left mb-4 p-3 bg-gray-100 rounded text-xs">
              <summary className="cursor-pointer font-medium">Detalles del Error</summary>
              <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
            </details>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {config.showRetry && retryCount < 2 && (
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 inline mr-2" />
                Reintentar
              </button>
            )}

            {config.showRefresh && (
              <button
                onClick={this.handleHardRefresh}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 inline mr-2" />
                Recargar Página
              </button>
            )}

            {config.showLogout && (
              <button
                onClick={this.handleLogout}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                <LogOut className="h-4 w-4 inline mr-2" />
                Cerrar Sesión
              </button>
            )}

            <button
              onClick={this.handleGoHome}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              <Home className="h-4 w-4 inline mr-2" />
              Ir al Inicio
            </button>
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

export default DashboardErrorBoundary;
