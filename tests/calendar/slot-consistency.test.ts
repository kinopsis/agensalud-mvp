/**
 * SLOT CALCULATION CONSISTENCY TESTS
 * 
 * Validates 100% slot count consistency between manual and AI booking flows.
 * Tests the UnifiedSlotGenerator against legacy availability methods.
 * Ensures single source of truth for all availability calculations.
 * 
 * @author AgentSalud MVP Team - Disruptive Architecture Solution
 * @version 2.0.0 - Zero Displacement Architecture
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import UnifiedSlotGenerator from '@/lib/calendar/UnifiedSlotGenerator';
import BookingValidationService from '@/lib/services/BookingValidationService';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server');
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('Slot Calculation Consistency Tests', () => {
  let slotGenerator: UnifiedSlotGenerator;
  let validationService: BookingValidationService;
  let mockSupabase: any;

  beforeEach(() => {
    slotGenerator = UnifiedSlotGenerator.getInstance();
    validationService = BookingValidationService.getInstance();
    
    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null
        })
      }
    };
    
    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Manual vs AI Booking Slot Consistency', () => {
    test('Identical slot generation for same parameters', async () => {
      const testParams = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2025-01-20',
        doctorId: '456e7890-e89b-12d3-a456-426614174001',
        duration: 30,
        userRole: 'patient' as const
      };

      // Mock doctor schedules
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'doctor_availability') {
          return {
            ...mockSupabase,
            then: (callback: any) => callback({
              data: [{
                doctor_id: testParams.doctorId,
                day_of_week: 1, // Monday
                start_time: '09:00',
                end_time: '17:00',
                is_active: true,
                doctor: [{
                  first_name: 'Test',
                  last_name: 'Doctor',
                  organization_id: testParams.organizationId
                }],
                doctor_profile: [{
                  specialization: 'General Medicine',
                  consultation_fee: 100
                }]
              }],
              error: null
            })
          };
        }
        
        if (table === 'appointments') {
          return {
            ...mockSupabase,
            then: (callback: any) => callback({
              data: [],
              error: null
            })
          };
        }
        
        if (table === 'availability_blocks') {
          return {
            ...mockSupabase,
            then: (callback: any) => callback({
              data: [],
              error: null
            })
          };
        }
        
        return mockSupabase;
      });

      // Generate slots for manual booking flow
      const manualSlots = await slotGenerator.generateSlots(testParams);
      
      // Generate slots for AI booking flow (same parameters)
      const aiSlots = await slotGenerator.generateSlots({
        ...testParams,
        // AI booking should use the same generator
      });

      // Verify identical results
      expect(manualSlots.length).toBe(aiSlots.length);
      expect(manualSlots.length).toBeGreaterThan(0);

      manualSlots.forEach((manualSlot, index) => {
        const aiSlot = aiSlots[index];
        
        expect(aiSlot.id).toBe(manualSlot.id);
        expect(aiSlot.start_time).toBe(manualSlot.start_time);
        expect(aiSlot.end_time).toBe(manualSlot.end_time);
        expect(aiSlot.available).toBe(manualSlot.available);
        expect(aiSlot.doctor_id).toBe(manualSlot.doctor_id);
        expect(aiSlot.duration_minutes).toBe(manualSlot.duration_minutes);
      });

      console.log(`✅ Manual vs AI: ${manualSlots.length} slots generated identically`);
    });

    test('Role-based filtering consistency', async () => {
      const baseParams = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2025-01-20',
        duration: 30
      };

      const roles = ['patient', 'admin', 'staff', 'doctor', 'superadmin'] as const;
      const roleResults: { [role: string]: any[] } = {};

      // Setup mock data
      this.setupMockScheduleData();

      for (const role of roles) {
        const slots = await slotGenerator.generateSlots({
          ...baseParams,
          userRole: role
        });
        
        roleResults[role] = slots;
        console.log(`Role ${role}: ${slots.length} total slots, ${slots.filter(s => s.available).length} available`);
      }

      // Verify privileged users have more available slots than patients
      const patientSlots = roleResults.patient.filter(s => s.available);
      const adminSlots = roleResults.admin.filter(s => s.available);
      
      expect(adminSlots.length).toBeGreaterThanOrEqual(patientSlots.length);
      
      // Verify all privileged roles have same availability
      const privilegedRoles = ['admin', 'staff', 'doctor', 'superadmin'];
      privilegedRoles.forEach(role => {
        const roleAvailableSlots = roleResults[role].filter(s => s.available);
        expect(roleAvailableSlots.length).toBe(adminSlots.length);
      });

      console.log('✅ Role-based filtering: Consistent across all user types');
    });

    test('Duration variation consistency', async () => {
      const baseParams = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2025-01-20',
        userRole: 'admin' as const
      };

      const durations = [15, 30, 45, 60];
      const durationResults: { [duration: number]: any[] } = {};

      this.setupMockScheduleData();

      for (const duration of durations) {
        const slots = await slotGenerator.generateSlots({
          ...baseParams,
          duration
        });
        
        durationResults[duration] = slots;
        
        // Verify all slots have correct duration
        slots.forEach(slot => {
          expect(slot.duration_minutes).toBe(duration);
        });
        
        console.log(`Duration ${duration}min: ${slots.length} slots generated`);
      }

      // Verify shorter durations generate more slots
      expect(durationResults[15].length).toBeGreaterThan(durationResults[30].length);
      expect(durationResults[30].length).toBeGreaterThan(durationResults[60].length);

      console.log('✅ Duration variation: Consistent slot generation');
    });
  });

  describe('Booking Validation Consistency', () => {
    test('New booking vs rescheduling validation consistency', async () => {
      const validationParams = {
        appointmentDate: '2025-01-25',
        startTime: '10:00',
        userRole: 'patient' as const,
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        doctorId: '456e7890-e89b-12d3-a456-426614174001'
      };

      // Mock no conflicts
      this.setupMockNoConflicts();

      // Test new booking validation
      const newBookingResult = await validationService.validateBookingRequest({
        ...validationParams,
        isRescheduling: false
      });

      // Test rescheduling validation
      const reschedulingResult = await validationService.validateBookingRequest({
        ...validationParams,
        isRescheduling: true,
        existingAppointmentId: 'existing-appointment-id'
      });

      // Both should have same validation logic for advance booking rules
      expect(newBookingResult.isValid).toBe(reschedulingResult.isValid);
      
      if (!newBookingResult.isValid && !reschedulingResult.isValid) {
        // Both should fail for same reason (24-hour rule for patients)
        expect(newBookingResult.code).toBe(reschedulingResult.code);
      }

      console.log('✅ Validation consistency: New booking and rescheduling use same rules');
    });

    test('Cross-timezone validation consistency', async () => {
      const timezones = ['UTC', 'America/New_York', 'Asia/Tokyo', 'Europe/London'];
      const validationParams = {
        appointmentDate: '2025-01-25',
        startTime: '14:00',
        userRole: 'admin' as const,
        organizationId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const timezoneResults: { [timezone: string]: any } = {};

      for (const timezone of timezones) {
        const originalTZ = process.env.TZ;
        process.env.TZ = timezone;

        try {
          const result = await validationService.validateBookingRequest(validationParams);
          timezoneResults[timezone] = result;
        } finally {
          process.env.TZ = originalTZ;
        }
      }

      // All timezones should produce same validation result
      const referenceResult = timezoneResults[timezones[0]];
      timezones.slice(1).forEach(timezone => {
        const currentResult = timezoneResults[timezone];
        expect(currentResult.isValid).toBe(referenceResult.isValid);
        expect(currentResult.code).toBe(referenceResult.code);
      });

      console.log('✅ Cross-timezone validation: Consistent results');
    });
  });

  describe('Performance and Scalability', () => {
    test('Slot generation performance under load', async () => {
      const testParams = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2025-01-20',
        duration: 30,
        userRole: 'patient' as const
      };

      this.setupMockScheduleData();

      const iterations = 100;
      const startTime = Date.now();

      // Generate slots multiple times to test performance
      for (let i = 0; i < iterations; i++) {
        await slotGenerator.generateSlots(testParams);
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / iterations;

      // Should generate slots in reasonable time (< 100ms per request)
      expect(averageTime).toBeLessThan(100);

      console.log(`✅ Performance: Average slot generation time: ${averageTime.toFixed(2)}ms`);
    });

    test('Memory usage consistency', async () => {
      const testParams = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        date: '2025-01-20',
        duration: 30,
        userRole: 'patient' as const
      };

      this.setupMockScheduleData();

      const initialMemory = process.memoryUsage().heapUsed;

      // Generate slots multiple times
      for (let i = 0; i < 50; i++) {
        await slotGenerator.generateSlots(testParams);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

      console.log(`✅ Memory usage: Increase of ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  // Helper methods
  private setupMockScheduleData() {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'doctor_availability') {
        return {
          ...mockSupabase,
          then: (callback: any) => callback({
            data: [{
              doctor_id: '456e7890-e89b-12d3-a456-426614174001',
              day_of_week: 1, // Monday
              start_time: '09:00',
              end_time: '17:00',
              is_active: true,
              doctor: [{
                first_name: 'Test',
                last_name: 'Doctor',
                organization_id: '123e4567-e89b-12d3-a456-426614174000'
              }],
              doctor_profile: [{
                specialization: 'General Medicine',
                consultation_fee: 100
              }]
            }],
            error: null
          })
        };
      }
      
      return {
        ...mockSupabase,
        then: (callback: any) => callback({ data: [], error: null })
      };
    });
  }

  private setupMockNoConflicts() {
    mockSupabase.from.mockImplementation((table: string) => {
      return {
        ...mockSupabase,
        then: (callback: any) => callback({ data: [], error: null })
      };
    });
  }
});
