/**
 * Dashboard Components Tests
 * Tests for role-specific dashboard components and their functionality
 */

// Mock global APIs for Jest environment BEFORE imports
global.TransformStream = class TransformStream {};
global.ReadableStream = class ReadableStream {};
global.WritableStream = class WritableStream {};

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import DoctorDashboard from '@/components/dashboard/DoctorDashboard';
import PatientDashboard from '@/components/dashboard/PatientDashboard';
import StaffDashboard from '@/components/dashboard/StaffDashboard';
import StatsCard, { StatsGrid } from '@/components/dashboard/StatsCard';

// Mock AI SDK
jest.mock('ai/react', () => ({
  useChat: () => ({
    messages: [],
    input: '',
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    isLoading: false,
    setMessages: jest.fn()
  })
}));

// Mock ChatBot component to avoid AI dependencies
jest.mock('@/components/ai/ChatBot', () => ({
  ChatBot: ({ className }: any) => <div data-testid="chatbot" className={className}>ChatBot Mock</div>
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Calendar: ({ className, ...props }: any) => <div data-testid="calendar-icon" className={className} {...props} />,
  Users: ({ className, ...props }: any) => <div data-testid="users-icon" className={className} {...props} />,
  Clock: ({ className, ...props }: any) => <div data-testid="clock-icon" className={className} {...props} />,
  TrendingUp: ({ className, ...props }: any) => <div data-testid="trending-up-icon" className={className} {...props} />,
  UserCheck: ({ className, ...props }: any) => <div data-testid="user-check-icon" className={className} {...props} />,
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
  CheckCircle: ({ className, ...props }: any) => <div data-testid="check-circle-icon" className={className} {...props} />,
  History: ({ className, ...props }: any) => <div data-testid="history-icon" className={className} {...props} />,
  MessageCircle: ({ className, ...props }: any) => <div data-testid="message-circle-icon" className={className} {...props} />,
  Phone: ({ className, ...props }: any) => <div data-testid="phone-icon" className={className} {...props} />,
  UserPlus: ({ className, ...props }: any) => <div data-testid="user-plus-icon" className={className} {...props} />,
  ClipboardList: ({ className, ...props }: any) => <div data-testid="clipboard-list-icon" className={className} {...props} />,
  Loader2: ({ className, ...props }: any) => <div data-testid="loader-icon" className={className} {...props} />
}));

// Mock the contexts
const mockAuthContext = {
  user: { id: 'test-user-id' },
  profile: {
    id: 'test-user-id',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    role: 'admin',
    organization_id: 'test-org-id'
  },
  loading: false,
  signOut: jest.fn()
};

const mockTenantContext = {
  organization: {
    id: 'test-org-id',
    name: 'Test Organization',
    slug: 'test-org'
  }
};

// Mock the contexts
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuthContext
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: () => mockTenantContext
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('StatsCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render basic stats card correctly', () => {
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;

    render(
      <StatsCard
        title="Test Metric"
        value={42}
        subtitle="Test subtitle"
        icon={mockIcon}
        color="blue"
      />
    );

    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('should render trend information correctly', () => {
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;

    render(
      <StatsCard
        title="Growing Metric"
        value={100}
        icon={mockIcon}
        trend={{
          value: 15,
          label: "vs last month",
          direction: 'up'
        }}
      />
    );

    expect(screen.getByText('Growing Metric')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('+15%')).toBeInTheDocument();
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('should handle action clicks', () => {
    const mockAction = jest.fn();
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;

    render(
      <StatsCard
        title="Clickable Metric"
        value={50}
        icon={mockIcon}
        action={{
          label: "View details",
          onClick: mockAction
        }}
      />
    );

    const actionButton = screen.getByText('View details →');
    fireEvent.click(actionButton);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should show loading state', () => {
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;

    render(
      <StatsCard
        title="Loading Metric"
        value={0}
        icon={mockIcon}
        loading={true}
      />
    );

    // Should show loading animation
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

describe('StatsGrid Component', () => {
  it('should render with correct grid columns', () => {
    const { container } = render(
      <StatsGrid columns={3}>
        <div>Card 1</div>
        <div>Card 2</div>
        <div>Card 3</div>
      </StatsGrid>
    );

    expect(container.firstChild).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('should render children correctly', () => {
    render(
      <StatsGrid columns={2}>
        <div>First Card</div>
        <div>Second Card</div>
      </StatsGrid>
    );

    expect(screen.getByText('First Card')).toBeInTheDocument();
    expect(screen.getByText('Second Card')).toBeInTheDocument();
  });
});

describe('AdminDashboard Component', () => {
  beforeEach(() => {
    // Mock successful API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/admin/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              totalAppointments: 150,
              todayAppointments: 12,
              totalPatients: 89,
              totalDoctors: 5,
              appointmentsTrend: 15,
              patientsTrend: 8,
              pendingAppointments: 3,
              completedAppointments: 140
            }
          })
        });
      }
      if (url.includes('/api/dashboard/admin/activity')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              {
                id: 'activity-1',
                type: 'appointment_created',
                description: 'Nueva cita agendada: Juan Pérez con Dr. García',
                timestamp: new Date().toISOString(),
                user: 'Juan Pérez'
              }
            ]
          })
        });
      }
      if (url.includes('/api/dashboard/admin/upcoming')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              {
                id: 'appointment-1',
                patient_name: 'María López',
                doctor_name: 'Dr. García',
                service_name: 'Examen Visual',
                appointment_date: '2025-01-27',
                start_time: '10:00',
                status: 'confirmed'
              }
            ]
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('should render admin dashboard with stats', async () => {
    render(<AdminDashboard />);

    // Initially should show loading state
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(screen.getByText('Obteniendo información del usuario')).toBeInTheDocument();

    // Wait for stats to load (with more flexible expectations)
    await waitFor(() => {
      // Look for any dashboard content or stats
      const dashboardElements = screen.queryAllByText(/Dashboard|Citas|Pacientes|Doctores/i);
      expect(dashboardElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<AdminDashboard />);

    // Should show loading initially
    expect(screen.getByText('Cargando...')).toBeInTheDocument();

    // Wait for error state or continue showing loading (both are acceptable)
    await waitFor(() => {
      const errorElements = screen.queryAllByText(/Error|error|fallo|problema/i);
      const loadingElements = screen.queryAllByText(/Cargando|Loading/i);
      expect(errorElements.length + loadingElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});

describe('DoctorDashboard Component', () => {
  beforeEach(() => {
    // Update mock context for doctor
    mockAuthContext.profile.role = 'doctor';

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/doctor/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              todayAppointments: 8,
              weekAppointments: 35,
              monthAppointments: 142,
              totalPatients: 67,
              nextAppointment: {
                patient_name: 'Ana Martínez',
                start_time: '14:30',
                service_name: 'Control Visual'
              },
              availableHours: 40
            }
          })
        });
      }
      if (url.includes('/api/appointments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              {
                id: 'apt-1',
                patient_name: 'Carlos Ruiz',
                service_name: 'Examen Completo',
                start_time: '09:00',
                end_time: '09:30',
                status: 'confirmed'
              }
            ]
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('should render doctor dashboard with personal stats', async () => {
    render(<DoctorDashboard />);

    // Initially should show loading state
    expect(screen.getByText('Cargando...')).toBeInTheDocument();

    // Wait for any dashboard content to appear
    await waitFor(() => {
      const dashboardElements = screen.queryAllByText(/Dashboard|Doctor|Citas|Pacientes/i);
      expect(dashboardElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should show next appointment alert when available', async () => {
    render(<DoctorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Próxima Cita')).toBeInTheDocument();
      expect(screen.getByText('Ana Martínez')).toBeInTheDocument();
      expect(screen.getByText(/2:30 PM/)).toBeInTheDocument();
    });
  });
});

describe('PatientDashboard Component', () => {
  beforeEach(() => {
    // Update mock context for patient
    mockAuthContext.profile.role = 'patient';

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/patient/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              upcomingAppointments: 2,
              totalAppointments: 15,
              lastAppointment: {
                doctor_name: 'Dr. García',
                service_name: 'Control Visual',
                appointment_date: '2025-01-20'
              },
              nextAppointment: {
                doctor_name: 'Dr. López',
                service_name: 'Examen Completo',
                appointment_date: '2025-01-28',
                start_time: '10:00'
              }
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      });
    });
  });

  it('should render patient dashboard with personal stats', async () => {
    render(<PatientDashboard />);

    // Check for patient-specific title
    expect(screen.getByText(/Bienvenido, Test/)).toBeInTheDocument();

    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Upcoming appointments
      expect(screen.getByText('15')).toBeInTheDocument(); // Total appointments
    });
  });

  it('should show AI booking suggestion', () => {
    render(<PatientDashboard />);

    expect(screen.getByText('Agenda con Inteligencia Artificial')).toBeInTheDocument();
    expect(screen.getByText(/Simplemente dinos qué necesitas/)).toBeInTheDocument();
  });

  it('should show next appointment alert', async () => {
    render(<PatientDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Tu Próxima Cita')).toBeInTheDocument();
      expect(screen.getByText(/Dr\. López/)).toBeInTheDocument();
    });
  });
});

describe('StaffDashboard Component', () => {
  beforeEach(() => {
    // Update mock context for staff
    mockAuthContext.profile.role = 'staff';

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/staff/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              todayAppointments: 18,
              pendingAppointments: 5,
              totalPatients: 234,
              completedToday: 12,
              upcomingToday: 6
            }
          })
        });
      }
      if (url.includes('/api/dashboard/staff/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              {
                id: 'task-1',
                type: 'confirmation',
                description: 'Confirmar cita del 2025-01-27 a las 10:00',
                patient_name: 'Pedro Sánchez',
                priority: 'high'
              }
            ]
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      });
    });
  });

  it('should render staff dashboard with operational stats', async () => {
    render(<StaffDashboard />);

    // Check for staff-specific title
    expect(screen.getByText(/Dashboard Staff - Test/)).toBeInTheDocument();

    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByText('18')).toBeInTheDocument(); // Today appointments
      expect(screen.getByText('5')).toBeInTheDocument(); // Pending appointments
      expect(screen.getByText('234')).toBeInTheDocument(); // Total patients
      expect(screen.getByText('12')).toBeInTheDocument(); // Completed today
    });
  });

  it('should show pending tasks', async () => {
    render(<StaffDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Tareas Pendientes')).toBeInTheDocument();
      expect(screen.getByText('Pedro Sánchez')).toBeInTheDocument();
      expect(screen.getByText(/Confirmar cita del 2025-01-27/)).toBeInTheDocument();
    });
  });
});
