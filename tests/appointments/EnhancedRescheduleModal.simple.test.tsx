/**
 * EnhancedRescheduleModal Simple Tests
 * 
 * Pruebas simplificadas para validar funcionalidad básica
 * Compatible con dependencias disponibles en el proyecto
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
    { start_time: '14:00', end_time: '14:30', available: true },
    { start_time: '14:30', end_time: '15:00', available: true },
  ]
};

describe('EnhancedRescheduleModal - Funcionalidad Básica', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOrganizationId = 'org-123';

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAvailabilityResponse
    });
  });

  describe('Renderizado Básico', () => {
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

    it('debe mostrar estado de carga', async () => {
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
    });

    it('debe manejar errores de carga', async () => {
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

    it('debe agrupar horarios por períodos', () => {
      expect(screen.getByText('Mañana')).toBeInTheDocument();
      expect(screen.getByText('Tarde')).toBeInTheDocument();
    });

    it('debe mostrar slots disponibles como botones habilitados', () => {
      const availableSlot = screen.getByRole('button', { name: /09:00/ });
      expect(availableSlot).toBeEnabled();
    });

    it('debe mostrar slots no disponibles como botones deshabilitados', () => {
      const unavailableSlot = screen.getByRole('button', { name: /09:30/ });
      expect(unavailableSlot).toBeDisabled();
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

    it('debe permitir seleccionar un horario disponible', () => {
      const availableSlot = screen.getByRole('button', { name: /09:00/ });
      fireEvent.click(availableSlot);

      expect(availableSlot).toHaveClass('bg-blue-600', 'text-white');
    });

    it('debe habilitar botón de confirmación cuando se selecciona horario', () => {
      const confirmButton = screen.getByRole('button', { name: /confirmar reagendado/i });
      expect(confirmButton).toBeDisabled();

      const availableSlot = screen.getByRole('button', { name: /09:00/ });
      fireEvent.click(availableSlot);

      expect(confirmButton).toBeEnabled();
    });
  });

  describe('Funcionalidad de Botones', () => {
    it('debe llamar onCancel cuando se hace clic en Cancelar', () => {
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
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('debe llamar onCancel cuando se hace clic en X', () => {
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
      fireEvent.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cambio de Fecha', () => {
    it('debe recargar disponibilidad al cambiar fecha', async () => {
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
      fireEvent.change(dateInput, { target: { value: '2024-12-25' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/doctors/availability?organizationId=${mockOrganizationId}&doctorId=doc1&date=2024-12-25&duration=30`
        );
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

  describe('Estados de Carga', () => {
    it('debe mostrar estado de carga durante envío', () => {
      render(
        <EnhancedRescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          organizationId={mockOrganizationId}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          loading={true}
        />
      );

      expect(screen.getByText('Reagendando...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reagendando/i })).toBeDisabled();
    });
  });
});
