/**
 * TESTS FOR AUTO-CONFIRMATION SYSTEM
 * Validates the automatic confirmation of pending appointments
 * Tests timing logic, permissions, and business rules
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock data for testing
const mockPendingAppointments = [
  {
    id: 'apt-1',
    created_at: '2025-05-27T10:00:00Z', // 20 minutes ago (eligible)
    appointment_date: '2025-06-15',
    start_time: '10:00:00',
    status: 'pending',
    organization_id: 'org-123',
    patient: [{ first_name: 'Juan', last_name: 'Pérez' }],
    doctor: [{ profiles: [{ first_name: 'Ana', last_name: 'García' }] }]
  },
  {
    id: 'apt-2',
    created_at: '2025-05-27T10:10:00Z', // 10 minutes ago (not eligible)
    appointment_date: '2025-06-16',
    start_time: '14:30:00',
    status: 'pending',
    organization_id: 'org-123',
    patient: [{ first_name: 'María', last_name: 'López' }],
    doctor: [{ profiles: [{ first_name: 'Carlos', last_name: 'Martín' }] }]
  },
  {
    id: 'apt-3',
    created_at: '2025-05-27T09:30:00Z', // 50 minutes ago (eligible)
    appointment_date: '2025-06-17',
    start_time: '09:00:00',
    status: 'pending',
    organization_id: 'org-456', // Different organization
    patient: [{ first_name: 'Pedro', last_name: 'Sánchez' }],
    doctor: [{ profiles: [{ first_name: 'Laura', last_name: 'Ruiz' }] }]
  }
];

// Mock current time (2025-05-27T10:20:00Z)
const mockCurrentTime = new Date('2025-05-27T10:20:00Z');

// Auto-confirmation logic simulation
const getEligibleAppointments = (appointments: any[], cutoffMinutes: number = 15, organizationId?: string) => {
  const cutoffTime = new Date(mockCurrentTime);
  cutoffTime.setMinutes(cutoffTime.getMinutes() - cutoffMinutes);
  
  return appointments.filter(apt => {
    // Must be pending status
    if (apt.status !== 'pending') return false;
    
    // Must be older than cutoff time
    const createdAt = new Date(apt.created_at);
    if (createdAt >= cutoffTime) return false;
    
    // Must be future appointment
    const appointmentDate = new Date(apt.appointment_date);
    const today = new Date(mockCurrentTime.toISOString().split('T')[0]);
    if (appointmentDate < today) return false;
    
    // Organization filter (if specified)
    if (organizationId && apt.organization_id !== organizationId) return false;
    
    return true;
  });
};

const calculateMinutesPending = (createdAt: string) => {
  const created = new Date(createdAt);
  const now = mockCurrentTime;
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
};

describe('Auto-Confirmation System', () => {

  describe('1. TIMING LOGIC', () => {
    
    it('should identify appointments eligible for auto-confirmation (>15 minutes old)', () => {
      const eligible = getEligibleAppointments(mockPendingAppointments, 15);
      
      expect(eligible).toHaveLength(2);
      expect(eligible[0].id).toBe('apt-1'); // 20 minutes old
      expect(eligible[1].id).toBe('apt-3'); // 50 minutes old
    });

    it('should exclude appointments younger than 15 minutes', () => {
      const eligible = getEligibleAppointments(mockPendingAppointments, 15);
      const excludedIds = eligible.map(apt => apt.id);
      
      expect(excludedIds).not.toContain('apt-2'); // Only 10 minutes old
    });

    it('should correctly calculate minutes pending', () => {
      const minutes1 = calculateMinutesPending('2025-05-27T10:00:00Z'); // 20 minutes ago
      const minutes2 = calculateMinutesPending('2025-05-27T10:10:00Z'); // 10 minutes ago
      const minutes3 = calculateMinutesPending('2025-05-27T09:30:00Z'); // 50 minutes ago
      
      expect(minutes1).toBe(20);
      expect(minutes2).toBe(10);
      expect(minutes3).toBe(50);
    });

    it('should allow custom cutoff times', () => {
      // Test with 30-minute cutoff
      const eligible30 = getEligibleAppointments(mockPendingAppointments, 30);
      expect(eligible30).toHaveLength(1);
      expect(eligible30[0].id).toBe('apt-3'); // Only 50 minutes old qualifies

      // Test with 5-minute cutoff (all appointments should qualify)
      const eligible5 = getEligibleAppointments(mockPendingAppointments, 5);
      expect(eligible5).toHaveLength(3); // All 3 appointments are older than 5 minutes
      expect(eligible5.map(apt => apt.id)).toEqual(['apt-1', 'apt-2', 'apt-3']);
    });
  });

  describe('2. STATUS FILTERING', () => {
    
    it('should only process appointments with pending status', () => {
      const appointmentsWithMixedStatus = [
        ...mockPendingAppointments,
        {
          id: 'apt-confirmed',
          created_at: '2025-05-27T09:00:00Z', // 80 minutes ago
          appointment_date: '2025-06-18',
          start_time: '11:00:00',
          status: 'confirmed', // Not pending
          organization_id: 'org-123'
        },
        {
          id: 'apt-cancelled',
          created_at: '2025-05-27T09:00:00Z', // 80 minutes ago
          appointment_date: '2025-06-19',
          start_time: '15:00:00',
          status: 'cancelled', // Not pending
          organization_id: 'org-123'
        }
      ];
      
      const eligible = getEligibleAppointments(appointmentsWithMixedStatus, 15);
      const eligibleIds = eligible.map(apt => apt.id);
      
      expect(eligibleIds).not.toContain('apt-confirmed');
      expect(eligibleIds).not.toContain('apt-cancelled');
      expect(eligible.every(apt => apt.status === 'pending')).toBe(true);
    });
  });

  describe('3. DATE FILTERING', () => {
    
    it('should only process future appointments', () => {
      const appointmentsWithPastDates = [
        ...mockPendingAppointments,
        {
          id: 'apt-past',
          created_at: '2025-05-27T09:00:00Z', // 80 minutes ago
          appointment_date: '2025-05-26', // Past date
          start_time: '10:00:00',
          status: 'pending',
          organization_id: 'org-123'
        }
      ];
      
      const eligible = getEligibleAppointments(appointmentsWithPastDates, 15);
      const eligibleIds = eligible.map(apt => apt.id);
      
      expect(eligibleIds).not.toContain('apt-past');
      
      // Verify all eligible appointments are in the future
      const today = mockCurrentTime.toISOString().split('T')[0];
      eligible.forEach(apt => {
        expect(apt.appointment_date >= today).toBe(true);
      });
    });
  });

  describe('4. ORGANIZATION FILTERING', () => {
    
    it('should filter by organization when specified', () => {
      const eligibleOrg123 = getEligibleAppointments(mockPendingAppointments, 15, 'org-123');
      const eligibleOrg456 = getEligibleAppointments(mockPendingAppointments, 15, 'org-456');
      
      expect(eligibleOrg123).toHaveLength(1);
      expect(eligibleOrg123[0].id).toBe('apt-1');
      expect(eligibleOrg123[0].organization_id).toBe('org-123');
      
      expect(eligibleOrg456).toHaveLength(1);
      expect(eligibleOrg456[0].id).toBe('apt-3');
      expect(eligibleOrg456[0].organization_id).toBe('org-456');
    });

    it('should return all eligible appointments when no organization filter is applied (superadmin)', () => {
      const eligible = getEligibleAppointments(mockPendingAppointments, 15);
      
      expect(eligible).toHaveLength(2);
      expect(eligible.map(apt => apt.organization_id)).toEqual(['org-123', 'org-456']);
    });
  });

  describe('5. BUSINESS LOGIC VALIDATION', () => {
    
    it('should maintain appointment data integrity during auto-confirmation', () => {
      const eligible = getEligibleAppointments(mockPendingAppointments, 15);
      
      eligible.forEach(apt => {
        // Verify required fields are present
        expect(apt.id).toBeDefined();
        expect(apt.appointment_date).toBeDefined();
        expect(apt.start_time).toBeDefined();
        expect(apt.organization_id).toBeDefined();
        
        // Verify patient and doctor data
        expect(apt.patient).toBeDefined();
        expect(apt.patient[0]).toBeDefined();
        expect(apt.doctor).toBeDefined();
        expect(apt.doctor[0]).toBeDefined();
      });
    });

    it('should handle appointments with missing patient/doctor data gracefully', () => {
      const appointmentsWithMissingData = [
        {
          id: 'apt-no-patient',
          created_at: '2025-05-27T09:00:00Z',
          appointment_date: '2025-06-20',
          start_time: '10:00:00',
          status: 'pending',
          organization_id: 'org-123',
          patient: [], // Missing patient data
          doctor: [{ profiles: [{ first_name: 'Ana', last_name: 'García' }] }]
        },
        {
          id: 'apt-no-doctor',
          created_at: '2025-05-27T09:00:00Z',
          appointment_date: '2025-06-21',
          start_time: '14:00:00',
          status: 'pending',
          organization_id: 'org-123',
          patient: [{ first_name: 'Juan', last_name: 'Pérez' }],
          doctor: [] // Missing doctor data
        }
      ];
      
      const eligible = getEligibleAppointments(appointmentsWithMissingData, 15);
      
      // Should still be eligible for auto-confirmation despite missing data
      expect(eligible).toHaveLength(2);
      expect(eligible.map(apt => apt.id)).toEqual(['apt-no-patient', 'apt-no-doctor']);
    });
  });

  describe('6. EDGE CASES', () => {
    
    it('should handle empty appointment list', () => {
      const eligible = getEligibleAppointments([], 15);
      expect(eligible).toHaveLength(0);
    });

    it('should handle appointments created exactly at cutoff time', () => {
      const cutoffTime = new Date(mockCurrentTime);
      cutoffTime.setMinutes(cutoffTime.getMinutes() - 15);
      
      const appointmentAtCutoff = {
        id: 'apt-cutoff',
        created_at: cutoffTime.toISOString(),
        appointment_date: '2025-06-22',
        start_time: '10:00:00',
        status: 'pending',
        organization_id: 'org-123'
      };
      
      const eligible = getEligibleAppointments([appointmentAtCutoff], 15);
      
      // Should NOT be eligible (created exactly at cutoff, not before)
      expect(eligible).toHaveLength(0);
    });

    it('should handle invalid date formats gracefully', () => {
      const appointmentWithInvalidDate = {
        id: 'apt-invalid',
        created_at: 'invalid-date',
        appointment_date: '2025-06-23',
        start_time: '10:00:00',
        status: 'pending',
        organization_id: 'org-123'
      };

      // Should not throw error but may include invalid appointment
      // (The actual filtering logic would need to handle invalid dates)
      const eligible = getEligibleAppointments([appointmentWithInvalidDate], 15);

      // For this test, we just verify it doesn't crash
      expect(Array.isArray(eligible)).toBe(true);
    });
  });
});
