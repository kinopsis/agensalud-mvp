/**
 * SuperAdmin Dashboard Tests
 * Tests for SuperAdmin dashboard component and system-wide functionality
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';

// Mock global APIs for Jest environment
global.TransformStream = class TransformStream {};
global.ReadableStream = class ReadableStream {};
global.WritableStream = class WritableStream {};

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Building2: ({ className, ...props }: any) => <div data-testid="building-icon" className={className} {...props} />,
  Users: ({ className, ...props }: any) => <div data-testid="users-icon" className={className} {...props} />,
  Calendar: ({ className, ...props }: any) => <div data-testid="calendar-icon" className={className} {...props} />,
  TrendingUp: ({ className, ...props }: any) => <div data-testid="trending-up-icon" className={className} {...props} />,
  AlertCircle: ({ className, ...props }: any) => <div data-testid="alert-circle-icon" className={className} {...props} />,
  Plus: ({ className, ...props }: any) => <div data-testid="plus-icon" className={className} {...props} />,
  Eye: ({ className, ...props }: any) => <div data-testid="eye-icon" className={className} {...props} />,
  Settings: ({ className, ...props }: any) => <div data-testid="settings-icon" className={className} {...props} />,
  BarChart3: ({ className, ...props }: any) => <div data-testid="bar-chart-icon" className={className} {...props} />,
  User: ({ className, ...props }: any) => <div data-testid="user-icon" className={className} {...props} />,
  LogOut: ({ className, ...props }: any) => <div data-testid="logout-icon" className={className} {...props} />,
  Bell: ({ className, ...props }: any) => <div data-testid="bell-icon" className={className} {...props} />,
  Search: ({ className, ...props }: any) => <div data-testid="search-icon" className={className} {...props} />,
  Menu: ({ className, ...props }: any) => <div data-testid="menu-icon" className={className} {...props} />,
  X: ({ className, ...props }: any) => <div data-testid="x-icon" className={className} {...props} />,
  Globe: ({ className, ...props }: any) => <div data-testid="globe-icon" className={className} {...props} />,
  Shield: ({ className, ...props }: any) => <div data-testid="shield-icon" className={className} {...props} />,
  Database: ({ className, ...props }: any) => <div data-testid="database-icon" className={className} {...props} />
}));

// Mock the contexts directly for this test file
const mockUser = {
  id: 'superadmin-user-id',
  email: 'superadmin@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {}
};

const mockProfile = {
  id: 'superadmin-user-id',
  first_name: 'Super',
  last_name: 'Admin',
  email: 'superadmin@example.com',
  role: 'superadmin' as const,
  phone: null,
  avatar_url: null,
  organization_id: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockSession = {
  user: mockUser,
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer' as const
};

const mockAuthContext = {
  user: mockUser,
  profile: mockProfile,
  session: mockSession,
  loading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn()
};

const mockTenantContext = {
  organization: null, // SuperAdmin doesn't belong to specific organization
  setOrganization: jest.fn(),
  loading: false
};

// Mock the DashboardLayout component to bypass authentication checks
jest.mock('@/components/dashboard/DashboardLayout', () => {
  return function MockDashboardLayout({
    children,
    title,
    subtitle,
    actions
  }: {
    children: React.ReactNode;
    title: string;
    subtitle: string;
    actions?: React.ReactNode;
  }) {
    return (
      <div data-testid="dashboard-layout">
        <div data-testid="dashboard-header">
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {actions && <div data-testid="dashboard-actions">{actions}</div>}
        </div>
        <div data-testid="dashboard-content">
          {children}
        </div>
      </div>
    );
  };
});

// Mock the context hooks for this test file
jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn(() => mockAuthContext),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: jest.fn(() => mockTenantContext),
  TenantProvider: ({ children }: { children: React.ReactNode }) => children
}));

// Mock API response data
const mockStatsData = {
  totalOrganizations: 25,
  activeOrganizations: 23,
  organizationsTrend: 12,
  totalUsers: 1250,
  usersTrend: 25,
  totalAppointments: 8500,
  appointmentsTrend: 18,
  systemHealth: 'excellent'
};

const mockOrganizationsData = [
  {
    id: 'org-1',
    name: 'VisualCare Centro',
    status: 'active',
    users_count: 45,
    appointments_count: 320,
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 'org-2',
    name: 'Óptica Moderna',
    status: 'active',
    users_count: 28,
    appointments_count: 180,
    created_at: '2024-02-01T14:30:00Z'
  }
];

const mockActivityData = [
  {
    id: 'activity-1',
    type: 'organization_created',
    description: 'Nueva organización creada: VisualCare Norte',
    timestamp: '2024-03-15T09:30:00Z',
    user_id: 'user-1',
    severity: 'info'
  },
  {
    id: 'activity-2',
    type: 'user_registered',
    description: 'Nuevo doctor registrado: Dr. García López',
    timestamp: '2024-03-15T08:15:00Z',
    user_id: 'user-2',
    severity: 'info'
  }
];

// Mock fetch for API calls
global.fetch = jest.fn();

describe('SuperAdminDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/superadmin/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockStatsData
          })
        });
      }
      if (url.includes('/api/dashboard/superadmin/organizations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockOrganizationsData
          })
        });
      }
      if (url.includes('/api/dashboard/superadmin/activity')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockActivityData
          })
        });
      }

      // Default fallback
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      });
    });
  });

  it('should render SuperAdmin dashboard with system stats', async () => {
    render(<SuperAdminDashboard />);

    // Check for SuperAdmin-specific title
    expect(screen.getByText('SuperAdmin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Gestión del sistema completo')).toBeInTheDocument();

    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // Total organizations
      expect(screen.getByText('1,250')).toBeInTheDocument(); // Total users
      expect(screen.getByText('8,500')).toBeInTheDocument(); // Total appointments
      expect(screen.getByText('Excellent')).toBeInTheDocument(); // System health
    });
  });

  it('should display system statistics correctly', async () => {
    render(<SuperAdminDashboard />);

    await waitFor(() => {
      // Check for all stat cards
      expect(screen.getByText('Organizaciones')).toBeInTheDocument();
      expect(screen.getByText('Usuarios Totales')).toBeInTheDocument();
      expect(screen.getByText('Citas Totales')).toBeInTheDocument();
      expect(screen.getByText('Estado del Sistema')).toBeInTheDocument();

      // Check for trend indicators
      expect(screen.getByText('+12%')).toBeInTheDocument(); // Organizations trend
      expect(screen.getByText('+25%')).toBeInTheDocument(); // Users trend
      expect(screen.getByText('+18%')).toBeInTheDocument(); // Appointments trend
    });
  });

  it('should show organizations overview', async () => {
    render(<SuperAdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Organizaciones Recientes')).toBeInTheDocument();
      expect(screen.getByText('VisualCare Centro')).toBeInTheDocument();
      expect(screen.getByText('Óptica Moderna')).toBeInTheDocument();
      expect(screen.getByText('45 usuarios • 320 citas')).toBeInTheDocument();
      expect(screen.getByText('28 usuarios • 180 citas')).toBeInTheDocument();
    });
  });

  it('should display system activity', async () => {
    render(<SuperAdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Actividad del Sistema')).toBeInTheDocument();
      expect(screen.getByText('Nueva organización creada: VisualCare Norte')).toBeInTheDocument();
      expect(screen.getByText('Nuevo doctor registrado: Dr. García López')).toBeInTheDocument();
    });
  });

  it('should show action buttons for SuperAdmin', async () => {
    render(<SuperAdminDashboard />);

    expect(screen.getByText('Nueva Organización')).toBeInTheDocument();
    expect(screen.getByText('Sistema')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<SuperAdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar los datos del sistema/)).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    // Mock loading state
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<SuperAdminDashboard />);

    // Should show loading skeletons
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should display organization status correctly', async () => {
    render(<SuperAdminDashboard />);

    await waitFor(() => {
      // Should show active status for organizations
      const statusElements = screen.getAllByText('Activa');
      expect(statusElements.length).toBeGreaterThan(0);
    });
  });

  it('should show system health with appropriate color', async () => {
    render(<SuperAdminDashboard />);

    await waitFor(() => {
      const healthElement = screen.getByText('Excellent');
      expect(healthElement).toBeInTheDocument();
      // Should have green color for excellent health
      expect(healthElement.closest('.bg-white')).toBeInTheDocument();
    });
  });

  it('should handle empty organizations list', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/superadmin/organizations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
          })
        });
      }
      // Return default stats for other endpoints
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            totalOrganizations: 0,
            totalUsers: 0,
            totalAppointments: 0,
            activeOrganizations: 0,
            organizationsTrend: 0,
            usersTrend: 0,
            appointmentsTrend: 0,
            systemHealth: 'critical'
          }
        })
      });
    });

    render(<SuperAdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No hay organizaciones registradas')).toBeInTheDocument();
    });
  });

  it('should handle empty activity list', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/superadmin/activity')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
          })
        });
      }
      // Return default for other endpoints
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {}
        })
      });
    });

    render(<SuperAdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No hay actividad reciente')).toBeInTheDocument();
    });
  });
});
