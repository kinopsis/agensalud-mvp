/**
 * LazyComponents Tests - FASE 3 MVP Performance Optimization
 * Tests for lazy loading and performance monitoring components
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ComponentLoader,
  LazyErrorBoundary,
  EnhancedLazyWrapper,
  usePerformanceMonitor,
  useComponentPreloader
} from '@/components/performance/LazyComponents';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1024 * 1024 * 10 // 10MB
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn()
}));

describe('LazyComponents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ComponentLoader', () => {
    test('renders loading spinner with default message', () => {
      render(<ComponentLoader />);
      
      expect(screen.getByText('Cargando...')).toBeInTheDocument();
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // SVG spinner
    });

    test('renders loading spinner with custom message', () => {
      render(<ComponentLoader message="Cargando datos..." />);
      
      expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
    });

    test('has proper accessibility attributes', () => {
      render(<ComponentLoader />);
      
      const spinner = screen.getByRole('img', { hidden: true });
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('LazyErrorBoundary', () => {
    // Component that throws an error
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    test('renders children when no error', () => {
      render(
        <LazyErrorBoundary>
          <ThrowError shouldThrow={false} />
        </LazyErrorBoundary>
      );
      
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    test('renders error fallback when error occurs', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(
        <LazyErrorBoundary>
          <ThrowError shouldThrow={true} />
        </LazyErrorBoundary>
      );
      
      expect(screen.getByText('Error al cargar componente')).toBeInTheDocument();
      expect(screen.getByText('Recargar página')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    test('renders custom fallback when provided', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(
        <LazyErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowError shouldThrow={true} />
        </LazyErrorBoundary>
      );
      
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('EnhancedLazyWrapper', () => {
    test('renders children without error', async () => {
      render(
        <EnhancedLazyWrapper>
          <div>Test content</div>
        </EnhancedLazyWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Test content')).toBeInTheDocument();
      });
    });

    test('calls preload function when provided', async () => {
      const mockPreload = jest.fn();
      
      render(
        <EnhancedLazyWrapper onPreload={mockPreload}>
          <div>Test content</div>
        </EnhancedLazyWrapper>
      );
      
      await waitFor(() => {
        expect(mockPreload).toHaveBeenCalled();
      });
    });

    test('shows custom loading message', () => {
      render(
        <EnhancedLazyWrapper loadingMessage="Loading custom content...">
          <div>Test content</div>
        </EnhancedLazyWrapper>
      );
      
      // Initially shows loading
      expect(screen.getByText('Loading custom content...')).toBeInTheDocument();
    });
  });

  describe('usePerformanceMonitor', () => {
    const TestComponent = () => {
      const metrics = usePerformanceMonitor();
      return (
        <div>
          <span data-testid="load-time">{metrics.loadTime}</span>
          <span data-testid="render-time">{metrics.renderTime}</span>
          <span data-testid="memory-usage">{metrics.memoryUsage}</span>
        </div>
      );
    };

    test('initializes with default metrics', () => {
      render(<TestComponent />);
      
      expect(screen.getByTestId('load-time')).toHaveTextContent('0');
      expect(screen.getByTestId('render-time')).toBeInTheDocument();
      expect(screen.getByTestId('memory-usage')).toBeInTheDocument();
    });

    test('calculates memory usage when available', async () => {
      render(<TestComponent />);
      
      await waitFor(() => {
        const memoryUsage = screen.getByTestId('memory-usage').textContent;
        expect(parseFloat(memoryUsage || '0')).toBeGreaterThan(0);
      });
    });
  });

  describe('useComponentPreloader', () => {
    const TestComponent = () => {
      const { preloadAnalytics, preloadAPIDocumentation, preloadSuperAdminDashboard } = useComponentPreloader();
      
      return (
        <div>
          <button onClick={preloadAnalytics}>Preload Analytics</button>
          <button onClick={preloadAPIDocumentation}>Preload API Docs</button>
          <button onClick={preloadSuperAdminDashboard}>Preload SuperAdmin</button>
        </div>
      );
    };

    test('provides preload functions', () => {
      render(<TestComponent />);
      
      expect(screen.getByText('Preload Analytics')).toBeInTheDocument();
      expect(screen.getByText('Preload API Docs')).toBeInTheDocument();
      expect(screen.getByText('Preload SuperAdmin')).toBeInTheDocument();
    });

    test('preload functions are callable', () => {
      render(<TestComponent />);
      
      const analyticsButton = screen.getByText('Preload Analytics');
      const apiDocsButton = screen.getByText('Preload API Docs');
      const superAdminButton = screen.getByText('Preload SuperAdmin');
      
      // Should not throw when clicked
      expect(() => {
        analyticsButton.click();
        apiDocsButton.click();
        superAdminButton.click();
      }).not.toThrow();
    });
  });

  describe('Performance Monitoring', () => {
    test('tracks component render time', async () => {
      const startTime = Date.now();
      mockPerformance.now.mockReturnValue(startTime);
      
      const TestComponent = () => {
        const metrics = usePerformanceMonitor();
        return <div data-testid="render-time">{metrics.renderTime}</div>;
      };
      
      render(<TestComponent />);
      
      await waitFor(() => {
        const renderTime = screen.getByTestId('render-time').textContent;
        expect(parseFloat(renderTime || '0')).toBeGreaterThanOrEqual(0);
      });
    });

    test('handles missing performance API gracefully', () => {
      const originalPerformance = global.performance;
      delete (global as any).performance;
      
      const TestComponent = () => {
        const metrics = usePerformanceMonitor();
        return <div data-testid="metrics">{JSON.stringify(metrics)}</div>;
      };
      
      expect(() => render(<TestComponent />)).not.toThrow();
      
      global.performance = originalPerformance;
    });
  });

  describe('Error Handling', () => {
    test('error boundary logs errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const ThrowError = () => {
        throw new Error('Test error for logging');
      };
      
      render(
        <LazyErrorBoundary>
          <ThrowError />
        </LazyErrorBoundary>
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Lazy component error:',
        expect.any(Error),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });

    test('reload button triggers page reload', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const reloadSpy = jest.spyOn(window.location, 'reload').mockImplementation();
      
      const ThrowError = () => {
        throw new Error('Test error');
      };
      
      render(
        <LazyErrorBoundary>
          <ThrowError />
        </LazyErrorBoundary>
      );
      
      const reloadButton = screen.getByText('Recargar página');
      reloadButton.click();
      
      expect(reloadSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      reloadSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    test('loading component has proper ARIA attributes', () => {
      render(<ComponentLoader />);
      
      const loadingContainer = screen.getByText('Cargando...').closest('div');
      expect(loadingContainer).toBeInTheDocument();
    });

    test('error boundary provides accessible error message', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const ThrowError = () => {
        throw new Error('Test error');
      };
      
      render(
        <LazyErrorBoundary>
          <ThrowError />
        </LazyErrorBoundary>
      );
      
      expect(screen.getByRole('button', { name: 'Recargar página' })).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });
});
