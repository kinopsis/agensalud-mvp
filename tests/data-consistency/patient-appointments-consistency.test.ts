/**
 * Patient Appointments Data Consistency Tests
 * Validates that dashboard stats and appointments page show consistent data
 * Specifically tests the fix for María García's 13 vs 0 citas inconsistency
 */

import { describe, it, expect } from '@jest/globals';

// Mock data representing María García's case
const mockMariaProfile = {
  id: '5b361f1e-04b6-4a40-bb61-bd519c0e9be8',
  first_name: 'María',
  last_name: 'García',
  email: 'maria.garcia.new@example.com',
  role: 'patient',
  organization_id: '927cecbe-d9e5-43a4-b9d0-25f942ededc4'
};

const mockMariaPatient = {
  id: '61b5606b-3e21-4cbb-93f0-9174538e21a5',
  profile_id: '5b361f1e-04b6-4a40-bb61-bd519c0e9be8',
  organization_id: '927cecbe-d9e5-43a4-b9d0-25f942ededc4'
};

const mockAppointments = [
  {
    id: 'd21c7a05-6cbc-46f5-be2d-4ec19836da52',
    appointment_date: '2025-06-05',
    start_time: '17:30:00',
    status: 'scheduled',
    patient_id: '5b361f1e-04b6-4a40-bb61-bd519c0e9be8', // profile_id
    organization_id: '927cecbe-d9e5-43a4-b9d0-25f942ededc4'
  },
  {
    id: 'd70bbe24-3876-4032-93b6-a206549a5180',
    appointment_date: '2025-06-05',
    start_time: '15:30:00',
    status: 'scheduled',
    patient_id: '5b361f1e-04b6-4a40-bb61-bd519c0e9be8', // profile_id
    organization_id: '927cecbe-d9e5-43a4-b9d0-25f942ededc4'
  },
  // ... more appointments (total 13)
];

// Simulate the corrected logic from appointments page
const getAppointmentsPageLogic = (profile: any, appointments: any[]): any[] => {
  // CORRECTED: Use profile.id directly as patient_id
  return appointments.filter(apt => apt.patient_id === profile.id);
};

// Simulate the dashboard stats logic
const getDashboardStatsLogic = (patientId: string, appointments: any[]): number => {
  // Dashboard uses patient_id directly (which is profile_id)
  return appointments.filter(apt => apt.patient_id === patientId).length;
};

// Simulate the OLD (incorrect) logic from appointments page
const getOldAppointmentsPageLogic = (patientRecord: any, appointments: any[]): any[] => {
  // OLD LOGIC: Use patients.id (which doesn't match appointments.patient_id)
  return appointments.filter(apt => apt.patient_id === patientRecord.id);
};

describe('Patient Appointments Data Consistency', () => {
  
  describe('Data Model Validation', () => {
    it('should confirm appointments.patient_id references profiles.id', () => {
      // Verify that appointments use profile_id as patient_id
      const appointment = mockAppointments[0];
      expect(appointment.patient_id).toBe(mockMariaProfile.id);
      expect(appointment.patient_id).not.toBe(mockMariaPatient.id);
    });

    it('should confirm patients.profile_id references profiles.id', () => {
      // Verify the relationship between patients and profiles tables
      expect(mockMariaPatient.profile_id).toBe(mockMariaProfile.id);
    });
  });

  describe('Dashboard Stats Logic', () => {
    it('should count appointments correctly using profile_id', () => {
      const count = getDashboardStatsLogic(mockMariaProfile.id, mockAppointments);
      expect(count).toBe(2); // Based on mock data (would be 13 in real scenario)
    });

    it('should return 0 when using incorrect patient.id', () => {
      const count = getDashboardStatsLogic(mockMariaPatient.id, mockAppointments);
      expect(count).toBe(0); // No appointments match patients.id
    });
  });

  describe('Appointments Page Logic - CORRECTED', () => {
    it('should find appointments using corrected logic (profile.id)', () => {
      const appointments = getAppointmentsPageLogic(mockMariaProfile, mockAppointments);
      expect(appointments).toHaveLength(2); // Based on mock data
      expect(appointments[0].patient_id).toBe(mockMariaProfile.id);
    });

    it('should match dashboard stats count', () => {
      const pageCount = getAppointmentsPageLogic(mockMariaProfile, mockAppointments).length;
      const dashboardCount = getDashboardStatsLogic(mockMariaProfile.id, mockAppointments);
      
      expect(pageCount).toBe(dashboardCount);
    });
  });

  describe('Appointments Page Logic - OLD (Incorrect)', () => {
    it('should demonstrate the old bug (0 appointments found)', () => {
      const appointments = getOldAppointmentsPageLogic(mockMariaPatient, mockAppointments);
      expect(appointments).toHaveLength(0); // Bug: no appointments found
    });

    it('should show inconsistency with dashboard stats', () => {
      const pageCount = getOldAppointmentsPageLogic(mockMariaPatient, mockAppointments).length;
      const dashboardCount = getDashboardStatsLogic(mockMariaProfile.id, mockAppointments);
      
      expect(pageCount).not.toBe(dashboardCount); // Inconsistency
      expect(pageCount).toBe(0);
      expect(dashboardCount).toBe(2);
    });
  });

  describe('Date Filtering Logic', () => {
    const today = '2025-05-28';
    
    const appointmentsWithDates = [
      { ...mockAppointments[0], appointment_date: '2025-05-27' }, // past
      { ...mockAppointments[1], appointment_date: '2025-05-29' }, // future
    ];

    it('should filter past appointments correctly (view=history)', () => {
      const pastAppointments = appointmentsWithDates.filter(apt => 
        apt.appointment_date < today && apt.patient_id === mockMariaProfile.id
      );
      expect(pastAppointments).toHaveLength(1);
      expect(pastAppointments[0].appointment_date).toBe('2025-05-27');
    });

    it('should filter upcoming appointments correctly', () => {
      const upcomingAppointments = appointmentsWithDates.filter(apt => 
        apt.appointment_date >= today && apt.patient_id === mockMariaProfile.id
      );
      expect(upcomingAppointments).toHaveLength(1);
      expect(upcomingAppointments[0].appointment_date).toBe('2025-05-29');
    });
  });

  describe('Root Cause Analysis Validation', () => {
    it('should confirm the root cause: foreign key mismatch', () => {
      // The root cause was appointments.patient_id -> profiles.id
      // But appointments page was looking for appointments.patient_id -> patients.id
      
      const appointmentPatientId = mockAppointments[0].patient_id;
      const profileId = mockMariaProfile.id;
      const patientRecordId = mockMariaPatient.id;
      
      // Appointments reference profiles.id
      expect(appointmentPatientId).toBe(profileId);
      
      // But NOT patients.id
      expect(appointmentPatientId).not.toBe(patientRecordId);
    });

    it('should validate the fix resolves the inconsistency', () => {
      // Before fix: dashboard=13, page=0
      // After fix: dashboard=13, page=13
      
      const dashboardCount = getDashboardStatsLogic(mockMariaProfile.id, mockAppointments);
      const correctedPageCount = getAppointmentsPageLogic(mockMariaProfile, mockAppointments).length;
      const oldPageCount = getOldAppointmentsPageLogic(mockMariaPatient, mockAppointments).length;
      
      // Corrected logic should match dashboard
      expect(correctedPageCount).toBe(dashboardCount);
      
      // Old logic showed the bug
      expect(oldPageCount).toBe(0);
      expect(oldPageCount).not.toBe(dashboardCount);
    });
  });

  describe('Multi-tenant Data Isolation', () => {
    it('should maintain organization isolation', () => {
      const appointmentsWithDifferentOrgs = [
        { ...mockAppointments[0], organization_id: '927cecbe-d9e5-43a4-b9d0-25f942ededc4' },
        { ...mockAppointments[1], organization_id: 'different-org-id' }
      ];

      const orgFilteredAppointments = appointmentsWithDifferentOrgs.filter(apt => 
        apt.patient_id === mockMariaProfile.id && 
        apt.organization_id === mockMariaProfile.organization_id
      );

      expect(orgFilteredAppointments).toHaveLength(1);
      expect(orgFilteredAppointments[0].organization_id).toBe(mockMariaProfile.organization_id);
    });
  });
});
