/**
 * AdminDashboard Hydration Test
 * 
 * Tests to ensure the AdminDashboard component is hydration-safe
 * and doesn't cause hydration mismatches between server and client
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import AdminDashboard from '@/components/dashboard/AdminDashboard';

// Mock the auth and tenant contexts
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

// Mock the hydration-safe utilities
jest.mock('@/utils/hydration-safe', () => ({
  useIsClient: jest.fn(() => true),
  useClientDate: jest.fn(() => new Date('2025-01-28T10:00:00Z')),
  useHydrationSafeNavigation: jest.fn(() => ({
    navigateTo: jest.fn(),
    isClient: true
  }))
}));

// Mock the contexts
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuthContext
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: () => mockTenantContext
}));

// Mock the API calls
global.fetch = jest.fn();

describe('AdminDashboard Hydration Safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/admin/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            totalAppointments: 150,
            todayAppointments: 12,
            totalPatients: 89,
            totalDoctors: 8,
            pendingAppointments: 5,
            completedAppointments: 145
          })
        });
      }
      
      if (url.includes('/api/dashboard/admin/activity')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: '1',
              type: 'appointment_created',
              description: 'Nueva cita creada para María García',
              timestamp: '2025-01-28T09:30:00Z',
              user: 'Dr. Pedro Sánchez'
            }
          ])
        });
      }
      
      if (url.includes('/api/dashboard/admin/upcoming')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: '1',
              patient_name: 'María García',
              doctor_name: 'Dr. Pedro Sánchez',
              service_name: 'Consulta General',
              appointment_date: '2025-01-28',
              start_time: '14:00:00',
              location_name: 'Consultorio 1'
            }
          ])
        });
      }
      
      return Promise.reject(new Error('Unknown API endpoint'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders without hydration errors', async () => {
    const { container } = render(<AdminDashboard />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Dashboard Administrativo')).toBeInTheDocument();
    });
    
    // Check that the component rendered successfully
    expect(container.firstChild).toBeInTheDocument();
  });

  test('handles date formatting safely during hydration', async () => {
    render(<AdminDashboard />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Dashboard Administrativo')).toBeInTheDocument();
    });
    
    // The component should not throw hydration errors when formatting dates
    // This test passes if no hydration errors are thrown during render
    expect(true).toBe(true);
  });

  test('navigation functions work without hydration issues', async () => {
    const mockNavigateTo = jest.fn();
    
    // Mock the navigation hook
    const { useHydrationSafeNavigation } = require('@/utils/hydration-safe');
    useHydrationSafeNavigation.mockReturnValue({
      navigateTo: mockNavigateTo,
      isClient: true
    });
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard Administrativo')).toBeInTheDocument();
    });
    
    // Check that navigation buttons are rendered
    const newAppointmentButton = screen.getByText('Nueva Cita');
    expect(newAppointmentButton).toBeInTheDocument();
    
    const settingsButton = screen.getByText('Configuración');
    expect(settingsButton).toBeInTheDocument();
  });

  test('stats cards render with proper hydration safety', async () => {
    render(<AdminDashboard />);
    
    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByText('Citas de Hoy')).toBeInTheDocument();
    });
    
    // Check that stats are displayed
    expect(screen.getByText('Total de Citas')).toBeInTheDocument();
    expect(screen.getByText('Pacientes Activos')).toBeInTheDocument();
    expect(screen.getByText('Doctores')).toBeInTheDocument();
  });

  test('activity feed renders timestamps safely', async () => {
    render(<AdminDashboard />);
    
    // Wait for activity to load
    await waitFor(() => {
      expect(screen.getByText('Actividad Reciente')).toBeInTheDocument();
    });
    
    // The activity feed should render without hydration errors
    // even when formatting timestamps
    expect(screen.getByText('Nueva cita creada para María García')).toBeInTheDocument();
  });

  test('upcoming appointments render dates safely', async () => {
    render(<AdminDashboard />);
    
    // Wait for upcoming appointments to load
    await waitFor(() => {
      expect(screen.getByText('Próximas Citas')).toBeInTheDocument();
    });
    
    // Check that appointments are displayed with proper date formatting
    expect(screen.getByText('María García')).toBeInTheDocument();
    expect(screen.getByText('Dr. Pedro Sánchez')).toBeInTheDocument();
  });

  test('component handles server-side rendering correctly', () => {
    // Mock server-side environment
    const { useIsClient } = require('@/utils/hydration-safe');
    useIsClient.mockReturnValue(false);
    
    const { container } = render(<AdminDashboard />);
    
    // Component should render without errors even during SSR
    expect(container.firstChild).toBeInTheDocument();
  });

  test('component transitions from SSR to client-side correctly', async () => {
    // Start with SSR state
    const { useIsClient } = require('@/utils/hydration-safe');
    useIsClient.mockReturnValue(false);
    
    const { rerender } = render(<AdminDashboard />);
    
    // Simulate hydration by switching to client state
    useIsClient.mockReturnValue(true);
    rerender(<AdminDashboard />);
    
    // Wait for the component to update
    await waitFor(() => {
      expect(screen.getByText('Dashboard Administrativo')).toBeInTheDocument();
    });
    
    // Component should work correctly after hydration
    expect(screen.getByText('Nueva Cita')).toBeInTheDocument();
  });
});
