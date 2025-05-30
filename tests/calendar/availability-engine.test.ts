/**
 * Availability Engine Tests
 * Tests for the availability calculation system
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AvailabilityEngine } from '@/lib/calendar/availability-engine';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          neq: jest.fn(() => ({
            lte: jest.fn(() => ({
              gte: jest.fn(() => ({
                filter: jest.fn(() => ({
                  data: [],
                  error: null
                }))
              }))
            }))
          }))
        })),
        neq: jest.fn(() => ({
          data: [],
          error: null
        })),
        lte: jest.fn(() => ({
          gte: jest.fn(() => ({
            data: [],
            error: null
          }))
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            data: [],
            error: null
          }))
        })),
        data: [],
        error: null
      })),
      data: [],
      error: null
    }))
  }))
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}));

describe('AvailabilityEngine', () => {
  let engine: AvailabilityEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new AvailabilityEngine();
  });

  describe('calculateAvailability', () => {
    it('should calculate availability for a given date', async () => {
      // Mock doctor schedules
      const mockSchedules = [
        {
          doctor_id: 'doctor-1',
          day_of_week: 1, // Monday
          start_time: '09:00',
          end_time: '17:00',
          is_active: true,
          doctor: {
            first_name: 'María',
            last_name: 'García',
            organization_id: 'test-org-id'
          }
        }
      ];

      // Mock existing appointments
      const mockAppointments = [
        {
          doctor_id: 'doctor-1',
          start_time: '10:00',
          end_time: '10:30',
          status: 'confirmed'
        }
      ];

      // Mock availability blocks
      const mockBlocks: any[] = [];

      // Setup mocks
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'doctor_availability') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  data: mockSchedules,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'appointments') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  neq: jest.fn(() => ({
                    data: mockAppointments,
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        if (table === 'availability_blocks') {
          return {
            select: jest.fn(() => ({
              lte: jest.fn(() => ({
                gte: jest.fn(() => ({
                  data: mockBlocks,
                  error: null
                }))
              }))
            }))
          };
        }
        return mockSupabaseClient.from();
      });

      const result = await engine.calculateAvailability({
        organizationId: 'test-org-id',
        date: '2025-01-27', // Monday
        duration: 30
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Should have slots from 9:00 to 17:00 with 30-minute intervals
      const expectedSlots = (17 - 9) * 2; // 8 hours * 2 slots per hour
      expect(result.length).toBe(expectedSlots);

      // First slot should be 9:00
      expect(result[0].start_time).toBe('09:00');
      expect(result[0].end_time).toBe('09:30');
      expect(result[0].doctor_id).toBe('doctor-1');

      // 10:00 slot should be unavailable (booked)
      const bookedSlot = result.find(slot => slot.start_time === '10:00');
      expect(bookedSlot?.available).toBe(false);
      expect(bookedSlot?.reason).toBe('Ocupado');
    });

    it('should handle multiple doctors', async () => {
      const mockSchedules = [
        {
          doctor_id: 'doctor-1',
          day_of_week: 1,
          start_time: '09:00',
          end_time: '13:00',
          is_active: true,
          doctor: {
            first_name: 'María',
            last_name: 'García',
            organization_id: 'test-org-id'
          }
        },
        {
          doctor_id: 'doctor-2',
          day_of_week: 1,
          start_time: '14:00',
          end_time: '18:00',
          is_active: true,
          doctor: {
            first_name: 'Pedro',
            last_name: 'Martínez',
            organization_id: 'test-org-id'
          }
        }
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'doctor_availability') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  data: mockSchedules,
                  error: null
                }))
              }))
            }))
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                neq: jest.fn(() => ({
                  data: [],
                  error: null
                }))
              }))
            }))
          }))
        };
      });

      const result = await engine.calculateAvailability({
        organizationId: 'test-org-id',
        date: '2025-01-27',
        duration: 30
      });

      // Should have slots for both doctors
      const doctor1Slots = result.filter(slot => slot.doctor_id === 'doctor-1');
      const doctor2Slots = result.filter(slot => slot.doctor_id === 'doctor-2');

      expect(doctor1Slots.length).toBeGreaterThan(0);
      expect(doctor2Slots.length).toBeGreaterThan(0);

      // Doctor 1 should have morning slots
      expect(doctor1Slots[0].start_time).toBe('09:00');
      
      // Doctor 2 should have afternoon slots
      expect(doctor2Slots[0].start_time).toBe('14:00');
    });

    it('should handle availability blocks', async () => {
      const mockSchedules = [
        {
          doctor_id: 'doctor-1',
          day_of_week: 1,
          start_time: '09:00',
          end_time: '17:00',
          is_active: true,
          doctor: {
            first_name: 'María',
            last_name: 'García',
            organization_id: 'test-org-id'
          }
        }
      ];

      const mockBlocks = [
        {
          doctor_id: 'doctor-1',
          start_datetime: '2025-01-27T12:00:00',
          end_datetime: '2025-01-27T14:00:00',
          reason: 'Almuerzo',
          block_type: 'break',
          doctor: {
            organization_id: 'test-org-id'
          }
        }
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'doctor_availability') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  data: mockSchedules,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'availability_blocks') {
          return {
            select: jest.fn(() => ({
              lte: jest.fn(() => ({
                gte: jest.fn(() => ({
                  data: mockBlocks,
                  error: null
                }))
              }))
            }))
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                neq: jest.fn(() => ({
                  data: [],
                  error: null
                }))
              }))
            }))
          }))
        };
      });

      const result = await engine.calculateAvailability({
        organizationId: 'test-org-id',
        date: '2025-01-27',
        duration: 30
      });

      // Slots during lunch break should be unavailable
      const lunchSlots = result.filter(slot => 
        slot.start_time >= '12:00' && slot.start_time < '14:00'
      );

      lunchSlots.forEach(slot => {
        expect(slot.available).toBe(false);
        expect(slot.reason).toBe('Almuerzo');
      });
    });

    it('should filter by specific doctor', async () => {
      const mockSchedules = [
        {
          doctor_id: 'doctor-1',
          day_of_week: 1,
          start_time: '09:00',
          end_time: '17:00',
          is_active: true,
          doctor: {
            first_name: 'María',
            last_name: 'García',
            organization_id: 'test-org-id'
          }
        }
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'doctor_availability') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  data: mockSchedules,
                  error: null
                }))
              }))
            }))
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                neq: jest.fn(() => ({
                  data: [],
                  error: null
                }))
              }))
            }))
          }))
        };
      });

      const result = await engine.calculateAvailability({
        organizationId: 'test-org-id',
        date: '2025-01-27',
        doctorId: 'doctor-1',
        duration: 30
      });

      // All slots should be for the specified doctor
      result.forEach(slot => {
        expect(slot.doctor_id).toBe('doctor-1');
      });
    });

    it('should handle different slot durations', async () => {
      const mockSchedules = [
        {
          doctor_id: 'doctor-1',
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
          is_active: true,
          doctor: {
            first_name: 'María',
            last_name: 'García',
            organization_id: 'test-org-id'
          }
        }
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'doctor_availability') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  data: mockSchedules,
                  error: null
                }))
              }))
            }))
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                neq: jest.fn(() => ({
                  data: [],
                  error: null
                }))
              }))
            }))
          }))
        };
      });

      // Test 60-minute slots
      const result = await engine.calculateAvailability({
        organizationId: 'test-org-id',
        date: '2025-01-27',
        duration: 60
      });

      // Should have 2 slots: 9:00-10:00 and 10:00-11:00
      expect(result.length).toBe(2);
      expect(result[0].start_time).toBe('09:00');
      expect(result[0].end_time).toBe('10:00');
      expect(result[1].start_time).toBe('10:00');
      expect(result[1].end_time).toBe('11:00');
    });
  });

  describe('getAvailableSlots', () => {
    it('should return only available time slots', async () => {
      const mockSchedules = [
        {
          doctor_id: 'doctor-1',
          day_of_week: 1,
          start_time: '09:00',
          end_time: '12:00',
          is_active: true,
          doctor: {
            first_name: 'María',
            last_name: 'García',
            organization_id: 'test-org-id'
          }
        }
      ];

      const mockAppointments = [
        {
          doctor_id: 'doctor-1',
          start_time: '10:00',
          end_time: '10:30',
          status: 'confirmed'
        }
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'doctor_availability') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  data: mockSchedules,
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'appointments') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  neq: jest.fn(() => ({
                    data: mockAppointments,
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        return {
          select: jest.fn(() => ({
            lte: jest.fn(() => ({
              gte: jest.fn(() => ({
                data: [],
                error: null
              }))
            }))
          }))
        };
      });

      const result = await engine.getAvailableSlots(
        'test-org-id',
        'doctor-1',
        '2025-01-27',
        30
      );

      expect(Array.isArray(result)).toBe(true);
      
      // Should not include the booked 10:00 slot
      expect(result).not.toContain('10:00');
      
      // Should include available slots
      expect(result).toContain('09:00');
      expect(result).toContain('09:30');
      expect(result).toContain('10:30');
      expect(result).toContain('11:00');
      expect(result).toContain('11:30');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: null,
              error: new Error('Database error')
            }))
          }))
        }))
      }));

      await expect(engine.calculateAvailability({
        organizationId: 'test-org-id',
        date: '2025-01-27'
      })).rejects.toThrow('Failed to calculate availability');
    });

    it('should handle missing organization data', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      }));

      const result = await engine.calculateAvailability({
        organizationId: 'nonexistent-org',
        date: '2025-01-27'
      });

      expect(result).toEqual([]);
    });
  });
});
