/**
 * RescheduleModal Tests
 * 
 * Pruebas completas para el modal de reagendado de citas
 * Valida funcionalidad, UX, accesibilidad y restricciones
 * 
 * @author AgentSalud MVP Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import RescheduleModal from '@/components/appointments/RescheduleModal';
import { AppointmentData } from '@/components/appointments/AppointmentCard';

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

describe('RescheduleModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-12-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Renderizado y Visibilidad', () => {
    it('no debe renderizar cuando isOpen es false', () => {
      render(
        <RescheduleModal
          isOpen={false}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText('Reagendar Cita')).not.toBeInTheDocument();
    });

    it('debe renderizar cuando isOpen es true', () => {
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Reagendar Cita')).toBeInTheDocument();
      expect(screen.getByText('Solo puedes cambiar la fecha y hora')).toBeInTheDocument();
    });

    it('debe mostrar información de la cita no modificable', () => {
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Consulta General')).toBeInTheDocument();
      expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('Sede Principal')).toBeInTheDocument();
    });
  });

  describe('Formulario de Reagendado', () => {
    it('debe inicializar con los valores actuales de la cita', () => {
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dateInput = screen.getByLabelText('Nueva Fecha') as HTMLInputElement;
      const timeInput = screen.getByLabelText('Nueva Hora') as HTMLInputElement;

      expect(dateInput.value).toBe('2024-12-20');
      expect(timeInput.value).toBe('10:00');
    });

    it('debe permitir cambiar la fecha', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dateInput = screen.getByLabelText('Nueva Fecha');
      await user.clear(dateInput);
      await user.type(dateInput, '2024-12-25');

      expect(dateInput).toHaveValue('2024-12-25');
    });

    it('debe permitir cambiar la hora', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const timeInput = screen.getByLabelText('Nueva Hora');
      await user.clear(timeInput);
      await user.type(timeInput, '14:30');

      expect(timeInput).toHaveValue('14:30');
    });
  });

  describe('Validación de Formulario', () => {
    it('debe mostrar error si la fecha está vacía', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dateInput = screen.getByLabelText('Nueva Fecha');
      const submitButton = screen.getByRole('button', { name: /confirmar reagendado/i });

      await user.clear(dateInput);
      await user.click(submitButton);

      expect(screen.getByText('La fecha es requerida')).toBeInTheDocument();
    });

    it('debe mostrar error si la hora está vacía', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const timeInput = screen.getByLabelText('Nueva Hora');
      const submitButton = screen.getByRole('button', { name: /confirmar reagendado/i });

      await user.clear(timeInput);
      await user.click(submitButton);

      expect(screen.getByText('La hora es requerida')).toBeInTheDocument();
    });

    it('debe mostrar error si la fecha es en el pasado', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dateInput = screen.getByLabelText('Nueva Fecha');
      const submitButton = screen.getByRole('button', { name: /confirmar reagendado/i });

      await user.clear(dateInput);
      await user.type(dateInput, '2024-12-10'); // Past date
      await user.click(submitButton);

      expect(screen.getByText('La fecha debe ser hoy o en el futuro')).toBeInTheDocument();
    });
  });

  describe('Funcionalidad de Botones', () => {
    it('debe llamar onCancel cuando se hace clic en Cancelar', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
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
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const closeButton = screen.getByLabelText('Cerrar modal');
      await user.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('debe llamar onConfirm con datos correctos al enviar formulario válido', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dateInput = screen.getByLabelText('Nueva Fecha');
      const timeInput = screen.getByLabelText('Nueva Hora');
      const submitButton = screen.getByRole('button', { name: /confirmar reagendado/i });

      await user.clear(dateInput);
      await user.type(dateInput, '2024-12-25');
      await user.clear(timeInput);
      await user.type(timeInput, '14:30');
      await user.click(submitButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('apt-1', '2024-12-25', '14:30');
    });
  });

  describe('Estados de Carga', () => {
    it('debe mostrar estado de carga durante envío', () => {
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          loading={true}
        />
      );

      expect(screen.getByText('Reagendando...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reagendando/i })).toBeDisabled();
    });

    it('debe deshabilitar botones durante envío', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      const { rerender } = render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByRole('button', { name: /confirmar reagendado/i });
      await user.click(submitButton);

      // Simulate loading state
      rerender(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          loading={true}
        />
      );

      expect(submitButton).toBeDisabled();
    });
  });

  describe('Mensaje Informativo', () => {
    it('debe mostrar mensaje sobre limitaciones del reagendado', () => {
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('¿Necesitas cambiar más detalles?')).toBeInTheDocument();
      expect(screen.getByText(/Para cambiar ubicación, servicio o doctor/)).toBeInTheDocument();
    });
  });

  describe('Manejo de Errores', () => {
    it('debe mostrar mensaje de error cuando se proporciona', () => {
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          error="Error de prueba"
        />
      );

      expect(screen.getByText('Error de prueba')).toBeInTheDocument();
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener atributos ARIA correctos', () => {
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dateInput = screen.getByLabelText('Nueva Fecha');
      const timeInput = screen.getByLabelText('Nueva Hora');
      const closeButton = screen.getByLabelText('Cerrar modal');

      expect(dateInput).toHaveAttribute('required');
      expect(timeInput).toHaveAttribute('required');
      expect(closeButton).toBeInTheDocument();
    });

    it('debe ser navegable por teclado', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <RescheduleModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Tab navigation should work
      await user.tab();
      expect(screen.getByLabelText('Cerrar modal')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Nueva Fecha')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Nueva Hora')).toHaveFocus();
    });
  });
});
