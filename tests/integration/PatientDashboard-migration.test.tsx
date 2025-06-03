/**
 * PatientDashboard Migration Integration Tests
 * 
 * Tests to verify that the PatientDashboard migration to PatientDashboardCard
 * maintains all existing functionality while adding new features
 * 
 * @version 1.0.0 - Fase 1B Integration Tests
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PatientDashboard from '@/components/dashboard/PatientDashboard';

// Mock the contexts and dependencies
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    profile: {
      id: 'patient-1',
      first_name: 'Juan',
      last_name: 'Pérez'
    }
  })
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: () => ({
    organization: {
      id: 'org-1',
      name: 'Test Clinic'
    }
  })
}));

jest.mock('@/components/ui/NotificationSystem', () => ({
  useNotificationHelpers: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showNetworkError: jest.fn(),
    showAppointmentSuccess: jest.fn()
  })
}));

jest.mock('@/components/ai/ChatBotLazy', () => {
  return function MockChatBotLazy() {
    return <div data-testid="chatbot">ChatBot Component</div>;
  };
});

// Mock DashboardLayout to avoid complex dependencies
jest.mock('@/components/dashboard/DashboardLayout', () => {
  return function MockDashboardLayout({ children, title }: any) {
    return (
      <div data-testid="dashboard-layout">
        <h1>{title}</h1>
        {children}
      </div>
    );
  };
});

// Mock StatsCard components
jest.mock('@/components/dashboard/StatsCard', () => ({
  __esModule: true,
  default: function MockStatsCard({ title, value }: any) {
    return <div data-testid="stats-card">{title}: {value}</div>;
  },
  StatsGrid: function MockStatsGrid({ children }: any) {
    return <div data-testid="stats-grid">{children}</div>;
  },
  StatsCardSkeleton: function MockStatsCardSkeleton() {
    return <div data-testid="stats-skeleton">Loading...</div>;
  }
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockUpcomingAppointments = [
  {
    id: 'apt-1',
    doctor_name: 'Dr. Ana García',
    service_name: 'Consulta General',
    appointment_date: '2025-01-30',
    start_time: '10:30:00',
    end_time: '11:00:00',
    status: 'confirmed',
    location_name: 'Consultorio 1'
  },
  {
    id: 'apt-2',
    doctor_name: 'Dr. Carlos López',
    service_name: 'Cardiología',
    appointment_date: '2025-02-01',
    start_time: '14:00:00',
    end_time: '14:30:00',
    status: 'pending',
    location_name: 'Consultorio 2'
  }
];

const mockRecentAppointments = [
  {
    id: 'apt-3',
    doctor_name: 'Dr. María Rodríguez',
    service_name: 'Medicina General',
    appointment_date: '2025-01-20',
    start_time: '09:00:00',
    end_time: '09:30:00',
    status: 'completed',
    notes: 'Consulta de rutina completada'
  }
];

describe('PatientDashboard Migration Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/patient/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              upcomingAppointments: 2,
              totalAppointments: 5,
              nextAppointment: {
                doctor_name: 'Dr. Ana García',
                service_name: 'Consulta General',
                appointment_date: '2025-01-30',
                start_time: '10:30:00'
              }
            }
          })
        });
      }
      
      if (url.includes('status=upcoming')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: mockUpcomingAppointments
          })
        });
      }
      
      if (url.includes('status=completed')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: mockRecentAppointments
          })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });
    });
  });

  describe('Basic Functionality', () => {
    it('renders dashboard with patient name', async () => {
      render(<PatientDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Bienvenido, Juan')).toBeInTheDocument();
      });
    });

    it('displays statistics cards', async () => {
      render(<PatientDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Próximas Citas')).toBeInTheDocument();
        expect(screen.getByText('Historial Médico')).toBeInTheDocument();
      });
    });

    it('shows next appointment alert', async () => {
      render(<PatientDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Tu Próxima Cita')).toBeInTheDocument();
        expect(screen.getByText('Dr. Ana García • Consulta General')).toBeInTheDocument();
      });
    });
  });

  describe('Enhanced Appointment Cards', () => {
    it('renders upcoming appointments with PatientDashboardCard', async () => {
      render(<PatientDashboard />);
      
      await waitFor(() => {
        // Should show appointment cards with enhanced features
        expect(screen.getByText('Dr. Ana García')).toBeInTheDocument();
        expect(screen.getByText('Consulta General')).toBeInTheDocument();
        expect(screen.getByText('Dr. Carlos López')).toBeInTheDocument();
        expect(screen.getByText('Cardiología')).toBeInTheDocument();
      });
    });

    it('shows action buttons for confirmed appointments', async () => {
      render(<PatientDashboard />);
      
      await waitFor(() => {
        // Should show reschedule and cancel buttons for confirmed appointments
        const rescheduleButtons = screen.getAllByTitle('Reagendar cita');
        const cancelButtons = screen.getAllByTitle('Cancelar cita');
        
        expect(rescheduleButtons.length).toBeGreaterThan(0);
        expect(cancelButtons.length).toBeGreaterThan(0);
      });
    });

    it('renders historical appointments with compact view', async () => {
      render(<PatientDashboard />);
      
      await waitFor(() => {
        // Should show historical appointments
        expect(screen.getByText('Dr. María Rodríguez')).toBeInTheDocument();
        expect(screen.getByText('Medicina General')).toBeInTheDocument();
      });
    });
  });

  describe('Enhanced Actions', () => {
    it('handles reschedule action', async () => {
      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(<PatientDashboard />);
      
      await waitFor(() => {
        const rescheduleButton = screen.getAllByTitle('Reagendar cita')[0];
        fireEvent.click(rescheduleButton);
        
        expect(window.location.href).toContain('/reschedule');
      });
    });

    it('handles cancel action with confirmation', async () => {
      // Mock window.confirm
      window.confirm = jest.fn(() => true);

      render(<PatientDashboard />);
      
      await waitFor(() => {
        const cancelButton = screen.getAllByTitle('Cancelar cita')[0];
        fireEvent.click(cancelButton);
        
        expect(window.confirm).toHaveBeenCalledWith(
          '¿Estás seguro de que deseas cancelar esta cita?'
        );
      });
    });

    it('handles view details action', async () => {
      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(<PatientDashboard />);
      
      await waitFor(() => {
        const viewDetailsButtons = screen.getAllByTitle('Ver detalles');
        if (viewDetailsButtons.length > 0) {
          fireEvent.click(viewDetailsButtons[0]);
          expect(window.location.href).toContain('/appointments/');
        }
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('maintains existing AI booking functionality', async () => {
      render(<PatientDashboard />);
      
      await waitFor(() => {
        const aiButton = screen.getByText('Agendar con IA');
        expect(aiButton).toBeInTheDocument();
        
        fireEvent.click(aiButton);
        // ChatBot should be shown (mocked)
      });
    });

    it('maintains existing manual booking functionality', async () => {
      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(<PatientDashboard />);
      
      await waitFor(() => {
        const manualButton = screen.getByText('Agendar Manual');
        fireEvent.click(manualButton);
        
        expect(window.location.href).toBe('/appointments/book');
      });
    });

    it('maintains existing navigation to appointments page', async () => {
      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(<PatientDashboard />);
      
      await waitFor(() => {
        const viewAllButton = screen.getByText('Ver todas');
        fireEvent.click(viewAllButton);
        
        expect(window.location.href).toBe('/appointments');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<PatientDashboard />);
      
      await waitFor(() => {
        // Should show error state but not crash
        expect(screen.getByText('Bienvenido, Juan')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading skeletons while fetching data', () => {
      // Mock slow API response
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<PatientDashboard />);
      
      // Should show loading skeletons
      expect(screen.getAllByText('Cargando...')).toBeTruthy();
    });
  });
});

describe('Migration Validation', () => {
  it('uses PatientDashboardCard components', async () => {
    render(<PatientDashboard />);
    
    await waitFor(() => {
      // Verify that the new components are being used by checking for enhanced features
      const appointmentCards = screen.getAllByRole('button', { name: /reagendar|cancelar/i });
      expect(appointmentCards.length).toBeGreaterThan(0);
    });
  });

  it('maintains performance with new components', async () => {
    const startTime = performance.now();
    
    render(<PatientDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Bienvenido, Juan')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render in less than 2 seconds (2000ms)
    expect(renderTime).toBeLessThan(2000);
  });
});
