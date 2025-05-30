/**
 * UI Permissions Validation Test
 * Validates that the UI correctly shows/hides buttons based on permissions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppointmentCard from '@/components/appointments/AppointmentCard';

// Mock data
const mockPatientProfile = {
  id: 'patient-123',
  role: 'patient' as const,
  organization_id: 'org-1'
};

const createMockAppointment = (status: string, patientId: string = 'patient-123') => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const futureDate = tomorrow.toISOString().split('T')[0];
  
  return {
    id: `appointment-${status}-${patientId}`,
    appointment_date: futureDate,
    start_time: '14:30:00',
    duration_minutes: 30,
    status,
    reason: 'Consulta de rutina',
    notes: null,
    doctor: [{
      id: 'doctor-1',
      specialization: 'Cardiología',
      profiles: [{ first_name: 'Dr. Juan', last_name: 'Pérez' }]
    }],
    patient: [{
      id: patientId,
      first_name: 'María',
      last_name: 'García'
    }],
    location: [{
      id: 'location-1',
      name: 'Sede Principal',
      address: 'Calle 123 #45-67'
    }],
    service: [{
      id: 'service-1',
      name: 'Consulta Cardiológica',
      duration_minutes: 30,
      price: 150000
    }]
  };
};

// Replicate permission logic from appointments page
const canCancelAppointment = (appointment: any, profile: any) => {
  const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
  const now = new Date();
  const isFuture = appointmentDateTime > now;

  const cancellableStatuses = ['confirmed', 'pending'];
  const isStatusCancellable = cancellableStatuses.includes(appointment.status);

  let hasPermission = false;

  if (profile?.role === 'patient') {
    hasPermission = appointment.patient[0]?.id === profile.id;
  } else if (['admin', 'staff', 'doctor'].includes(profile?.role || '')) {
    hasPermission = true;
  } else if (profile?.role === 'superadmin') {
    hasPermission = true;
  }

  return isFuture && isStatusCancellable && hasPermission;
};

const canRescheduleAppointment = (appointment: any, profile: any) => {
  const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
  const now = new Date();
  const isFuture = appointmentDateTime > now;

  const reschedulableStatuses = ['confirmed', 'pending'];
  const isStatusReschedulable = reschedulableStatuses.includes(appointment.status);

  let hasPermission = false;

  if (profile?.role === 'patient') {
    hasPermission = appointment.patient[0]?.id === profile.id;
  } else if (['admin', 'staff', 'doctor'].includes(profile?.role || '')) {
    hasPermission = true;
  } else if (profile?.role === 'superadmin') {
    hasPermission = true;
  }

  return isFuture && isStatusReschedulable && hasPermission;
};

describe('UI Permissions Validation', () => {
  const mockHandlers = {
    onReschedule: jest.fn(),
    onCancel: jest.fn(),
    onStatusChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Patient UI for Pending Appointments', () => {
    it('should show Reagendar and Cancelar buttons for patient own pending appointment', () => {
      const pendingAppointment = createMockAppointment('pending');
      const canReschedule = canRescheduleAppointment(pendingAppointment, mockPatientProfile);
      const canCancel = canCancelAppointment(pendingAppointment, mockPatientProfile);

      render(
        <AppointmentCard
          appointment={pendingAppointment}
          userRole="patient"
          canReschedule={canReschedule}
          canCancel={canCancel}
          canChangeStatus={false}
          {...mockHandlers}
        />
      );

      // Verify buttons are present
      expect(screen.getByText('Reagendar')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      
      console.log('✅ UI correctly shows action buttons for patient pending appointments');
    });

    it('should show Reagendar and Cancelar buttons for patient own confirmed appointment', () => {
      const confirmedAppointment = createMockAppointment('confirmed');
      const canReschedule = canRescheduleAppointment(confirmedAppointment, mockPatientProfile);
      const canCancel = canCancelAppointment(confirmedAppointment, mockPatientProfile);

      render(
        <AppointmentCard
          appointment={confirmedAppointment}
          userRole="patient"
          canReschedule={canReschedule}
          canCancel={canCancel}
          canChangeStatus={false}
          {...mockHandlers}
        />
      );

      // Verify buttons are present
      expect(screen.getByText('Reagendar')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      
      console.log('✅ UI correctly shows action buttons for patient confirmed appointments');
    });

    it('should NOT show action buttons for cancelled appointments', () => {
      const cancelledAppointment = createMockAppointment('cancelled');
      const canReschedule = canRescheduleAppointment(cancelledAppointment, mockPatientProfile);
      const canCancel = canCancelAppointment(cancelledAppointment, mockPatientProfile);

      render(
        <AppointmentCard
          appointment={cancelledAppointment}
          userRole="patient"
          canReschedule={canReschedule}
          canCancel={canCancel}
          canChangeStatus={false}
          {...mockHandlers}
        />
      );

      // Verify buttons are NOT present
      expect(screen.queryByText('Reagendar')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
      
      console.log('✅ UI correctly hides action buttons for cancelled appointments');
    });

    it('should NOT show action buttons for other patients appointments', () => {
      const otherPatientAppointment = createMockAppointment('pending', 'patient-456');
      const canReschedule = canRescheduleAppointment(otherPatientAppointment, mockPatientProfile);
      const canCancel = canCancelAppointment(otherPatientAppointment, mockPatientProfile);

      render(
        <AppointmentCard
          appointment={otherPatientAppointment}
          userRole="patient"
          canReschedule={canReschedule}
          canCancel={canCancel}
          canChangeStatus={false}
          {...mockHandlers}
        />
      );

      // Verify buttons are NOT present
      expect(screen.queryByText('Reagendar')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
      
      console.log('✅ UI correctly hides action buttons for other patients appointments');
    });
  });

  describe('Button Functionality', () => {
    it('should call onReschedule when Reagendar button is clicked', () => {
      const pendingAppointment = createMockAppointment('pending');
      const canReschedule = canRescheduleAppointment(pendingAppointment, mockPatientProfile);
      const canCancel = canCancelAppointment(pendingAppointment, mockPatientProfile);

      render(
        <AppointmentCard
          appointment={pendingAppointment}
          userRole="patient"
          canReschedule={canReschedule}
          canCancel={canCancel}
          canChangeStatus={false}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Reagendar'));
      expect(mockHandlers.onReschedule).toHaveBeenCalledWith(pendingAppointment.id);
      
      console.log('✅ Reagendar button correctly triggers callback');
    });

    it('should call onCancel when Cancelar button is clicked', () => {
      const pendingAppointment = createMockAppointment('pending');
      const canReschedule = canRescheduleAppointment(pendingAppointment, mockPatientProfile);
      const canCancel = canCancelAppointment(pendingAppointment, mockPatientProfile);

      render(
        <AppointmentCard
          appointment={pendingAppointment}
          userRole="patient"
          canReschedule={canReschedule}
          canCancel={canCancel}
          canChangeStatus={false}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText('Cancelar'));
      expect(mockHandlers.onCancel).toHaveBeenCalledWith(pendingAppointment.id);
      
      console.log('✅ Cancelar button correctly triggers callback');
    });
  });

  describe('Status Display Validation', () => {
    it('should correctly display pending status', () => {
      const pendingAppointment = createMockAppointment('pending');

      render(
        <AppointmentCard
          appointment={pendingAppointment}
          userRole="patient"
          canReschedule={true}
          canCancel={true}
          canChangeStatus={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Pendiente de Confirmación')).toBeInTheDocument();
      console.log('✅ Pending status correctly displayed');
    });

    it('should correctly display confirmed status', () => {
      const confirmedAppointment = createMockAppointment('confirmed');

      render(
        <AppointmentCard
          appointment={confirmedAppointment}
          userRole="patient"
          canReschedule={true}
          canCancel={true}
          canChangeStatus={false}
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Confirmada')).toBeInTheDocument();
      console.log('✅ Confirmed status correctly displayed');
    });
  });

  describe('Comprehensive Permission Matrix', () => {
    it('should validate complete permission matrix for patient role', () => {
      const scenarios = [
        { status: 'pending', ownAppointment: true, expectedButtons: true },
        { status: 'confirmed', ownAppointment: true, expectedButtons: true },
        { status: 'cancelled', ownAppointment: true, expectedButtons: false },
        { status: 'completed', ownAppointment: true, expectedButtons: false },
        { status: 'pending', ownAppointment: false, expectedButtons: false },
        { status: 'confirmed', ownAppointment: false, expectedButtons: false }
      ];

      scenarios.forEach(({ status, ownAppointment, expectedButtons }) => {
        const patientId = ownAppointment ? 'patient-123' : 'patient-456';
        const appointment = createMockAppointment(status, patientId);
        const canReschedule = canRescheduleAppointment(appointment, mockPatientProfile);
        const canCancel = canCancelAppointment(appointment, mockPatientProfile);

        expect(canReschedule).toBe(expectedButtons);
        expect(canCancel).toBe(expectedButtons);

        const description = `${status} ${ownAppointment ? 'own' : 'other'} appointment`;
        const result = expectedButtons ? 'ALLOWED' : 'BLOCKED';
        console.log(`✅ ${description}: ${result} (correct)`);
      });
    });
  });
});
