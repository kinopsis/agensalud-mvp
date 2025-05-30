/**
 * EnhancedRescheduleModal Tests
 * 
 * Pruebas completas para el modal mejorado de reagendado
 * Valida integración con API de disponibilidad, UX mejorada y funcionalidad
 * 
 * @author AgentSalud MVP Team - UX/UI Enhancement
 * @version 2.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedRescheduleModal from '@/components/appointments/EnhancedRescheduleModal';
import { AppointmentData } from '@/components/appointments/AppointmentCard';

// Mock fetch globally
global.fetch = jest.fn();

// Mock appointment data
const mockAppointment: AppointmentData = {
  id: 'apt-1',
  appointment_date: '2024-12-20',
  start_time: '10:00:00',
  duration_minutes: 30,
  status: 'confirmed',
  reason: 'Consulta general',
  notes: null,
  doctor: [{
    id: 'doc1',
    specialization: 'Medicina General',
    profiles: [{ first_name: 'Dr. Juan', last_name: 'Pérez' }]
  }],
  patient: [{ id: 'patient1', first_name: 'María', last_name: 'García' }],
  location: [{ id: 'loc1', name: 'Sede Principal', address: 'Calle 123' }],
  service: [{ id: 'serv1', name: 'Consulta General', duration_minutes: 30, price: 50000 }]
};

// Mock availability response
const mockAvailabilityResponse = {
  slots: [
    { start_time: '09:00', end_time: '09:30', available: true },
    { start_time: '09:30', end_time: '10:00', available: false, reason: 'Ocupado' },
    { start_time: '10:00', end_time: '10:30', available: true },
    { start_time: '10:30', end_time: '11:00', available: true },
    { start_time: '14:00', end_time: '14:30', available: true },
    { start_time: '14:30', end_time: '15:00', available: true },
    { start_time: '15:00', end_time: '15:30', available: false, reason: 'No disponible' },
  ]
};

describe('EnhancedRescheduleModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOrganizationId = 'org-123';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-12-15T12:00:00.000Z'));
    
    // Setup default fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAvailabilityResponse
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Renderizado y Visibilidad', () => {
    it('no debe renderizar cuando isOpen es false', () => {
      render(
        <EnhancedRescheduleModal
          isOpen={false}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText('Reagendar Cita')).not.toBeInTheDocument();
    });

    it('debe renderizar cuando isOpen es true', () => {
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Reagendar Cita')).toBeInTheDocument();
      expect(screen.getByText('Selecciona una nueva fecha y horario disponible')).toBeInTheDocument();
    });

    it('debe mostrar información de la cita no modificable', () => {
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Consulta General')).toBeInTheDocument();
      expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('Sede Principal')).toBeInTheDocument();
      expect(screen.getByText('2024-12-20')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });

  describe('Carga de Disponibilidad', () => {
    it('debe cargar disponibilidad automáticamente al abrir', async () => {
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/doctors/availability?organizationId=${mockOrganizationId}&doctorId=doc1&date=2024-12-20&duration=30`
        );
      });
    });

    it('debe mostrar estado de carga mientras carga horarios', async () => {
      // Mock delayed response
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockAvailabilityResponse
        }), 100))
      );

      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Cargando horarios...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Cargando horarios...')).not.toBeInTheDocument();
      });
    });

    it('debe manejar errores de carga de disponibilidad', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Error al cargar horarios disponibles')).toBeInTheDocument();
      });
    });
  });

  describe('Visualización de Horarios', () => {
    beforeEach(async () => {
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Wait for availability to load
      await waitFor(() => {
        expect(screen.getByText('Mañana')).toBeInTheDocument();
      });
    });

    it('debe agrupar horarios por períodos (Mañana/Tarde)', () => {
      expect(screen.getByText('Mañana')).toBeInTheDocument();
      expect(screen.getByText('Tarde')).toBeInTheDocument();
    });

    it('debe mostrar slots disponibles como botones habilitados', () => {
      const availableSlot = screen.getByRole('button', { name: /09:00/ });
      expect(availableSlot).toBeEnabled();
      expect(availableSlot).toHaveClass('hover:bg-blue-50');
    });

    it('debe mostrar slots no disponibles como botones deshabilitados', () => {
      const unavailableSlot = screen.getByRole('button', { name: /09:30/ });
      expect(unavailableSlot).toBeDisabled();
      expect(unavailableSlot).toHaveClass('cursor-not-allowed');
    });

    it('debe mostrar tooltips con información de disponibilidad', () => {
      const availableSlot = screen.getByRole('button', { name: /09:00/ });
      expect(availableSlot).toHaveAttribute('title', 'Disponible a las 09:00');

      const unavailableSlot = screen.getByRole('button', { name: /09:30/ });
      expect(unavailableSlot).toHaveAttribute('title', 'Ocupado');
    });
  });

  describe('Selección de Horarios', () => {
    beforeEach(async () => {
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Mañana')).toBeInTheDocument();
      });
    });

    it('debe permitir seleccionar un horario disponible', async () => {
      const availableSlot = screen.getByRole('button', { name: /09:00/ });
      fireEvent.click(availableSlot);

      expect(availableSlot).toHaveClass('bg-blue-600', 'text-white');
    });

    it('debe cambiar selección al hacer clic en otro horario', async () => {
      const firstSlot = screen.getByRole('button', { name: /09:00/ });
      const secondSlot = screen.getByRole('button', { name: /10:00/ });

      fireEvent.click(firstSlot);
      expect(firstSlot).toHaveClass('bg-blue-600');

      fireEvent.click(secondSlot);
      expect(firstSlot).not.toHaveClass('bg-blue-600');
      expect(secondSlot).toHaveClass('bg-blue-600');
    });

    it('debe habilitar botón de confirmación cuando se selecciona horario', async () => {
      const confirmButton = screen.getByRole('button', { name: /confirmar reagendado/i });
      expect(confirmButton).toBeDisabled();

      const availableSlot = screen.getByRole('button', { name: /09:00/ });
      fireEvent.click(availableSlot);

      expect(confirmButton).toBeEnabled();
    });
  });

  describe('Cambio de Fecha', () => {
    it('debe recargar disponibilidad al cambiar fecha', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dateInput = screen.getByLabelText('Nueva Fecha');
      await user.clear(dateInput);
      await user.type(dateInput, '2024-12-25');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/doctors/availability?organizationId=${mockOrganizationId}&doctorId=doc1&date=2024-12-25&duration=30`
        );
      });
    });

    it('debe limpiar selección de horario al cambiar fecha', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Wait for initial load and select a time
      await waitFor(() => {
        expect(screen.getByText('Mañana')).toBeInTheDocument();
      });

      const availableSlot = screen.getByRole('button', { name: /09:00/ });
      await user.click(availableSlot);
      expect(availableSlot).toHaveClass('bg-blue-600');

      // Change date
      const dateInput = screen.getByLabelText('Nueva Fecha');
      await user.clear(dateInput);
      await user.type(dateInput, '2024-12-25');

      // Selection should be cleared
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirmar reagendado/i });
        expect(confirmButton).toBeDisabled();
      });
    });
  });

  describe('Envío del Formulario', () => {
    it('debe llamar onConfirm con datos correctos', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Wait for availability to load
      await waitFor(() => {
        expect(screen.getByText('Mañana')).toBeInTheDocument();
      });

      // Change date
      const dateInput = screen.getByLabelText('Nueva Fecha');
      await user.clear(dateInput);
      await user.type(dateInput, '2024-12-25');

      // Wait for new availability to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('date=2024-12-25')
        );
      });

      // Select time slot
      const availableSlot = screen.getByRole('button', { name: /09:00/ });
      await user.click(availableSlot);

      // Submit form
      const confirmButton = screen.getByRole('button', { name: /confirmar reagendado/i });
      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('apt-1', '2024-12-25', '09:00');
    });

    it('debe mostrar estado de carga durante envío', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      // Mock slow onConfirm
      const slowOnConfirm = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={slowOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Mañana')).toBeInTheDocument();
      });

      const availableSlot = screen.getByRole('button', { name: /09:00/ });
      await user.click(availableSlot);

      const confirmButton = screen.getByRole('button', { name: /confirmar reagendado/i });
      await user.click(confirmButton);

      expect(screen.getByText('Reagendando...')).toBeInTheDocument();
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Funcionalidad de Botones', () => {
    it('debe llamar onCancel cuando se hace clic en Cancelar', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('debe llamar onCancel cuando se hace clic en X', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const closeButton = screen.getByLabelText('Cerrar modal');
      await user.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('debe permitir actualizar disponibilidad manualmente', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Actualizar')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /actualizar/i });
      await user.click(refreshButton);

      // Should make another API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Manejo de Errores', () => {
    it('debe mostrar mensaje de error cuando se proporciona', () => {
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          error="Error de prueba"
        />
      );

      expect(screen.getByText('Error de prueba')).toBeInTheDocument();
    });

    it('debe mostrar mensaje cuando no hay horarios disponibles', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ slots: [] })
      });

      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No hay horarios disponibles para esta fecha/)).toBeInTheDocument();
      });
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener atributos ARIA correctos', () => {
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dateInput = screen.getByLabelText('Nueva Fecha');
      const closeButton = screen.getByLabelText('Cerrar modal');

      expect(dateInput).toHaveAttribute('required');
      expect(closeButton).toBeInTheDocument();
    });

    it('debe ser navegable por teclado', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Tab navigation should work
      await user.tab();
      expect(screen.getByLabelText('Cerrar modal')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Nueva Fecha')).toHaveFocus();
    });
  });
});
