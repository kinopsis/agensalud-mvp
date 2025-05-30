'use client';

/**
 * LazyComponents - FASE 3 MVP Performance Optimization
 * Lazy loading implementation for heavy components
 * Provides performance optimization with loading states
 */

import React, { Suspense, lazy } from 'react';
import { Loader2, BarChart3, FileText, Settings } from 'lucide-react';

/**
 * Loading component for lazy-loaded components
 */
const ComponentLoader = ({ message = 'Cargando...' }: { message?: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  </div>
);

/**
 * Lazy-loaded components for performance optimization
 */

// Analytics Dashboard - Heavy component with charts
export const LazyAnalyticsDashboard = lazy(() => 
  import('@/app/(dashboard)/superadmin/analytics/page').then(module => ({
    default: module.default
  }))
);

// API Documentation - Heavy component with interactive examples
export const LazyAPIDocumentation = lazy(() => 
  import('@/app/(dashboard)/api-docs/page').then(module => ({
    default: module.default
  }))
);

// SuperAdmin Dashboard - Heavy component with system stats
export const LazySuperAdminDashboard = lazy(() => 
  import('@/components/dashboard/SuperAdminDashboard').then(module => ({
    default: module.default
  }))
);

/**
 * Wrapper components with Suspense and loading states
 */

export const AnalyticsDashboardWrapper = () => (
  <Suspense fallback={<ComponentLoader message="Cargando analytics avanzados..." />}>
    <LazyAnalyticsDashboard />
  </Suspense>
);

export const APIDocumentationWrapper = () => (
  <Suspense fallback={<ComponentLoader message="Cargando documentación de API..." />}>
    <LazyAPIDocumentation />
  </Suspense>
);

export const SuperAdminDashboardWrapper = () => (
  <Suspense fallback={<ComponentLoader message="Cargando dashboard de SuperAdmin..." />}>
    <LazySuperAdminDashboard />
  </Suspense>
);

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = React.useState({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0
  });

  React.useEffect(() => {
    const startTime = performance.now();
    
    // Monitor component load time
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          setMetrics(prev => ({
            ...prev,
            loadTime: entry.loadEventEnd - entry.loadEventStart
          }));
        }
      });
    });

    observer.observe({ entryTypes: ['navigation'] });

    // Monitor memory usage if available
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memoryInfo.usedJSHeapSize / 1024 / 1024 // MB
      }));
    }

    // Calculate render time
    const endTime = performance.now();
    setMetrics(prev => ({
      ...prev,
      renderTime: endTime - startTime
    }));

    return () => observer.disconnect();
  }, []);

  return metrics;
};

/**
 * Preload components for better UX
 */
export const preloadComponents = {
  analytics: () => import('@/app/(dashboard)/superadmin/analytics/page'),
  apiDocs: () => import('@/app/(dashboard)/api-docs/page'),
  superAdminDashboard: () => import('@/components/dashboard/SuperAdminDashboard')
};

/**
 * Component preloader hook
 */
export const useComponentPreloader = () => {
  const preloadAnalytics = React.useCallback(() => {
    preloadComponents.analytics();
  }, []);

  const preloadAPIDocumentation = React.useCallback(() => {
    preloadComponents.apiDocs();
  }, []);

  const preloadSuperAdminDashboard = React.useCallback(() => {
    preloadComponents.superAdminDashboard();
  }, []);

  return {
    preloadAnalytics,
    preloadAPIDocumentation,
    preloadSuperAdminDashboard
  };
};

/**
 * Error boundary for lazy components
 */
interface LazyErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class LazyErrorBoundary extends React.Component<
  LazyErrorBoundaryProps,
  { hasError: boolean; error?: Error }
> {
  constructor(props: LazyErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error al cargar componente
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Hubo un problema al cargar este componente. Por favor, recarga la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Enhanced lazy wrapper with error boundary and preloading
 */
interface EnhancedLazyWrapperProps {
  children: React.ReactNode;
  loadingMessage?: string;
  onPreload?: () => void;
}

export const EnhancedLazyWrapper: React.FC<EnhancedLazyWrapperProps> = ({
  children,
  loadingMessage = 'Cargando...',
  onPreload
}) => {
  React.useEffect(() => {
    if (onPreload) {
      // Preload on hover or focus
      const preloadTimer = setTimeout(onPreload, 100);
      return () => clearTimeout(preloadTimer);
    }
  }, [onPreload]);

  return (
    <LazyErrorBoundary>
      <Suspense fallback={<ComponentLoader message={loadingMessage} />}>
        {children}
      </Suspense>
    </LazyErrorBoundary>
  );
};

export default {
  AnalyticsDashboardWrapper,
  APIDocumentationWrapper,
  SuperAdminDashboardWrapper,
  ComponentLoader,
  LazyErrorBoundary,
  EnhancedLazyWrapper,
  usePerformanceMonitor,
  useComponentPreloader,
  preloadComponents
};
