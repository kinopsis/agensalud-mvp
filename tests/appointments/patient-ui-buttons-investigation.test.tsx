/**
 * Patient UI Buttons Investigation Test
 * Reproduces and validates the reported issue with button visibility for patients
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppointmentCard from '@/components/appointments/AppointmentCard';

// Mock patient profile
const mockPatientProfile = {
  id: 'patient-123',
  role: 'patient' as const,
  organization_id: 'org-1',
  first_name: 'María',
  last_name: 'García'
};

// Mock appointment data
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

// Replicate exact permission logic from appointments page
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

describe('Patient UI Buttons Investigation', () => {
  const mockHandlers = {
    onReschedule: jest.fn(),
    onCancel: jest.fn(),
    onStatusChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Reproducing Reported Issue', () => {
    it('should investigate if buttons are visible for patient pending appointments', () => {
      const pendingAppointment = createMockAppointment('pending');
      
      // Calculate permissions exactly as the main page does
      const canReschedule = canRescheduleAppointment(pendingAppointment, mockPatientProfile);
      const canCancel = canCancelAppointment(pendingAppointment, mockPatientProfile);
      
      console.log('🔍 INVESTIGATION RESULTS:');
      console.log(`   - Appointment Status: ${pendingAppointment.status}`);
      console.log(`   - Patient ID: ${mockPatientProfile.id}`);
      console.log(`   - Appointment Patient ID: ${pendingAppointment.patient[0].id}`);
      console.log(`   - canReschedule calculated: ${canReschedule}`);
      console.log(`   - canCancel calculated: ${canCancel}`);

      // Render component exactly as the main page does
      render(
        <AppointmentCard
          appointment={pendingAppointment}
          userRole="patient"
          canReschedule={canReschedule}
          canCancel={canCancel}
          canChangeStatus={false}
          showLocation={true}
          showCost={false}
          showDuration={true}
          {...mockHandlers}
        />
      );

      // Check if buttons are present
      const reagendarButton = screen.queryByText('Reagendar');
      const cancelarButton = screen.queryByText('Cancelar');
      
      console.log(`   - Reagendar button found: ${reagendarButton ? 'YES' : 'NO'}`);
      console.log(`   - Cancelar button found: ${cancelarButton ? 'YES' : 'NO'}`);

      // Verify expectations
      expect(canReschedule).toBe(true);
      expect(canCancel).toBe(true);
      expect(reagendarButton).toBeInTheDocument();
      expect(cancelarButton).toBeInTheDocument();
      
      console.log('✅ CONCLUSION: Buttons ARE visible for patient pending appointments');
    });

    it('should investigate if buttons are visible for patient confirmed appointments', () => {
      const confirmedAppointment = createMockAppointment('confirmed');
      
      const canReschedule = canRescheduleAppointment(confirmedAppointment, mockPatientProfile);
      const canCancel = canCancelAppointment(confirmedAppointment, mockPatientProfile);
      
      console.log('🔍 CONFIRMED APPOINTMENT INVESTIGATION:');
      console.log(`   - canReschedule: ${canReschedule}`);
      console.log(`   - canCancel: ${canCancel}`);

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

      const reagendarButton = screen.queryByText('Reagendar');
      const cancelarButton = screen.queryByText('Cancelar');
      
      console.log(`   - Reagendar button found: ${reagendarButton ? 'YES' : 'NO'}`);
      console.log(`   - Cancelar button found: ${cancelarButton ? 'YES' : 'NO'}`);

      expect(canReschedule).toBe(true);
      expect(canCancel).toBe(true);
      expect(reagendarButton).toBeInTheDocument();
      expect(cancelarButton).toBeInTheDocument();
      
      console.log('✅ CONCLUSION: Buttons ARE visible for patient confirmed appointments');
    });

    it('should verify buttons are NOT visible when permissions are false', () => {
      const pendingAppointment = createMockAppointment('pending');
      
      console.log('🔍 TESTING WITH EXPLICIT FALSE PERMISSIONS:');

      render(
        <AppointmentCard
          appointment={pendingAppointment}
          userRole="patient"
          canReschedule={false}  // Explicitly false
          canCancel={false}     // Explicitly false
          canChangeStatus={false}
          {...mockHandlers}
        />
      );

      const reagendarButton = screen.queryByText('Reagendar');
      const cancelarButton = screen.queryByText('Cancelar');
      
      console.log(`   - Reagendar button found: ${reagendarButton ? 'YES' : 'NO'}`);
      console.log(`   - Cancelar button found: ${cancelarButton ? 'YES' : 'NO'}`);

      expect(reagendarButton).not.toBeInTheDocument();
      expect(cancelarButton).not.toBeInTheDocument();
      
      console.log('✅ CONCLUSION: Buttons correctly hidden when permissions are false');
    });

    it('should test edge case: other patients appointment', () => {
      const otherPatientAppointment = createMockAppointment('pending', 'patient-456');
      
      const canReschedule = canRescheduleAppointment(otherPatientAppointment, mockPatientProfile);
      const canCancel = canCancelAppointment(otherPatientAppointment, mockPatientProfile);
      
      console.log('🔍 OTHER PATIENT APPOINTMENT INVESTIGATION:');
      console.log(`   - Current Patient ID: ${mockPatientProfile.id}`);
      console.log(`   - Appointment Patient ID: ${otherPatientAppointment.patient[0].id}`);
      console.log(`   - canReschedule: ${canReschedule}`);
      console.log(`   - canCancel: ${canCancel}`);

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

      const reagendarButton = screen.queryByText('Reagendar');
      const cancelarButton = screen.queryByText('Cancelar');
      
      console.log(`   - Reagendar button found: ${reagendarButton ? 'YES' : 'NO'}`);
      console.log(`   - Cancelar button found: ${cancelarButton ? 'YES' : 'NO'}`);

      expect(canReschedule).toBe(false);
      expect(canCancel).toBe(false);
      expect(reagendarButton).not.toBeInTheDocument();
      expect(cancelarButton).not.toBeInTheDocument();
      
      console.log('✅ CONCLUSION: Buttons correctly hidden for other patients appointments');
    });
  });

  describe('Component Behavior Analysis', () => {
    it('should verify the footer section renders when any permission is true', () => {
      const pendingAppointment = createMockAppointment('pending');

      render(
        <AppointmentCard
          appointment={pendingAppointment}
          userRole="patient"
          canReschedule={true}
          canCancel={false}
          canChangeStatus={false}
          {...mockHandlers}
        />
      );

      // The footer should render because canReschedule is true
      expect(screen.getByText('Reagendar')).toBeInTheDocument();
      expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
      
      console.log('✅ Footer renders correctly with partial permissions');
    });

    it('should verify the footer section does NOT render when all permissions are false', () => {
      const pendingAppointment = createMockAppointment('pending');

      render(
        <AppointmentCard
          appointment={pendingAppointment}
          userRole="patient"
          canReschedule={false}
          canCancel={false}
          canChangeStatus={false}
          {...mockHandlers}
        />
      );

      // No footer should render
      expect(screen.queryByText('Reagendar')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
      
      // Check that the footer div is not present
      const footerElement = screen.queryByRole('button');
      expect(footerElement).not.toBeInTheDocument();
      
      console.log('✅ Footer correctly hidden when no permissions');
    });
  });
});
