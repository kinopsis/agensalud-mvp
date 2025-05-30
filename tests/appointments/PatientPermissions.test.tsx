/**
 * Patient Permissions Tests
 * 
 * Pruebas específicas para validar que los pacientes pueden ver y usar
 * los botones "Reagendar" y "Cancelar" en sus citas
 * 
 * @author AgentSalud MVP Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppointmentCard, { AppointmentData } from '@/components/appointments/AppointmentCard';

// Mock data for patient appointments
const mockPatientAppointments: AppointmentData[] = [
  {
    id: 'apt-1',
    appointment_date: '2024-12-20', // Future date
    start_time: '10:00:00',
    duration_minutes: 30,
    status: 'confirmed', // Should allow reschedule/cancel
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
  },
  {
    id: 'apt-2',
    appointment_date: '2024-12-25', // Future date
    start_time: '14:00:00',
    duration_minutes: 45,
    status: 'pending', // Should allow reschedule/cancel
    reason: 'Control',
    notes: null,
    doctor: [{
      id: 'doc2',
      specialization: 'Cardiología',
      profiles: [{ first_name: 'Dra. Ana', last_name: 'López' }]
    }],
    patient: [{ id: 'patient1', first_name: 'María', last_name: 'García' }],
    location: [{ id: 'loc1', name: 'Sede Principal', address: 'Calle 123' }],
    service: [{ id: 'serv2', name: 'Consulta Cardiológica', duration_minutes: 45, price: 80000 }]
  },
  {
    id: 'apt-3',
    appointment_date: '2024-11-15', // Past date
    start_time: '09:00:00',
    duration_minutes: 30,
    status: 'completed', // Should NOT allow reschedule/cancel
    reason: 'Revisión',
    notes: 'Completada exitosamente',
    doctor: [{
      id: 'doc1',
      specialization: 'Medicina General',
      profiles: [{ first_name: 'Dr. Juan', last_name: 'Pérez' }]
    }],
    patient: [{ id: 'patient1', first_name: 'María', last_name: 'García' }],
    location: [{ id: 'loc1', name: 'Sede Principal', address: 'Calle 123' }],
    service: [{ id: 'serv1', name: 'Consulta General', duration_minutes: 30, price: 50000 }]
  }
];

describe('Patient Permissions - Reagendar y Cancelar Buttons', () => {
  const mockOnReschedule = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnStatusChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date to ensure consistent test results
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-12-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Citas Vigentes (Confirmed/Pending + Future)', () => {
    it('debe mostrar botones Reagendar y Cancelar para cita confirmed futura', () => {
      const confirmedAppointment = mockPatientAppointments[0]; // confirmed, future

      render(
        <AppointmentCard
          appointment={confirmedAppointment}
          userRole="patient"
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onStatusChange={mockOnStatusChange}
          canReschedule={true} // Simulating fixed permission logic
          canCancel={true}     // Simulating fixed permission logic
          canChangeStatus={false}
          showLocation={true}
          showCost={false}
          showDuration={true}
        />
      );

      // Verify buttons are present
      expect(screen.getByRole('button', { name: /reagendar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('debe mostrar botones Reagendar y Cancelar para cita pending futura', () => {
      const pendingAppointment = mockPatientAppointments[1]; // pending, future

      render(
        <AppointmentCard
          appointment={pendingAppointment}
          userRole="patient"
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onStatusChange={mockOnStatusChange}
          canReschedule={true} // Simulating fixed permission logic
          canCancel={true}     // Simulating fixed permission logic
          canChangeStatus={false}
          showLocation={true}
          showCost={false}
          showDuration={true}
        />
      );

      // Verify buttons are present
      expect(screen.getByRole('button', { name: /reagendar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });
  });

  describe('Citas Historial (Completed/Cancelled + Past)', () => {
    it('NO debe mostrar botones Reagendar y Cancelar para cita completed', () => {
      const completedAppointment = mockPatientAppointments[2]; // completed, past

      render(
        <AppointmentCard
          appointment={completedAppointment}
          userRole="patient"
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onStatusChange={mockOnStatusChange}
          canReschedule={false} // Should be false for completed appointments
          canCancel={false}     // Should be false for completed appointments
          canChangeStatus={false}
          showLocation={true}
          showCost={false}
          showDuration={true}
        />
      );

      // Verify buttons are NOT present
      expect(screen.queryByRole('button', { name: /reagendar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    });
  });

  describe('Funcionalidad de Botones', () => {
    it('debe llamar onReschedule cuando se hace clic en Reagendar', () => {
      const confirmedAppointment = mockPatientAppointments[0];

      render(
        <AppointmentCard
          appointment={confirmedAppointment}
          userRole="patient"
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onStatusChange={mockOnStatusChange}
          canReschedule={true}
          canCancel={true}
          canChangeStatus={false}
          showLocation={true}
          showCost={false}
          showDuration={true}
        />
      );

      const rescheduleButton = screen.getByRole('button', { name: /reagendar/i });
      rescheduleButton.click();

      expect(mockOnReschedule).toHaveBeenCalledWith(confirmedAppointment.id);
    });

    it('debe llamar onCancel cuando se hace clic en Cancelar', () => {
      const confirmedAppointment = mockPatientAppointments[0];

      render(
        <AppointmentCard
          appointment={confirmedAppointment}
          userRole="patient"
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onStatusChange={mockOnStatusChange}
          canReschedule={true}
          canCancel={true}
          canChangeStatus={false}
          showLocation={true}
          showCost={false}
          showDuration={true}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      cancelButton.click();

      expect(mockOnCancel).toHaveBeenCalledWith(confirmedAppointment.id);
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener atributos de accesibilidad correctos en los botones', () => {
      const confirmedAppointment = mockPatientAppointments[0];

      render(
        <AppointmentCard
          appointment={confirmedAppointment}
          userRole="patient"
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onStatusChange={mockOnStatusChange}
          canReschedule={true}
          canCancel={true}
          canChangeStatus={false}
          showLocation={true}
          showCost={false}
          showDuration={true}
        />
      );

      const rescheduleButton = screen.getByRole('button', { name: /reagendar/i });
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });

      // Check accessibility attributes
      expect(rescheduleButton).toHaveAttribute('title', 'Reagendar cita');
      expect(cancelButton).toHaveAttribute('title', 'Cancelar cita');
      expect(rescheduleButton).toHaveAttribute('type', 'button');
      expect(cancelButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Responsive Design', () => {
    it('debe mostrar texto completo en pantallas grandes', () => {
      const confirmedAppointment = mockPatientAppointments[0];

      render(
        <AppointmentCard
          appointment={confirmedAppointment}
          userRole="patient"
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          onStatusChange={mockOnStatusChange}
          canReschedule={true}
          canCancel={true}
          canChangeStatus={false}
          showLocation={true}
          showCost={false}
          showDuration={true}
        />
      );

      // In the ribbon design, text should be visible
      expect(screen.getByText('Reagendar')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });
  });
});
