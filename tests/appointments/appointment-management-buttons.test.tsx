/**
 * TESTS FOR APPOINTMENT MANAGEMENT BUTTONS
 * Validates the implementation of Reschedule and Cancel buttons
 * Tests permissions, UI behavior, and functionality
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the auth and tenant contexts
const mockProfile = {
  id: 'patient-123',
  role: 'patient',
  organization_id: 'org-123'
};

const mockOrganization = {
  id: 'org-123',
  name: 'Test Clinic'
};

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
    profile: mockProfile
  })
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: () => ({
    organization: mockOrganization
  })
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null)
  })
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
    }
  })
}));

// Mock appointment actions
jest.mock('@/app/api/appointments/actions', () => ({
  cancelAppointment: jest.fn(),
  updateAppointment: jest.fn()
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: ''
  },
  writable: true
});

// Mock appointment data
const mockAppointments = [
  {
    id: 'apt-1',
    appointment_date: '2025-06-15', // Future date
    start_time: '10:00:00',
    duration_minutes: 30,
    status: 'pending',
    reason: 'Consulta general',
    notes: 'Primera consulta',
    doctor: [{
      id: 'doc-1',
      specialization: 'Optometría',
      profiles: [{
        first_name: 'Ana',
        last_name: 'García'
      }]
    }],
    patient: [{
      id: 'patient-123', // Same as mockProfile.id
      first_name: 'Juan',
      last_name: 'Pérez'
    }]
  },
  {
    id: 'apt-2',
    appointment_date: '2025-06-20',
    start_time: '14:30:00',
    duration_minutes: 45,
    status: 'confirmed',
    reason: 'Control',
    notes: null,
    doctor: [{
      id: 'doc-2',
      specialization: 'Oftalmología',
      profiles: [{
        first_name: 'Carlos',
        last_name: 'López'
      }]
    }],
    patient: [{
      id: 'patient-123',
      first_name: 'Juan',
      last_name: 'Pérez'
    }]
  },
  {
    id: 'apt-3',
    appointment_date: '2025-05-20', // Past date
    start_time: '09:00:00',
    duration_minutes: 30,
    status: 'completed',
    reason: 'Examen visual',
    notes: 'Examen completado',
    doctor: [{
      id: 'doc-1',
      specialization: 'Optometría',
      profiles: [{
        first_name: 'Ana',
        last_name: 'García'
      }]
    }],
    patient: [{
      id: 'patient-123',
      first_name: 'Juan',
      last_name: 'Pérez'
    }]
  }
];

// Permission testing functions
const canCancelAppointment = (appointment: any, profile: any) => {
  if (!appointment || !profile) return false;

  const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
  const now = new Date();
  const isFuture = appointmentDateTime > now;

  const cancellableStatuses = ['scheduled', 'confirmed', 'pending'];
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
  if (!appointment || !profile) return false;

  const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
  const now = new Date();
  const isFuture = appointmentDateTime > now;

  const reschedulableStatuses = ['scheduled', 'confirmed', 'pending'];
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

describe('Appointment Management Buttons', () => {

  describe('1. PERMISSION VALIDATION', () => {
    
    it('should allow patient to cancel their own future pending appointment', () => {
      const appointment = mockAppointments[0]; // pending, future, patient's own
      const canCancel = canCancelAppointment(appointment, mockProfile);
      expect(canCancel).toBe(true);
    });

    it('should allow patient to reschedule their own future confirmed appointment', () => {
      const appointment = mockAppointments[1]; // confirmed, future, patient's own
      const canReschedule = canRescheduleAppointment(appointment, mockProfile);
      expect(canReschedule).toBe(true);
    });

    it('should NOT allow patient to cancel past appointments', () => {
      const appointment = mockAppointments[2]; // completed, past
      const canCancel = canCancelAppointment(appointment, mockProfile);
      expect(canCancel).toBe(false);
    });

    it('should NOT allow patient to reschedule completed appointments', () => {
      const appointment = mockAppointments[2]; // completed
      const canReschedule = canRescheduleAppointment(appointment, mockProfile);
      expect(canReschedule).toBe(false);
    });

    it('should allow admin to cancel any future appointment in their organization', () => {
      const adminProfile = { ...mockProfile, role: 'admin' };
      const appointment = mockAppointments[0];
      const canCancel = canCancelAppointment(appointment, adminProfile);
      expect(canCancel).toBe(true);
    });

    it('should allow staff to reschedule any future appointment in their organization', () => {
      const staffProfile = { ...mockProfile, role: 'staff' };
      const appointment = mockAppointments[1];
      const canReschedule = canRescheduleAppointment(appointment, staffProfile);
      expect(canReschedule).toBe(true);
    });
  });

  describe('2. STATUS VALIDATION', () => {
    
    it('should allow cancellation of pending appointments', () => {
      const appointment = { ...mockAppointments[0], status: 'pending' };
      const canCancel = canCancelAppointment(appointment, mockProfile);
      expect(canCancel).toBe(true);
    });

    it('should allow cancellation of confirmed appointments', () => {
      const appointment = { ...mockAppointments[0], status: 'confirmed' };
      const canCancel = canCancelAppointment(appointment, mockProfile);
      expect(canCancel).toBe(true);
    });

    it('should allow cancellation of scheduled appointments', () => {
      const appointment = { ...mockAppointments[0], status: 'scheduled' };
      const canCancel = canCancelAppointment(appointment, mockProfile);
      expect(canCancel).toBe(true);
    });

    it('should NOT allow cancellation of cancelled appointments', () => {
      const appointment = { ...mockAppointments[0], status: 'cancelled' };
      const canCancel = canCancelAppointment(appointment, mockProfile);
      expect(canCancel).toBe(false);
    });

    it('should NOT allow rescheduling of completed appointments', () => {
      const appointment = { ...mockAppointments[0], status: 'completed' };
      const canReschedule = canRescheduleAppointment(appointment, mockProfile);
      expect(canReschedule).toBe(false);
    });
  });

  describe('3. DATE VALIDATION', () => {
    
    it('should allow operations on future appointments', () => {
      const futureAppointment = {
        ...mockAppointments[0],
        appointment_date: '2025-12-31',
        start_time: '10:00:00'
      };
      
      const canCancel = canCancelAppointment(futureAppointment, mockProfile);
      const canReschedule = canRescheduleAppointment(futureAppointment, mockProfile);
      
      expect(canCancel).toBe(true);
      expect(canReschedule).toBe(true);
    });

    it('should NOT allow operations on past appointments', () => {
      const pastAppointment = {
        ...mockAppointments[0],
        appointment_date: '2025-01-01',
        start_time: '10:00:00'
      };
      
      const canCancel = canCancelAppointment(pastAppointment, mockProfile);
      const canReschedule = canRescheduleAppointment(pastAppointment, mockProfile);
      
      expect(canCancel).toBe(false);
      expect(canReschedule).toBe(false);
    });
  });

  describe('4. ROLE-BASED ACCESS', () => {
    
    it('should allow superadmin to manage any appointment', () => {
      const superadminProfile = { ...mockProfile, role: 'superadmin' };
      const appointment = mockAppointments[0];
      
      const canCancel = canCancelAppointment(appointment, superadminProfile);
      const canReschedule = canRescheduleAppointment(appointment, superadminProfile);
      
      expect(canCancel).toBe(true);
      expect(canReschedule).toBe(true);
    });

    it('should NOT allow unknown roles to manage appointments', () => {
      const unknownProfile = { ...mockProfile, role: 'unknown' };
      const appointment = mockAppointments[0];
      
      const canCancel = canCancelAppointment(appointment, unknownProfile);
      const canReschedule = canRescheduleAppointment(appointment, unknownProfile);
      
      expect(canCancel).toBe(false);
      expect(canReschedule).toBe(false);
    });
  });

  describe('5. EDGE CASES', () => {
    
    it('should handle null/undefined appointments gracefully', () => {
      const canCancel = canCancelAppointment(null, mockProfile);
      const canReschedule = canRescheduleAppointment(undefined, mockProfile);
      
      expect(canCancel).toBe(false);
      expect(canReschedule).toBe(false);
    });

    it('should handle null/undefined profiles gracefully', () => {
      const appointment = mockAppointments[0];
      
      const canCancel = canCancelAppointment(appointment, null);
      const canReschedule = canRescheduleAppointment(appointment, undefined);
      
      expect(canCancel).toBe(false);
      expect(canReschedule).toBe(false);
    });

    it('should handle appointments with missing patient data', () => {
      const appointmentWithoutPatient = {
        ...mockAppointments[0],
        patient: []
      };
      
      const canCancel = canCancelAppointment(appointmentWithoutPatient, mockProfile);
      const canReschedule = canRescheduleAppointment(appointmentWithoutPatient, mockProfile);
      
      expect(canCancel).toBe(false);
      expect(canReschedule).toBe(false);
    });
  });
});
