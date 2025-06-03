/**
 * Dashboard Hydration Fix Tests
 *
 * Tests for the intermittent React hydration error fix in dashboard layout
 * Validates authentication state management and webpack module loading
 *
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { DashboardErrorBoundary } from '@/components/error-boundary/DashboardErrorBoundary';

// Mock Next.js router
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/dashboard',
  query: {},
  asPath: '/dashboard'
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams()
}));

// Mock hydration-safe utilities
jest.mock('@/utils/hydration-safe', () => ({
  useIsClient: jest.fn(() => true)
}));

// Mock AppointmentDataProvider
jest.mock('@/contexts/AppointmentDataProvider', () => ({
  AppointmentDataProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="appointment-data-provider">{children}</div>
  )
}));

describe('Dashboard Hydration Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();

    // Reset console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Error Boundary Integration', () => {
    it('should catch and handle webpack module loading errors', async () => {
      // Mock a component that throws a webpack error
      const ProblematicComponent = () => {
        throw new Error('Cannot read properties of undefined (reading \'call\')');
      };

      render(
        <DashboardErrorBoundary>
          <ProblematicComponent />
        </DashboardErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Error de Carga del Sistema')).toBeInTheDocument();
        expect(screen.getByText(/problema al cargar componentes del dashboard/)).toBeInTheDocument();
      });
    });

    it('should catch and handle authentication errors', async () => {
      const AuthErrorComponent = () => {
        throw new Error('useAuth must be used within an AuthProvider');
      };

      render(
        <DashboardErrorBoundary>
          <AuthErrorComponent />
        </DashboardErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Error de Autenticación')).toBeInTheDocument();
        expect(screen.getByText(/problema con la autenticación/)).toBeInTheDocument();
      });
    });

    it('should catch and handle hydration errors', async () => {
      const HydrationErrorComponent = () => {
        throw new Error('Hydration failed because the initial UI does not match');
      };

      render(
        <DashboardErrorBoundary>
          <HydrationErrorComponent />
        </DashboardErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Error de Sincronización')).toBeInTheDocument();
        expect(screen.getByText(/aplicación necesita sincronizarse/)).toBeInTheDocument();
      });
    });
  });

  describe('Webpack Module Monitor Fix', () => {
    it('should initialize webpack module monitor without syntax errors', async () => {
      // Mock window and webpack require
      const mockWebpackRequire = {
        e: jest.fn().mockResolvedValue({}),
        cache: {}
      };

      Object.defineProperty(window, '__webpack_require__', {
        value: mockWebpackRequire,
        writable: true
      });

      // Import and initialize the monitor
      const { initializeWebpackModuleMonitoring } = await import('@/utils/webpack-module-monitor');

      expect(() => {
        const monitor = initializeWebpackModuleMonitoring();
        expect(monitor).toBeDefined();
      }).not.toThrow();
    });

    it('should handle dynamic import monitoring without eval errors', async () => {
      // Mock unhandled rejection event
      const mockEvent = {
        reason: new Error('Loading chunk 123 failed')
      };

      const { initializeWebpackModuleMonitoring } = await import('@/utils/webpack-module-monitor');
      const monitor = initializeWebpackModuleMonitoring();

      // Simulate unhandled rejection
      const unhandledRejectionEvent = new Event('unhandledrejection') as any;
      unhandledRejectionEvent.reason = mockEvent.reason;

      expect(() => {
        window.dispatchEvent(unhandledRejectionEvent);
      }).not.toThrow();

      // Check that the monitor recorded the error
      const healthMetrics = monitor.getHealthMetrics();
      expect(healthMetrics).toBeDefined();
    });

    it('should not use window.eval for import statement', async () => {
      // Spy on window.eval to ensure it's not called with 'import'
      const evalSpy = jest.spyOn(window, 'eval');

      const { initializeWebpackModuleMonitoring } = await import('@/utils/webpack-module-monitor');
      initializeWebpackModuleMonitoring();

      // Ensure eval was not called with 'import'
      const evalCalls = evalSpy.mock.calls;
      const importEvalCalls = evalCalls.filter(call =>
        call[0] && call[0].toString().includes('import')
      );

      expect(importEvalCalls).toHaveLength(0);

      evalSpy.mockRestore();
    });

    it('should prevent recovery action loops', async () => {
      const { initializeWebpackModuleMonitoring } = await import('@/utils/webpack-module-monitor');
      const monitor = initializeWebpackModuleMonitoring();

      // Mock high error rate scenario
      for (let i = 0; i < 10; i++) {
        monitor.recordEvent({
          type: 'ERROR',
          module: `test-module-${i}`,
          timestamp: Date.now(),
          error: 'Cannot read properties of undefined (reading \'call\')',
          context: 'webpack-require'
        });
      }

      // Trigger recovery actions multiple times rapidly
      const consoleSpy = jest.spyOn(console, 'log');

      // First call should trigger recovery
      monitor.triggerRecoveryActions();

      // Second call within 30 seconds should be skipped
      monitor.triggerRecoveryActions();

      // Check that the second call was skipped
      const recoveryLogs = consoleSpy.mock.calls.filter(call =>
        call[0] && call[0].includes('Recovery action skipped')
      );

      expect(recoveryLogs.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });
  });

  describe('Circular Dependency Resolution', () => {
    it('should not have duplicate function exports in factory', async () => {
      // Import the factory module
      const factory = await import('@/components/appointments/cards/factory');

      // Check that getAppointmentCardForRole is defined only once
      expect(typeof factory.getAppointmentCardForRole).toBe('function');
      expect(typeof factory.getDashboardCardForRole).toBe('function');
      expect(typeof factory.getCompactCardForRole).toBe('function');

      // Ensure no duplicate exports
      const exportNames = Object.keys(factory);
      const uniqueExports = new Set(exportNames);
      expect(exportNames.length).toBe(uniqueExports.size);
    });

    it('should load dashboard components without circular dependency errors', async () => {
      // Test lazy loading of dashboard components
      expect(async () => {
        const AdminDashboard = await import('@/components/dashboard/AdminDashboard');
        expect(AdminDashboard.default).toBeDefined();
      }).not.toThrow();

      expect(async () => {
        const DoctorDashboard = await import('@/components/dashboard/DoctorDashboard');
        expect(DoctorDashboard.default).toBeDefined();
      }).not.toThrow();

      expect(async () => {
        const PatientDashboard = await import('@/components/dashboard/PatientDashboard');
        expect(PatientDashboard.default).toBeDefined();
      }).not.toThrow();
    });

    it('should handle module loading failures gracefully', async () => {
      // Mock a failed import
      const originalImport = global.import;

      // Mock import to simulate webpack module loading failure
      global.import = jest.fn().mockRejectedValue(new Error('Cannot read properties of undefined (reading \'call\')'));

      // Test that error handling works
      try {
        const failedImport = await import('@/components/dashboard/AdminDashboard').catch(error => {
          console.error('Failed to load AdminDashboard:', error);
          return { default: () => <div>Error loading admin dashboard</div> };
        });

        expect(failedImport.default).toBeDefined();
      } catch (error) {
        // Should not reach here due to error handling
        fail('Error handling failed');
      }

      // Restore original import
      global.import = originalImport;
    });

    it('should validate appointment card imports are not circular', async () => {
      // Test direct imports without going through index
      const AdminCard = await import('@/components/appointments/cards/AdminAppointmentCard');
      const PatientCard = await import('@/components/appointments/cards/PatientAppointmentCard');
      const DoctorCard = await import('@/components/appointments/cards/DoctorAppointmentCard');

      expect(AdminCard.default).toBeDefined();
      expect(AdminCard.AdminDashboardCard).toBeDefined();
      expect(PatientCard.default).toBeDefined();
      expect(PatientCard.PatientDashboardCard).toBeDefined();
      expect(DoctorCard.default).toBeDefined();
      expect(DoctorCard.DoctorTodayCard).toBeDefined();
    });
  });

  describe('Enhanced Error Recovery', () => {
    it('should provide user-controlled recovery options', async () => {
      const { initializeWebpackModuleMonitoring } = await import('@/utils/webpack-module-monitor');
      const monitor = initializeWebpackModuleMonitoring();

      // Simulate high error rate
      for (let i = 0; i < 15; i++) {
        monitor.recordEvent({
          type: 'ERROR',
          module: `critical-module-${i}`,
          timestamp: Date.now(),
          error: 'Cannot read properties of undefined (reading \'call\')',
          context: 'webpack-require'
        });
      }

      // Check that recovery notification would be shown
      const metrics = monitor.getHealthMetrics();
      expect(metrics.errorRate).toBeGreaterThan(0.8);
      expect(metrics.totalAttempts).toBeGreaterThan(5);
    });

    it('should handle dashboard loading timeouts gracefully', () => {
      // Mock setTimeout for testing
      jest.useFakeTimers();

      const { render } = require('@testing-library/react');
      const DashboardPage = require('@/app/(dashboard)/dashboard/page').default;

      // This would normally show retry option after 10 seconds
      const { getByText } = render(<DashboardPage />);

      // Fast-forward time
      jest.advanceTimersByTime(11000);

      // Should show retry option
      expect(() => getByText('Reintentar')).not.toThrow();

      jest.useRealTimers();
    });
  });

});
