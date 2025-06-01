/**
 * Role-Based Booking Tests (MVP SIMPLIFIED)
 * Tests for 24-hour rule for patients and real-time booking for admin/staff
 * 
 * @description Comprehensive test suite for the simplified role-based booking system
 */

import BookingConfigService from '@/lib/services/BookingConfigService';
import { validateDateAvailabilityWithRole } from '@/lib/utils/dateValidation';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }))
}));

describe('Role-Based Booking System (MVP SIMPLIFIED)', () => {
  let service: BookingConfigService;
  const mockOrganizationId = 'test-org-123';

  beforeEach(() => {
    service = BookingConfigService.getInstance();
    service.clearCache();
    jest.clearAllMocks();
    
    // Mock current time to 2025-05-30 10:00 AM for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-05-30T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Standard Users (Patients) - 24-Hour Rule', () => {
    const userRole = 'patient';

    it('should block same-day appointments for patients', async () => {
      const result = await service.validateDateAvailabilityWithRole(
        mockOrganizationId,
        '2025-05-30', // Today
        ['09:00', '10:00', '11:00', '15:00', '16:00'],
        { userRole }
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('24 horas de anticipación');
      expect(result.userRole).toBe('patient');
      expect(result.appliedRule).toBe('standard');
      expect(result.hoursUntilValid).toBe(24);
    });

    it('should allow future day appointments for patients', async () => {
      const result = await service.validateDateAvailabilityWithRole(
        mockOrganizationId,
        '2025-05-31', // Tomorrow
        ['09:00', '10:00', '11:00', '15:00', '16:00'],
        { userRole }
      );

      expect(result.isValid).toBe(true);
      expect(result.userRole).toBe('patient');
      expect(result.appliedRule).toBe('standard');
      expect(result.validTimeSlots).toEqual(['09:00', '10:00', '11:00', '15:00', '16:00']);
    });

    it('should block past dates for patients', async () => {
      const result = await service.validateDateAvailabilityWithRole(
        mockOrganizationId,
        '2025-05-29', // Yesterday
        ['09:00', '10:00', '11:00'],
        { userRole }
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Fecha pasada');
      expect(result.userRole).toBe('patient');
      expect(result.appliedRule).toBe('standard');
    });
  });

  describe('Privileged Users (Admin/Staff) - Real-Time Booking', () => {
    const privilegedRoles = ['admin', 'staff', 'doctor', 'superadmin'];

    privilegedRoles.forEach(userRole => {
      describe(`${userRole} role`, () => {
        it('should allow same-day appointments with future time slots', async () => {
          const result = await service.validateDateAvailabilityWithRole(
            mockOrganizationId,
            '2025-05-30', // Today
            ['11:00', '12:00', '15:00', '16:00'], // Future slots (current time is 10:00)
            { userRole: userRole as any }
          );

          expect(result.isValid).toBe(true);
          expect(result.userRole).toBe(userRole);
          expect(result.appliedRule).toBe('privileged');
          expect(result.validTimeSlots).toEqual(['11:00', '12:00', '15:00', '16:00']);
        });

        it('should filter out past time slots for same-day appointments', async () => {
          const result = await service.validateDateAvailabilityWithRole(
            mockOrganizationId,
            '2025-05-30', // Today
            ['08:00', '09:00', '11:00', '15:00'], // Mix of past and future slots
            { userRole: userRole as any }
          );

          expect(result.isValid).toBe(true);
          expect(result.userRole).toBe(userRole);
          expect(result.appliedRule).toBe('privileged');
          expect(result.validTimeSlots).toEqual(['11:00', '15:00']); // Only future slots
        });

        it('should allow future day appointments', async () => {
          const result = await service.validateDateAvailabilityWithRole(
            mockOrganizationId,
            '2025-05-31', // Tomorrow
            ['08:00', '09:00', '10:00', '15:00'],
            { userRole: userRole as any }
          );

          expect(result.isValid).toBe(true);
          expect(result.userRole).toBe(userRole);
          expect(result.appliedRule).toBe('privileged');
          expect(result.validTimeSlots).toEqual(['08:00', '09:00', '10:00', '15:00']);
        });

        it('should block past dates', async () => {
          const result = await service.validateDateAvailabilityWithRole(
            mockOrganizationId,
            '2025-05-29', // Yesterday
            ['09:00', '10:00', '11:00'],
            { userRole: userRole as any }
          );

          expect(result.isValid).toBe(false);
          expect(result.reason).toContain('Fecha pasada');
          expect(result.userRole).toBe(userRole);
          expect(result.appliedRule).toBe('privileged');
        });
      });
    });
  });

  describe('Force Standard Rules for Privileged Users', () => {
    it('should apply standard rules to admin when useStandardRules is true', async () => {
      const result = await service.validateDateAvailabilityWithRole(
        mockOrganizationId,
        '2025-05-30', // Today
        ['11:00', '12:00', '15:00'],
        { 
          userRole: 'admin',
          useStandardRules: true // Force standard rules
        }
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('24 horas de anticipación');
      expect(result.userRole).toBe('admin');
      expect(result.appliedRule).toBe('standard');
    });

    it('should apply standard rules to staff when useStandardRules is true', async () => {
      const result = await service.validateDateAvailabilityWithRole(
        mockOrganizationId,
        '2025-05-30', // Today
        ['11:00', '12:00', '15:00'],
        { 
          userRole: 'staff',
          useStandardRules: true // Force standard rules
        }
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('24 horas de anticipación');
      expect(result.userRole).toBe('staff');
      expect(result.appliedRule).toBe('standard');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty time slots gracefully', async () => {
      const result = await service.validateDateAvailabilityWithRole(
        mockOrganizationId,
        '2025-05-31', // Tomorrow
        [], // No slots
        { userRole: 'patient' }
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('No hay horarios disponibles');
    });

    it('should handle malformed dates gracefully', async () => {
      const result = await service.validateDateAvailabilityWithRole(
        mockOrganizationId,
        'invalid-date',
        ['09:00', '10:00'],
        { userRole: 'patient' }
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Error validando');
    });

    it('should default to patient role when no role specified', async () => {
      const result = await service.validateDateAvailabilityWithRole(
        mockOrganizationId,
        '2025-05-30', // Today
        ['15:00', '16:00'],
        {} // No role specified
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('24 horas de anticipación');
      expect(result.appliedRule).toBe('standard');
    });
  });

  describe('Timezone Edge Cases', () => {
    it('should handle midnight transitions correctly', async () => {
      // Test at 11:30 PM
      jest.setSystemTime(new Date('2025-05-30T23:30:00.000Z'));

      const result = await service.validateDateAvailabilityWithRole(
        mockOrganizationId,
        '2025-05-31', // Next day
        ['08:00', '09:00', '10:00'],
        { userRole: 'patient' }
      );

      expect(result.isValid).toBe(true);
      expect(result.userRole).toBe('patient');
      expect(result.appliedRule).toBe('standard');
    });

    it('should handle privileged user booking near midnight', async () => {
      // Test at 11:30 PM
      jest.setSystemTime(new Date('2025-05-30T23:30:00.000Z'));

      const result = await service.validateDateAvailabilityWithRole(
        mockOrganizationId,
        '2025-05-30', // Same day
        ['23:45'], // 15 minutes from now
        { userRole: 'admin' }
      );

      expect(result.isValid).toBe(true);
      expect(result.userRole).toBe('admin');
      expect(result.appliedRule).toBe('privileged');
      expect(result.validTimeSlots).toEqual(['23:45']);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain legacy validation when no role is provided', async () => {
      const result = await validateDateAvailabilityWithRole(
        '2025-05-31', // Tomorrow
        [
          { date: '2025-05-31', time: '09:00', available: true },
          { date: '2025-05-31', time: '10:00', available: true }
        ]
        // No role specified - should default to patient
      );

      expect(result.isValid).toBe(true);
      expect(result.validTimeSlots).toEqual(['09:00', '10:00']);
    });

    it('should work without organization context', async () => {
      const result = await validateDateAvailabilityWithRole(
        '2025-05-30', // Today
        [
          { date: '2025-05-30', time: '15:00', available: true },
          { date: '2025-05-30', time: '16:00', available: true }
        ],
        'admin'
        // No organization ID
      );

      expect(result.isValid).toBe(true);
      expect(result.userRole).toBe('admin');
      expect(result.appliedRule).toBe('privileged');
    });
  });
});
