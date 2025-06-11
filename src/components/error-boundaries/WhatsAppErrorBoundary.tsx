/**
 * WhatsApp Error Boundary Component
 * 
 * React error boundary specifically designed for WhatsApp components with
 * fallback mechanisms, error reporting, and recovery options. Part of the
 * radical solution reliability implementation.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, MessageSquare, ArrowLeft, Bug } from 'lucide-react';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface WhatsAppErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Fallback component to render on error */
  fallback?: ReactNode;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Show detailed error information (development mode) */
  showDetails?: boolean;
  /** Enable automatic retry functionality */
  enableRetry?: boolean;
  /** Custom error title */
  errorTitle?: string;
  /** Custom error message */
  errorMessage?: string;
  /** Show navigation back option */
  showBackButton?: boolean;
}

interface WhatsAppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

// =====================================================
// ERROR BOUNDARY COMPONENT
// =====================================================

/**
 * WhatsAppErrorBoundary - React error boundary for WhatsApp components
 * 
 * @description Catches JavaScript errors in WhatsApp components and displays
 * a fallback UI with recovery options and error reporting.
 */
export class WhatsAppErrorBoundary extends Component<
  WhatsAppErrorBoundaryProps,
  WhatsAppErrorBoundaryState
> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: WhatsAppErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  // =====================================================
  // ERROR BOUNDARY LIFECYCLE
  // =====================================================

  static getDerivedStateFromError(error: Error): Partial<WhatsAppErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 WhatsApp Error Boundary caught an error:', error);
    console.error('📊 Error Info:', errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Call error callback if provided
    this.props.onError?.(error, errorInfo);

    // Report error to monitoring service
    this.reportError(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  // =====================================================
  // ERROR HANDLING METHODS
  // =====================================================

  /**
   * Report error to monitoring/logging service
   */
  private reportError(error: Error, errorInfo: ErrorInfo): void {
    try {
      // Create error report
      const errorReport = {
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        errorInfo: {
          componentStack: errorInfo.componentStack
        },
        context: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          retryCount: this.state.retryCount
        },
        component: 'WhatsAppErrorBoundary'
      };

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('🐛 WhatsApp Error Report');
        console.error('Error:', error);
        console.error('Component Stack:', errorInfo.componentStack);
        console.error('Full Report:', errorReport);
        console.groupEnd();
      }

      // Send to error reporting service (if available)
      if (typeof window !== 'undefined' && (window as any).errorReporting) {
        (window as any).errorReporting.captureException(error, {
          tags: { component: 'whatsapp' },
          extra: errorReport
        });
      }

    } catch (reportingError) {
      console.error('❌ Failed to report error:', reportingError);
    }
  }

  /**
   * Handle retry attempt
   */
  private handleRetry = (): void => {
    if (this.state.isRetrying) return;

    console.log(`🔄 Attempting to recover from WhatsApp error (retry ${this.state.retryCount + 1})`);

    this.setState({
      isRetrying: true,
      retryCount: this.state.retryCount + 1
    });

    // Add delay before retry to prevent immediate re-error
    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false
      });
    }, 1000);
  };

  /**
   * Handle navigation back
   */
  private handleGoBack = (): void => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to channels dashboard
      window.location.href = '/admin/channels';
    }
  };

  /**
   * Handle page refresh
   */
  private handleRefresh = (): void => {
    window.location.reload();
  };

  // =====================================================
  // RENDER METHODS
  // =====================================================

  /**
   * Render error details (development mode)
   */
  private renderErrorDetails(): ReactNode {
    if (!this.props.showDetails || process.env.NODE_ENV !== 'development') {
      return null;
    }

    const { error, errorInfo } = this.state;

    return (
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
          <Bug className="h-4 w-4 mr-2" />
          Error Details (Development)
        </h4>
        
        {error && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-700">Error:</p>
            <pre className="text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
              {error.toString()}
            </pre>
          </div>
        )}

        {errorInfo && (
          <div>
            <p className="text-xs font-medium text-gray-700">Component Stack:</p>
            <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto max-h-32">
              {errorInfo.componentStack}
            </pre>
          </div>
        )}
      </div>
    );
  }

  /**
   * Render action buttons
   */
  private renderActionButtons(): ReactNode {
    const { enableRetry = true, showBackButton = true } = this.props;
    const { isRetrying, retryCount } = this.state;

    return (
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {enableRetry && (
          <button
            onClick={this.handleRetry}
            disabled={isRetrying || retryCount >= 3}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Reintentando...' : `Reintentar${retryCount > 0 ? ` (${retryCount}/3)` : ''}`}
          </button>
        )}

        <button
          onClick={this.handleRefresh}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Recargar Página
        </button>

        {showBackButton && (
          <button
            onClick={this.handleGoBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </button>
        )}
      </div>
    );
  }

  /**
   * Render fallback UI
   */
  private renderFallbackUI(): ReactNode {
    const {
      fallback,
      errorTitle = 'Error en WhatsApp',
      errorMessage = 'Ha ocurrido un error inesperado en el componente de WhatsApp. Por favor, intenta nuevamente.'
    } = this.props;

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Default fallback UI
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          {/* Error Title */}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {errorTitle}
          </h3>

          {/* Error Message */}
          <p className="text-gray-600 mb-6">
            {errorMessage}
          </p>

          {/* Action Buttons */}
          {this.renderActionButtons()}

          {/* Error Details */}
          {this.renderErrorDetails()}

          {/* WhatsApp Context */}
          <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center text-sm text-green-800">
              <MessageSquare className="h-4 w-4 mr-2" />
              Si el problema persiste, contacta al soporte técnico
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN RENDER
  // =====================================================

  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderFallbackUI();
    }

    return this.props.children;
  }
}

// =====================================================
// HIGHER-ORDER COMPONENT
// =====================================================

/**
 * Higher-order component to wrap components with WhatsApp error boundary
 */
export function withWhatsAppErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Partial<WhatsAppErrorBoundaryProps>
) {
  const WithErrorBoundary = (props: P) => (
    <WhatsAppErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </WhatsAppErrorBoundary>
  );

  WithErrorBoundary.displayName = `withWhatsAppErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundary;
}

export default WhatsAppErrorBoundary;
