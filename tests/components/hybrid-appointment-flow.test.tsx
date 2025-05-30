/**
 * Tests for the Hybrid Appointment Flow
 * Ensures both Express and Personalized flows work correctly
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import UnifiedAppointmentFlow from '@/components/appointments/UnifiedAppointmentFlow';

// Mock the OptimalAppointmentFinder
jest.mock('@/lib/appointments/OptimalAppointmentFinder', () => ({
  OptimalAppointmentFinder: jest.fn().mockImplementation(() => ({
    findOptimalAppointment: jest.fn().mockResolvedValue({
      appointment: {
        doctorId: 'doctor-1',
        doctorName: 'Dr. Ana Rodríguez',
        specialization: 'Optometría Clínica',
        locationId: 'location-1',
        locationName: 'Sede Centro',
        locationAddress: 'Calle 123 #45-67',
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '10:30',
        consultationFee: 60
      },
      score: 0.85,
      reasoning: {
        timeProximity: 0.9,
        locationDistance: 0.8,
        doctorAvailability: 0.8,
        serviceCompatibility: 0.9,
        explanation: 'Seleccionado por: Cita disponible muy pronto, Ubicación conveniente'
      }
    })
  }))
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockProps = {
  organizationId: 'test-org-id',
  userId: 'test-user-id',
  mode: 'manual' as const,
  onAppointmentBooked: jest.fn(),
  onCancel: jest.fn()
};

describe('Hybrid Appointment Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/services')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            services: [
              {
                id: 'service-1',
                name: 'Consulta General',
                description: 'Consulta médica general',
                price: 50
              }
            ]
          })
        });
      }

      if (url.includes('/api/doctors')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            doctors: [
              {
                id: 'doctor-1',
                profiles: {
                  first_name: 'Ana',
                  last_name: 'Rodríguez'
                },
                specialization: 'Optometría Clínica',
                consultation_fee: 60
              }
            ]
          })
        });
      }

      if (url.includes('/api/appointments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            appointmentId: 'new-appointment-id'
          })
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render service selection as first step', async () => {
    render(<UnifiedAppointmentFlow {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('¿Qué tipo de consulta necesitas?')).toBeInTheDocument();
    });
  });

  it('should show flow selection after service selection', async () => {
    render(<UnifiedAppointmentFlow {...mockProps} />);

    // Wait for services to load and select one
    await waitFor(() => {
      expect(screen.getByText('Consulta General')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Consulta General'));

    // Should show flow selection
    await waitFor(() => {
      expect(screen.getByText('¿Cómo prefieres agendar tu cita?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reserva Express' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Personalizar Reserva' })).toBeInTheDocument();
    });
  });

  it('should handle express booking flow with loading state', async () => {
    render(<UnifiedAppointmentFlow {...mockProps} />);

    // Select service
    await waitFor(() => {
      expect(screen.getByText('Consulta General')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Consulta General'));

    // Select express flow
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reserva Express' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reserva Express' }));

    // Should show searching state first
    await waitFor(() => {
      expect(screen.getByText('Buscando tu cita perfecta')).toBeInTheDocument();
      expect(screen.getByText('Analizando disponibilidad')).toBeInTheDocument();
    });

    // Should eventually show express confirmation
    await waitFor(() => {
      expect(screen.getByText('¡Encontramos tu cita perfecta!')).toBeInTheDocument();
      expect(screen.getByText('Dr. Ana Rodríguez')).toBeInTheDocument();
      expect(screen.getByText('Confirmar Cita Express')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('should handle personalized booking flow', async () => {
    render(<UnifiedAppointmentFlow {...mockProps} />);

    // Select service
    await waitFor(() => {
      expect(screen.getByText('Consulta General')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Consulta General'));

    // Select personalized flow
    await waitFor(() => {
      expect(screen.getByText('Reserva Personalizada')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Personalizar Reserva' }));

    // Should show doctor selection
    await waitFor(() => {
      expect(screen.getByText('¿Tienes preferencia por algún doctor?')).toBeInTheDocument();
    });
  });

  it('should allow switching from express to personalized', async () => {
    render(<UnifiedAppointmentFlow {...mockProps} />);

    // Go through express flow
    await waitFor(() => {
      expect(screen.getByText('Consulta General')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Consulta General'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reserva Express' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reserva Express' }));

    // Should show express confirmation with customize option
    await waitFor(() => {
      expect(screen.getByText('Personalizar en su lugar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Personalizar en su lugar' }));

    // Should switch to personalized flow
    await waitFor(() => {
      expect(screen.getByText('¿Tienes preferencia por algún doctor?')).toBeInTheDocument();
    });
  });

  it('should complete express booking successfully', async () => {
    render(<UnifiedAppointmentFlow {...mockProps} />);

    // Go through express flow
    await waitFor(() => {
      expect(screen.getByText('Consulta General')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Consulta General'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reserva Express' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reserva Express' }));

    // Confirm the appointment
    await waitFor(() => {
      expect(screen.getByText('Confirmar Cita Express')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Cita Express' }));

    // Should call onAppointmentBooked
    await waitFor(() => {
      expect(mockProps.onAppointmentBooked).toHaveBeenCalledWith('new-appointment-id');
    });
  });

  it('should show correct step indicators for express flow', async () => {
    render(<UnifiedAppointmentFlow {...mockProps} />);

    // Initially should show step 1 of 7 (before flow selection)
    expect(screen.getByText('Paso 1 de 7')).toBeInTheDocument();

    // Select service
    await waitFor(() => {
      expect(screen.getByText('Consulta General')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Consulta General'));

    // Should show step 2 of 7 (flow selection)
    await waitFor(() => {
      expect(screen.getByText('Paso 2 de 7')).toBeInTheDocument();
    });

    // Select express flow
    fireEvent.click(screen.getByRole('button', { name: 'Reserva Express' }));

    // Should show step 3 of 3 (express confirmation)
    await waitFor(() => {
      expect(screen.getByText('Paso 3 de 3')).toBeInTheDocument();
    });
  });

  it('should show correct step indicators for personalized flow', async () => {
    render(<UnifiedAppointmentFlow {...mockProps} />);

    // Select service and personalized flow
    await waitFor(() => {
      expect(screen.getByText('Consulta General')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Consulta General'));

    await waitFor(() => {
      expect(screen.getByText('Reserva Personalizada')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Personalizar Reserva' }));

    // Should show step 3 of 7 (doctor selection in personalized flow)
    await waitFor(() => {
      expect(screen.getByText('Paso 3 de 7')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully in express flow', async () => {
    // Mock API error for optimal appointment finder
    const { OptimalAppointmentFinder } = require('@/lib/appointments/OptimalAppointmentFinder');
    OptimalAppointmentFinder.mockImplementation(() => ({
      findOptimalAppointment: jest.fn().mockResolvedValue(null)
    }));

    render(<UnifiedAppointmentFlow {...mockProps} />);

    // Go through express flow
    await waitFor(() => {
      expect(screen.getByText('Consulta General')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Consulta General'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reserva Express' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reserva Express' }));

    // Should fallback to personalized flow
    await waitFor(() => {
      expect(screen.getByText('¿Tienes preferencia por algún doctor?')).toBeInTheDocument();
    });
  });

  it('should allow canceling express search', async () => {
    render(<UnifiedAppointmentFlow {...mockProps} />);

    // Select service and express flow
    await waitFor(() => {
      expect(screen.getByText('Consulta General')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Consulta General'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reserva Express' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reserva Express' }));

    // Should show searching state
    await waitFor(() => {
      expect(screen.getByText('Buscando tu cita perfecta')).toBeInTheDocument();
    });

    // Cancel the search
    fireEvent.click(screen.getByText('Cancelar búsqueda y elegir manualmente'));

    // Should switch to personalized flow
    await waitFor(() => {
      expect(screen.getByText('¿Tienes preferencia por algún doctor?')).toBeInTheDocument();
    });
  });

  it('should maintain form data when switching between flows', async () => {
    render(<UnifiedAppointmentFlow {...mockProps} />);

    // Select service
    await waitFor(() => {
      expect(screen.getByText('Consulta General')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Consulta General'));

    // Go to express flow and then switch to personalized
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reserva Express' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reserva Express' }));

    await waitFor(() => {
      expect(screen.getByText('Personalizar en su lugar')).toBeInTheDocument();
    }, { timeout: 10000 });
    fireEvent.click(screen.getByRole('button', { name: 'Personalizar en su lugar' }));

    // Service should still be selected in personalized flow
    await waitFor(() => {
      expect(screen.getByText('¿Tienes preferencia por algún doctor?')).toBeInTheDocument();
    });

    // The service selection should be maintained (verified by the fact that we reached doctor selection)
  });
});
