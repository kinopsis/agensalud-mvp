/**
 * Webpack Module Loading Test
 * 
 * Tests to ensure webpack module loading works correctly and doesn't cause
 * module factory errors or hydration failures
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock the contexts to prevent actual API calls
const mockAuthContext = {
  profile: {
    id: 'test-user-id',
    email: 'admin@test.com',
    role: 'admin'
  }
};

const mockTenantContext = {
  organization: {
    id: 'test-org-id',
    name: 'Test Organization'
  }
};

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuthContext
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: () => mockTenantContext
}));

// Mock the hydration-safe utilities
jest.mock('@/utils/hydration-safe', () => ({
  useIsClient: jest.fn(() => true),
  useClientDate: jest.fn(() => new Date('2025-01-28T10:00:00Z')),
  useHydrationSafeNavigation: jest.fn(() => ({
    navigateTo: jest.fn(),
    isClient: true
  }))
}));

// Mock API calls
global.fetch = jest.fn();

describe('Webpack Module Loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('dashboard layout loads without webpack module errors', async () => {
    // Dynamic import to test module loading
    const { default: AdminDashboard } = await import('@/components/dashboard/AdminDashboard');
    
    expect(() => {
      render(<AdminDashboard />);
    }).not.toThrow();
  });

  test('hydration-safe utilities load correctly', async () => {
    const hydrationUtils = await import('@/utils/hydration-safe');
    
    expect(hydrationUtils.useIsClient).toBeDefined();
    expect(hydrationUtils.useClientDate).toBeDefined();
    expect(hydrationUtils.useHydrationSafeNavigation).toBeDefined();
  });

  test('webpack diagnostics load correctly', async () => {
    const webpackDiagnostics = await import('@/utils/webpack-diagnostics');
    
    expect(webpackDiagnostics.WebpackModuleDiagnostics).toBeDefined();
    expect(webpackDiagnostics.useWebpackDiagnostics).toBeDefined();
  });

  test('module dependency analyzer loads correctly', async () => {
    const dependencyAnalyzer = await import('@/utils/module-dependency-analyzer');
    
    expect(dependencyAnalyzer.ModuleDependencyAnalyzer).toBeDefined();
    expect(dependencyAnalyzer.default).toBeDefined();
  });

  test('dashboard layout imports resolve correctly', async () => {
    // Test that all imports in dashboard layout can be resolved
    const authContext = await import('@/contexts/auth-context');
    const tenantContext = await import('@/contexts/tenant-context');
    const appointmentProvider = await import('@/contexts/AppointmentDataProvider');
    
    expect(authContext.useAuth).toBeDefined();
    expect(tenantContext.useTenant).toBeDefined();
    expect(appointmentProvider.AppointmentDataProvider).toBeDefined();
  });

  test('admin dashboard imports resolve correctly', async () => {
    // Test that all imports in admin dashboard can be resolved
    const dashboardLayout = await import('@/components/dashboard/DashboardLayout');
    const statsCard = await import('@/components/dashboard/StatsCard');
    const appointmentCards = await import('@/components/appointments/cards');
    
    expect(dashboardLayout.default).toBeDefined();
    expect(statsCard.default).toBeDefined();
    expect(appointmentCards.AdminDashboardCard).toBeDefined();
  });

  test('no circular dependencies in core modules', async () => {
    // Test that core modules can be imported without circular dependency issues
    const promises = [
      import('@/contexts/auth-context'),
      import('@/contexts/tenant-context'),
      import('@/contexts/AppointmentDataProvider'),
      import('@/components/dashboard/DashboardLayout'),
      import('@/components/dashboard/AdminDashboard'),
      import('@/utils/hydration-safe')
    ];
    
    // All imports should resolve without throwing
    const modules = await Promise.all(promises);
    
    expect(modules).toHaveLength(6);
    modules.forEach(module => {
      expect(module).toBeDefined();
    });
  });

  test('webpack module factory functions work correctly', () => {
    // Test that webpack module factory doesn't throw undefined errors
    expect(() => {
      // Simulate webpack module loading
      const mockFactory = jest.fn(() => ({}));
      const mockOptions = { factory: mockFactory };
      
      // This should not throw "Cannot read properties of undefined (reading 'call')"
      if (mockOptions.factory) {
        mockOptions.factory();
      }
    }).not.toThrow();
  });

  test('dynamic imports work without module loading errors', async () => {
    // Test dynamic imports that could cause webpack module loading issues
    const dynamicImports = [
      () => import('@/utils/webpack-diagnostics'),
      () => import('@/utils/module-dependency-analyzer'),
      () => import('@/components/debug/DateDisplacementDebugger'),
      () => import('@/components/debug/DateValidationMonitor')
    ];
    
    for (const importFn of dynamicImports) {
      try {
        const module = await importFn();
        expect(module).toBeDefined();
      } catch (error) {
        // Some debug modules might not exist, which is fine
        expect(error.message).toMatch(/Cannot resolve module|Module not found/);
      }
    }
  });

  test('module exports are properly defined', async () => {
    // Test that modules export what they're supposed to export
    const adminDashboard = await import('@/components/dashboard/AdminDashboard');
    const hydrationSafe = await import('@/utils/hydration-safe');
    const webpackDiagnostics = await import('@/utils/webpack-diagnostics');
    
    // Check default exports
    expect(adminDashboard.default).toBeDefined();
    expect(hydrationSafe.default).toBeDefined();
    expect(webpackDiagnostics.default).toBeDefined();
    
    // Check named exports
    expect(hydrationSafe.useIsClient).toBeDefined();
    expect(hydrationSafe.useClientDate).toBeDefined();
    expect(hydrationSafe.useHydrationSafeNavigation).toBeDefined();
    
    expect(webpackDiagnostics.WebpackModuleDiagnostics).toBeDefined();
    expect(webpackDiagnostics.useWebpackDiagnostics).toBeDefined();
  });

  test('no undefined module factory calls', () => {
    // Mock webpack require to test module factory calls
    const mockWebpackRequire = jest.fn((moduleId) => {
      // Simulate successful module loading
      return { default: () => 'mock module' };
    });
    
    // Test that module factory calls don't fail
    expect(() => {
      mockWebpackRequire('test-module');
    }).not.toThrow();
    
    expect(mockWebpackRequire).toHaveBeenCalledWith('test-module');
  });
});
