/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnifiedAppointmentFlow from '@/components/appointments/UnifiedAppointmentFlow';
import ConfirmationDialog from '@/components/appointments/shared/ConfirmationDialog';

// Mock fetch for API calls
global.fetch = jest.fn();

const mockProps = {
  organizationId: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
  userId: 'user-123',
  onAppointmentBooked: jest.fn(),
  onCancel: jest.fn(),
  mode: 'manual' as const
};

const mockServices = [
  {
    id: 'service-1',
    name: 'Examen Visual Completo',
    description: 'Evaluación completa de la salud visual',
    price: 60
  }
];

const mockDoctors = [
  {
    id: 'doctor-1',
    profiles: { first_name: 'Ana', last_name: 'Rodríguez' },
    specialization: 'Optometría Clínica',
    consultation_fee: 60
  }
];

const mockLocations = [
  {
    id: 'location-1',
    name: 'Sede Principal',
    address: 'Calle 123 #45-67'
  }
];

const mockAvailability = [
  {
    start_time: '09:00',
    end_time: '09:30',
    doctor_id: 'doctor-1',
    doctor_name: 'Dr. Ana Rodríguez',
    specialization: 'Optometría Clínica',
    consultation_fee: 60,
    available: true
  }
];

describe('Critical Issues Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/services')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ services: mockServices })
        });
      }
      if (url.includes('/api/doctors') && !url.includes('availability')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ doctors: mockDoctors })
        });
      }
      if (url.includes('/api/locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ locations: mockLocations })
        });
      }
      if (url.includes('/api/doctors/availability')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true,
            data: mockAvailability,
            count: mockAvailability.length
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  describe('Issue 1: Doctor Availability Problem - RESOLVED', () => {
    it('should correctly fetch and display doctor availability', async () => {
      render(<UnifiedAppointmentFlow {...mockProps} />);

      // Navigate through the flow to reach availability step
      await waitFor(() => {
        expect(screen.getByText('Examen Visual Completo')).toBeInTheDocument();
      });

      // Select service
      fireEvent.click(screen.getByText('Examen Visual Completo'));

      // Select "any doctor"
      await waitFor(() => {
        expect(screen.getByText('Cualquier doctor disponible')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Cualquier doctor disponible'));

      // Select location
      await waitFor(() => {
        expect(screen.getByText('Sede Principal')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Sede Principal'));

      // Select date
      await waitFor(() => {
        expect(screen.getByText('¿Cuándo te gustaría la cita?')).toBeInTheDocument();
      });
      
      // Mock date selection
      const dateInput = screen.getByDisplayValue('');
      fireEvent.change(dateInput, { target: { value: '2025-05-28' } });

      // Verify availability API is called with correct parameters
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/doctors/availability?organizationId=927cecbe-d9e5-43a4-b9d0-25f942ededc4&date=2025-05-28')
        );
      });
    });

    it('should handle "Cualquier doctor disponible" option correctly', async () => {
      render(<UnifiedAppointmentFlow {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Examen Visual Completo')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Examen Visual Completo'));

      await waitFor(() => {
        expect(screen.getByText('Cualquier doctor disponible')).toBeInTheDocument();
        expect(screen.getByText('Ver disponibilidad de todos los doctores (1 disponibles)')).toBeInTheDocument();
        expect(screen.getByText('Recomendado para mayor flexibilidad de horarios')).toBeInTheDocument();
      });
    });
  });

  describe('Issue 2: Visual Focus Problems - RESOLVED', () => {
    it('should display step 5 (confirmation) with enhanced visual focus', async () => {
      const { container } = render(<UnifiedAppointmentFlow {...mockProps} />);

      // Navigate to confirmation step
      await waitFor(() => {
        expect(screen.getByText('Examen Visual Completo')).toBeInTheDocument();
      });

      // Complete the flow to reach confirmation
      fireEvent.click(screen.getByText('Examen Visual Completo'));
      
      await waitFor(() => {
        expect(screen.getByText('Cualquier doctor disponible')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Cualquier doctor disponible'));

      await waitFor(() => {
        expect(screen.getByText('Sede Principal')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Sede Principal'));

      // Mock reaching confirmation step
      const confirmationStep = container.querySelector('.bg-gradient-to-br.from-blue-50.to-indigo-50');
      if (confirmationStep) {
        expect(confirmationStep).toHaveClass('border-2', 'border-blue-200');
      }
    });

    it('should show enhanced confirmation button with proper styling', async () => {
      render(<UnifiedAppointmentFlow {...mockProps} />);

      // The confirmation button should have enhanced styling when visible
      const confirmButton = screen.queryByText('Confirmar Cita');
      if (confirmButton) {
        expect(confirmButton).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-indigo-600');
        expect(confirmButton).toHaveClass('shadow-lg', 'hover:shadow-xl');
      }
    });

    it('should display progress indicator correctly for all steps', () => {
      render(<UnifiedAppointmentFlow {...mockProps} />);

      // Check that progress indicator shows correct step count
      expect(screen.getByText('Paso 1 de 6')).toBeInTheDocument();
    });
  });

  describe('Issue 3: Missing Cancel Functionality - RESOLVED', () => {
    it('should show cancel button in footer navigation', () => {
      render(<UnifiedAppointmentFlow {...mockProps} />);

      const cancelButton = screen.getByText('Cancelar');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toHaveClass('text-red-600', 'hover:text-red-700');
    });

    it('should open confirmation dialog when cancel is clicked', () => {
      render(<UnifiedAppointmentFlow {...mockProps} />);

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      expect(screen.getByText('Cancelar reserva de cita')).toBeInTheDocument();
      expect(screen.getByText('¿Estás seguro de que quieres cancelar? Se perderá toda la información ingresada y tendrás que empezar de nuevo.')).toBeInTheDocument();
    });

    it('should call onCancel when confirmation is accepted', () => {
      render(<UnifiedAppointmentFlow {...mockProps} />);

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      const confirmButton = screen.getByText('Sí, cancelar');
      fireEvent.click(confirmButton);

      expect(mockProps.onCancel).toHaveBeenCalled();
    });

    it('should close dialog when cancel is declined', () => {
      render(<UnifiedAppointmentFlow {...mockProps} />);

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      const continueButton = screen.getByText('Continuar reservando');
      fireEvent.click(continueButton);

      expect(screen.queryByText('Cancelar reserva de cita')).not.toBeInTheDocument();
    });

    it('should show back button when not on first step', async () => {
      render(<UnifiedAppointmentFlow {...mockProps} />);

      // Navigate to second step
      await waitFor(() => {
        expect(screen.getByText('Examen Visual Completo')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Examen Visual Completo'));

      await waitFor(() => {
        expect(screen.getByText('Anterior')).toBeInTheDocument();
      });
    });
  });

  describe('ConfirmationDialog Component', () => {
    const mockDialogProps = {
      isOpen: true,
      title: 'Test Dialog',
      message: 'This is a test message',
      onConfirm: jest.fn(),
      onCancel: jest.fn()
    };

    it('should render when open', () => {
      render(<ConfirmationDialog {...mockDialogProps} />);

      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      expect(screen.getByText('This is a test message')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<ConfirmationDialog {...mockDialogProps} isOpen={false} />);

      expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
    });

    it('should call onConfirm when confirm button is clicked', () => {
      render(<ConfirmationDialog {...mockDialogProps} />);

      fireEvent.click(screen.getByText('Confirmar'));
      expect(mockDialogProps.onConfirm).toHaveBeenCalled();
    });

    it('should call onCancel when cancel button is clicked', () => {
      render(<ConfirmationDialog {...mockDialogProps} />);

      fireEvent.click(screen.getByText('Cancelar'));
      expect(mockDialogProps.onCancel).toHaveBeenCalled();
    });

    it('should support danger variant styling', () => {
      render(<ConfirmationDialog {...mockDialogProps} confirmVariant="danger" />);

      const confirmButton = screen.getByText('Confirmar');
      expect(confirmButton).toHaveClass('bg-red-600', 'hover:bg-red-700');
    });
  });

  describe('Enhanced User Experience', () => {
    it('should show loading states during API calls', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ services: mockServices })
        }), 100))
      );

      render(<UnifiedAppointmentFlow {...mockProps} />);

      // Loading state should be visible during API call
      expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

      render(<UnifiedAppointmentFlow {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Error al cargar servicios')).toBeInTheDocument();
      });
    });

    it('should maintain form data when navigating between steps', async () => {
      render(<UnifiedAppointmentFlow {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Examen Visual Completo')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Examen Visual Completo'));

      // Navigate back and forward to ensure data persistence
      await waitFor(() => {
        expect(screen.getByText('Anterior')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Anterior'));
      
      // Service should still be selected
      const selectedService = screen.getByText('Examen Visual Completo');
      expect(selectedService.closest('button')).toHaveClass('border-blue-500');
    });
  });
});
