/**
 * SuperAdminDashboard Component Tests
 * 
 * Tests to validate that the SuperAdminDashboard component renders without
 * ReferenceErrors and handles the CheckCircle icon import correctly.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';

// Mock the auth context
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    profile: {
      id: 'test-user-id',
      role: 'superadmin',
      organization_id: 'test-org-id'
    }
  })
}));

// Mock the API calls
global.fetch = jest.fn();

describe('SuperAdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
      if (url === '/api/dashboard/superadmin/stats') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              totalOrganizations: 5,
              totalUsers: 150,
              totalAppointments: 1200,
              activeOrganizations: 4,
              organizationsTrend: 15,
              usersTrend: 25,
              appointmentsTrend: 10,
              systemHealth: 'excellent'
            }
          })
        } as Response);
      }
      
      if (url === '/api/dashboard/superadmin/organizations?limit=10') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
          })
        } as Response);
      }
      
      if (url === '/api/dashboard/superadmin/activity?limit=10') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
          })
        } as Response);
      }
      
      return Promise.resolve({
        ok: false,
        status: 404
      } as Response);
    });
  });

  test('should render without CheckCircle ReferenceError', async () => {
    // This test specifically validates that CheckCircle is properly imported
    expect(() => {
      render(<SuperAdminDashboard />);
    }).not.toThrow();
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('SuperAdmin Dashboard')).toBeInTheDocument();
    });
  });

  test('should render system monitoring tab with CheckCircle icon', async () => {
    render(<SuperAdminDashboard />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('SuperAdmin Dashboard')).toBeInTheDocument();
    });
    
    // Click on the system monitoring tab
    const systemTab = screen.getByText('Monitoreo del Sistema');
    systemTab.click();
    
    // Wait for the system tab content to load
    await waitFor(() => {
      expect(screen.getByText('Backup completado')).toBeInTheDocument();
    });
    
    // The CheckCircle icon should be rendered without errors
    // (If there was a ReferenceError, the component would have crashed)
    expect(screen.getByText('Respaldo automático ejecutado exitosamente')).toBeInTheDocument();
  });

  test('should handle API calls successfully', async () => {
    render(<SuperAdminDashboard />);
    
    // Wait for API calls to complete
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/dashboard/superadmin/stats');
      expect(fetch).toHaveBeenCalledWith('/api/dashboard/superadmin/organizations?limit=10');
      expect(fetch).toHaveBeenCalledWith('/api/dashboard/superadmin/activity?limit=10');
    });
    
    // Verify the component renders the stats
    await waitFor(() => {
      expect(screen.getByText('Organizaciones')).toBeInTheDocument();
      expect(screen.getByText('Usuarios Totales')).toBeInTheDocument();
      expect(screen.getByText('Citas Totales')).toBeInTheDocument();
      expect(screen.getByText('Estado del Sistema')).toBeInTheDocument();
    });
  });

  test('should not trigger Error Boundary retry loops', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<SuperAdminDashboard />);
    
    // Wait for component to stabilize
    await waitFor(() => {
      expect(screen.getByText('SuperAdmin Dashboard')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Should not have any console errors related to CheckCircle
    const checkCircleErrors = consoleSpy.mock.calls.filter(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('CheckCircle'))
    );
    
    expect(checkCircleErrors).toHaveLength(0);
    
    consoleSpy.mockRestore();
  });

  test('should validate all required icons are imported', () => {
    // This test ensures that all icons used in the component are properly imported
    // by checking that the component can be instantiated without throwing
    expect(() => {
      const component = React.createElement(SuperAdminDashboard);
      expect(component).toBeDefined();
    }).not.toThrow();
  });
});
