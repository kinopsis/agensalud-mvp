/**
 * CancelAppointmentModal Tests
 * 
 * Pruebas completas para el modal de cancelación de citas
 * Valida funcionalidad, UX, captura de motivos y accesibilidad
 * 
 * @author AgentSalud MVP Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CancelAppointmentModal, { CANCELLATION_REASONS } from '@/components/appointments/CancelAppointmentModal';
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
    profiles: [{ first_name: 'Juan', last_name: 'Pérez' }]
  }],
  patient: [{ id: 'patient1', first_name: 'María', last_name: 'García' }],
  location: [{ id: 'loc1', name: 'Sede Principal', address: 'Calle 123' }],
  service: [{ id: 'serv1', name: 'Consulta General', duration_minutes: 30, price: 50000 }]
};

describe('CancelAppointmentModal', () => {
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

  describe('Doctor Name Display (getDoctorName function)', () => {
    it('debe mostrar nombre completo con estructura normal', () => {
      const appointment = {
        ...mockAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          profiles: [{ first_name: 'Juan', last_name: 'Pérez' }]
        }]
      };

      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={appointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
    });

    it('debe manejar profiles como objeto (no array)', () => {
      const appointment = {
        ...mockAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          profiles: { first_name: 'Ana', last_name: 'García' } as any
        }]
      };

      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={appointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Dr. Ana García')).toBeInTheDocument();
    });

    it('debe manejar estructura aplanada (campos directos)', () => {
      const appointment = {
        ...mockAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          first_name: 'Carlos',
          last_name: 'Rodríguez',
          profiles: [] as any
        }]
      };

      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={appointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Dr. Carlos Rodríguez')).toBeInTheDocument();
    });

    it('debe manejar doctor sin asignar', () => {
      const appointment = {
        ...mockAppointment,
        doctor: []
      };

      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={appointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Dr. [No asignado]')).toBeInTheDocument();
    });

    it('debe manejar doctor con profiles vacío', () => {
      const appointment = {
        ...mockAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          profiles: []
        }]
      };

      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={appointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Dr. [Perfil no encontrado]')).toBeInTheDocument();
    });

    it('debe manejar solo nombre sin apellido', () => {
      const appointment = {
        ...mockAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          profiles: [{ first_name: 'María', last_name: '' }]
        }]
      };

      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={appointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Dr. María')).toBeInTheDocument();
    });
  });

  describe('Renderizado y Visibilidad', () => {
    it('no debe renderizar cuando isOpen es false', () => {
      render(
        <CancelAppointmentModal
          isOpen={false}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText('Cancelar Cita')).not.toBeInTheDocument();
    });

    it('debe renderizar cuando isOpen es true', () => {
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Cancelar Cita')).toBeInTheDocument();
      expect(screen.getByText('Esta acción no se puede deshacer')).toBeInTheDocument();
    });

    it('debe mostrar resumen completo de la cita', () => {
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Consulta General')).toBeInTheDocument();
      expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('Sede Principal')).toBeInTheDocument();
      expect(screen.getByText('viernes, 20 de diciembre de 2024')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByText('30 min')).toBeInTheDocument();
    });
  });

  describe('Motivos de Cancelación', () => {
    it('debe mostrar todos los motivos predefinidos', () => {
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText('Motivo de cancelación *');
      expect(select).toBeInTheDocument();

      // Check that all predefined reasons are available
      CANCELLATION_REASONS.forEach(reason => {
        expect(screen.getByText(reason.label)).toBeInTheDocument();
      });
    });

    it('debe mostrar campo de texto cuando se selecciona "Otro motivo"', async () => {
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText('Motivo de cancelación *');
      fireEvent.change(select, { target: { value: 'other' } });

      await waitFor(() => {
        expect(screen.getByLabelText('Especifica el motivo *')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Describe brevemente el motivo de cancelación...')).toBeInTheDocument();
      });
    });

    it('debe ocultar campo de texto cuando se selecciona motivo predefinido', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText('Motivo de cancelación *');
      
      // First select "other" to show the text field
      await user.selectOptions(select, 'other');
      expect(screen.getByLabelText('Especifica el motivo *')).toBeInTheDocument();

      // Then select a predefined reason
      await user.selectOptions(select, 'schedule_conflict');
      expect(screen.queryByLabelText('Especifica el motivo *')).not.toBeInTheDocument();
    });
  });

  describe('Validación de Formulario', () => {
    it('debe deshabilitar botón de confirmación sin motivo seleccionado', () => {
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirmar cancelación/i });
      expect(confirmButton).toBeDisabled();
    });

    it('debe habilitar botón cuando se selecciona motivo predefinido', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText('Motivo de cancelación *');
      const confirmButton = screen.getByRole('button', { name: /confirmar cancelación/i });

      await user.selectOptions(select, 'schedule_conflict');
      expect(confirmButton).not.toBeDisabled();
    });

    it('debe requerir texto personalizado para "Otro motivo"', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText('Motivo de cancelación *');
      const confirmButton = screen.getByRole('button', { name: /confirmar cancelación/i });

      await user.selectOptions(select, 'other');
      expect(confirmButton).toBeDisabled();

      const textArea = screen.getByLabelText('Especifica el motivo *');
      await user.type(textArea, 'Motivo personalizado');
      expect(confirmButton).not.toBeDisabled();
    });

    it('debe mostrar contador de caracteres para motivo personalizado', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText('Motivo de cancelación *');
      await user.selectOptions(select, 'other');

      const textArea = screen.getByLabelText('Especifica el motivo *');
      await user.type(textArea, 'Test');

      expect(screen.getByText('4/500 caracteres')).toBeInTheDocument();
    });
  });

  describe('Funcionalidad de Botones', () => {
    it('debe llamar onCancel cuando se hace clic en "Mantener Cita"', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const keepButton = screen.getByRole('button', { name: /mantener cita/i });
      await user.click(keepButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('debe llamar onCancel cuando se hace clic en X', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <CancelAppointmentModal
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

    it('debe llamar onConfirm con motivo predefinido', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText('Motivo de cancelación *');
      const confirmButton = screen.getByRole('button', { name: /confirmar cancelación/i });

      await user.selectOptions(select, 'schedule_conflict');
      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('apt-1', 'schedule_conflict', 'Conflicto de horario');
    });

    it('debe llamar onConfirm con motivo personalizado', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText('Motivo de cancelación *');
      const confirmButton = screen.getByRole('button', { name: /confirmar cancelación/i });

      await user.selectOptions(select, 'other');
      
      const textArea = screen.getByLabelText('Especifica el motivo *');
      await user.type(textArea, 'Motivo personalizado de prueba');
      
      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('apt-1', 'other', 'Motivo personalizado de prueba');
    });
  });

  describe('Estados de Carga', () => {
    it('debe mostrar estado de carga durante envío', () => {
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          loading={true}
        />
      );

      expect(screen.getByText('Cancelando...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancelando/i })).toBeDisabled();
    });

    it('debe deshabilitar botones durante envío', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          loading={true}
        />
      );

      const keepButton = screen.getByRole('button', { name: /mantener cita/i });
      const confirmButton = screen.getByRole('button', { name: /cancelando/i });

      expect(keepButton).toBeDisabled();
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Manejo de Errores', () => {
    it('debe mostrar mensaje de error cuando se proporciona', () => {
      render(
        <CancelAppointmentModal
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
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByLabelText('Motivo de cancelación *');
      const closeButton = screen.getByLabelText('Cerrar modal');

      expect(select).toHaveAttribute('required');
      expect(closeButton).toBeInTheDocument();
    });

    it('debe ser navegable por teclado', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      render(
        <CancelAppointmentModal
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
      expect(screen.getByLabelText('Motivo de cancelación *')).toHaveFocus();
    });
  });

  describe('Formateo de Datos', () => {
    it('debe formatear correctamente la duración', () => {
      const appointmentWith90Min = {
        ...mockAppointment,
        duration_minutes: 90
      };

      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={appointmentWith90Min}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('1h 30min')).toBeInTheDocument();
    });

    it('debe formatear correctamente la fecha en español', () => {
      render(
        <CancelAppointmentModal
          isOpen={true}
          appointment={mockAppointment}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('viernes, 20 de diciembre de 2024')).toBeInTheDocument();
    });
  });
});
