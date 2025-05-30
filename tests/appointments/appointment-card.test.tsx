/**
 * Tests for AppointmentCard Component
 * Validates the enhanced UX design and functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppointmentCard, { type AppointmentData } from '@/components/appointments/AppointmentCard';

// Mock data for testing
const mockAppointment: AppointmentData = {
  id: 'test-appointment-1',
  appointment_date: '2025-01-30',
  start_time: '14:30:00',
  duration_minutes: 30,
  status: 'confirmed',
  reason: 'Consulta de rutina',
  notes: 'Paciente con historial de hipertensión',
  doctor: [{
    id: 'doctor-1',
    specialization: 'Cardiología',
    profiles: [{
      first_name: 'Juan',
      last_name: 'Pérez'
    }]
  }],
  patient: [{
    id: 'patient-1',
    first_name: 'María',
    last_name: 'García'
  }],
  location: [{
    id: 'location-1',
    name: 'Sede Principal',
    address: 'Calle 123 #45-67, Bogotá'
  }],
  service: [{
    id: 'service-1',
    name: 'Consulta Cardiológica',
    duration_minutes: 30,
    price: 150000
  }]
};

describe('AppointmentCard Component', () => {
  const mockHandlers = {
    onReschedule: jest.fn(),
    onCancel: jest.fn(),
    onStatusChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render appointment information correctly', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="patient"
          {...mockHandlers}
        />
      );

      // Check date formatting (the actual date will be calculated by the component)
      expect(screen.getByText(/\d{1,2} de enero de 2025/i)).toBeInTheDocument();
      
      // Check time formatting
      expect(screen.getByText('14:30')).toBeInTheDocument();
      expect(screen.getByText('• 30 min')).toBeInTheDocument();

      // Check service and doctor
      expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
      expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();

      // Check location
      expect(screen.getByText('Sede Principal')).toBeInTheDocument();
      expect(screen.getByText('Calle 123 #45-67, Bogotá')).toBeInTheDocument();

      // Check status
      expect(screen.getByText('Confirmada')).toBeInTheDocument();
    });

    it('should show patient information for non-patient roles', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="doctor"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('María García')).toBeInTheDocument();
    });

    it('should hide patient information for patient role', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="patient"
          {...mockHandlers}
        />
      );

      expect(screen.queryByText('María García')).not.toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display pending status correctly', () => {
      const pendingAppointment = { ...mockAppointment, status: 'pending' };
      
      render(
        <AppointmentCard
          appointment={pendingAppointment}
          userRole="patient"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Pendiente de Confirmación')).toBeInTheDocument();
    });

    it('should display cancelled status correctly', () => {
      const cancelledAppointment = { ...mockAppointment, status: 'cancelled' };
      
      render(
        <AppointmentCard
          appointment={cancelledAppointment}
          userRole="patient"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Cancelada')).toBeInTheDocument();
    });

    it('should map legacy scheduled status to confirmed', () => {
      const scheduledAppointment = { ...mockAppointment, status: 'scheduled' };
      
      render(
        <AppointmentCard
          appointment={scheduledAppointment}
          userRole="patient"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Confirmada')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should show reschedule button when canReschedule is true', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="patient"
          canReschedule={true}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Reagendar')).toBeInTheDocument();
    });

    it('should show cancel button when canCancel is true', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="patient"
          canCancel={true}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should call onReschedule when reschedule button is clicked', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="patient"
          canReschedule={true}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Reagendar'));
      expect(mockHandlers.onReschedule).toHaveBeenCalledWith('test-appointment-1');
    });

    it('should call onCancel when cancel button is clicked', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="patient"
          canCancel={true}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Cancelar'));
      expect(mockHandlers.onCancel).toHaveBeenCalledWith('test-appointment-1');
    });
  });

  describe('Status Change Dropdown', () => {
    it('should show status dropdown when canChangeStatus is true', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="admin"
          canChangeStatus={true}
          {...mockHandlers}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should call onStatusChange when status is changed', async () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="admin"
          canChangeStatus={true}
          {...mockHandlers}
        />
      );

      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'completed' } });

      await waitFor(() => {
        expect(mockHandlers.onStatusChange).toHaveBeenCalledWith('test-appointment-1', 'completed');
      });
    });

    it('should map scheduled status to confirmed in dropdown', () => {
      const scheduledAppointment = { ...mockAppointment, status: 'scheduled' };
      
      render(
        <AppointmentCard
          appointment={scheduledAppointment}
          userRole="admin"
          canChangeStatus={true}
          {...mockHandlers}
        />
      );

      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      expect(dropdown.value).toBe('confirmed');
    });
  });

  describe('Optional Features', () => {
    it('should show cost when showCost is true and price is available', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="patient"
          showCost={true}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('$ 150.000')).toBeInTheDocument();
    });

    it('should hide location when showLocation is false', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="patient"
          showLocation={false}
          {...mockHandlers}
        />
      );

      expect(screen.queryByText('Sede Principal')).not.toBeInTheDocument();
    });

    it('should hide duration when showDuration is false', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="patient"
          showDuration={false}
          {...mockHandlers}
        />
      );

      expect(screen.queryByText('• 30 min')).not.toBeInTheDocument();
    });
  });

  describe('Reason and Notes', () => {
    it('should display reason when provided', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="patient"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Consulta de rutina')).toBeInTheDocument();
    });

    it('should display notes when provided', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="patient"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Paciente con historial de hipertensión')).toBeInTheDocument();
    });

    it('should not show reason/notes section when both are empty', () => {
      const appointmentWithoutNotes = {
        ...mockAppointment,
        reason: null,
        notes: null
      };

      render(
        <AppointmentCard
          appointment={appointmentWithoutNotes}
          userRole="patient"
          {...mockHandlers}
        />
      );

      expect(screen.queryByText('Motivo')).not.toBeInTheDocument();
      expect(screen.queryByText('Notas')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          userRole="admin"
          canChangeStatus={true}
          canReschedule={true}
          canCancel={true}
          {...mockHandlers}
        />
      );

      expect(screen.getByLabelText('Cambiar estado de la cita')).toBeInTheDocument();
      expect(screen.getByTitle('Reagendar cita')).toBeInTheDocument();
      expect(screen.getByTitle('Cancelar cita')).toBeInTheDocument();
    });
  });

  describe('Null Data Handling', () => {
    it('should handle null/undefined data gracefully', () => {
      const appointmentWithNullData = {
        ...mockAppointment,
        doctor: null,
        patient: null,
        location: null,
        service: null
      };

      render(
        <AppointmentCard
          appointment={appointmentWithNullData}
          userRole="admin"
          showLocation={true}
          showCost={true}
          showDuration={true}
        />
      );

      // Should not crash and should show fallback values
      expect(screen.getByText('Consulta General')).toBeInTheDocument(); // Service fallback
      expect(screen.queryByText('Ubicación')).not.toBeInTheDocument(); // Location hidden when null
      expect(screen.queryByText('Paciente')).not.toBeInTheDocument(); // Patient hidden when null
    });

    it('should handle empty arrays gracefully', () => {
      const appointmentWithEmptyArrays = {
        ...mockAppointment,
        doctor: [],
        patient: [],
        location: [],
        service: []
      };

      render(
        <AppointmentCard
          appointment={appointmentWithEmptyArrays}
          userRole="admin"
          showLocation={true}
          showCost={true}
          showDuration={true}
        />
      );

      // Should not crash and should show fallback values
      expect(screen.getByText('Consulta General')).toBeInTheDocument(); // Service fallback
      expect(screen.queryByText('Ubicación')).not.toBeInTheDocument(); // Location hidden when empty
      expect(screen.queryByText('Paciente')).not.toBeInTheDocument(); // Patient hidden when empty
    });

    it('should handle partial data gracefully', () => {
      const appointmentWithPartialData = {
        ...mockAppointment,
        doctor: [{
          id: 'doc-1',
          specialization: undefined,
          profiles: [{
            first_name: 'Juan',
            last_name: undefined
          }]
        }],
        location: [{
          id: 'loc-1',
          name: 'Sede Principal',
          address: undefined
        }]
      };

      render(
        <AppointmentCard
          appointment={appointmentWithPartialData}
          userRole="admin"
          showLocation={true}
        />
      );

      // Should show available data and handle missing fields
      expect(screen.getByText('Dr. Juan')).toBeInTheDocument();
      expect(screen.getByText('Sede Principal')).toBeInTheDocument();
      expect(screen.queryByText('undefined')).not.toBeInTheDocument();
    });
  });
});
