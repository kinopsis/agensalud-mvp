/**
 * Booking Availability Integration Tests
 * End-to-end tests for the enhanced availability system
 * 
 * @description Tests the complete flow from tenant configuration
 * to availability calculation and UI validation
 */

import { AvailabilityEngine } from '@/lib/calendar/availability-engine';
import { validateDateAvailabilityEnhanced } from '@/lib/utils/dateValidation';
import BookingConfigService from '@/lib/services/BookingConfigService';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          neq: jest.fn(() => ({
            eq: jest.fn()
          }))
        })),
        in: jest.fn(() => ({
          eq: jest.fn()
        })),
        lte: jest.fn(() => ({
          gte: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }))
}));

describe('Booking Availability Integration', () => {
  let availabilityEngine: AvailabilityEngine;
  let bookingService: BookingConfigService;
  const mockOrganizationId = 'test-org-123';
  const mockDoctorId = 'doctor-456';

  beforeEach(() => {
    availabilityEngine = new AvailabilityEngine();
    bookingService = BookingConfigService.getInstance();
    bookingService.clearCache();
    jest.clearAllMocks();
    
    // Mock current time to 2025-05-30 10:00 AM
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-05-30T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('End-to-End Availability Calculation', () => {
    it('should apply tenant configuration to availability calculation', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();

      // Mock tenant settings with 6-hour advance booking
      mockSupabase.from().select().eq().single.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return Promise.resolve({
            data: {
              booking_settings: {
                advance_booking_hours: 6, // 6 hours instead of default 4
                max_advance_booking_days: 90,
                allow_same_day_booking: true,
                booking_window_start: '09:00',
                booking_window_end: '17:00',
                weekend_booking_enabled: false,
                auto_confirmation: true,
                cancellation_deadline_hours: 2,
                reschedule_deadline_hours: 2
              }
            },
            error: null
          });
        }
        return Promise.resolve({ data: [], error: null });
      });

      // Mock doctor schedules
      mockSupabase.from().select().eq().mockImplementation(() => ({
        data: [{
          doctor_id: mockDoctorId,
          day_of_week: 5, // Friday
          start_time: '09:00',
          end_time: '17:00',
          is_active: true,
          doctor: [{
            first_name: 'Dr. Test',
            last_name: 'Doctor',
            organization_id: mockOrganizationId
          }]
        }],
        error: null
      }));

      // Mock no existing appointments
      mockSupabase.from().select().eq().neq().eq.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock no availability blocks
      mockSupabase.from().select().lte().gte.mockResolvedValue({
        data: [],
        error: null
      });

      const availability = await availabilityEngine.calculateAvailability({
        organizationId: mockOrganizationId,
        date: '2025-05-30', // Today (Friday)
        doctorId: mockDoctorId,
        useConfigurableRules: true
      });

      // With 6-hour advance rule and current time 10:00 AM,
      // only slots from 4:00 PM onwards should be available
      const availableSlots = availability.filter(slot => slot.available);
      const availableTimes = availableSlots.map(slot => slot.start_time);

      expect(availableTimes).not.toContain('10:00');
      expect(availableTimes).not.toContain('14:00');
      expect(availableTimes).toContain('16:00');
      expect(availableTimes).toContain('16:30');
    });

    it('should respect weekend booking policy', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();

      // Mock tenant settings with weekend booking disabled
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          booking_settings: {
            advance_booking_hours: 4,
            max_advance_booking_days: 90,
            allow_same_day_booking: true,
            booking_window_start: '08:00',
            booking_window_end: '18:00',
            weekend_booking_enabled: false,
            auto_confirmation: true,
            cancellation_deadline_hours: 2,
            reschedule_deadline_hours: 2
          }
        },
        error: null
      });

      const availability = await availabilityEngine.calculateAvailability({
        organizationId: mockOrganizationId,
        date: '2025-06-01', // Sunday
        doctorId: mockDoctorId,
        useConfigurableRules: true
      });

      // Should return empty array for weekend when disabled
      expect(availability).toEqual([]);
    });

    it('should allow weekend booking when enabled', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();

      // Mock tenant settings with weekend booking enabled
      mockSupabase.from().select().eq().single.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return Promise.resolve({
            data: {
              booking_settings: {
                advance_booking_hours: 4,
                max_advance_booking_days: 90,
                allow_same_day_booking: true,
                booking_window_start: '08:00',
                booking_window_end: '18:00',
                weekend_booking_enabled: true,
                auto_confirmation: true,
                cancellation_deadline_hours: 2,
                reschedule_deadline_hours: 2
              }
            },
            error: null
          });
        }
        return Promise.resolve({ data: [], error: null });
      });

      // Mock doctor schedules for Sunday
      mockSupabase.from().select().eq().mockImplementation(() => ({
        data: [{
          doctor_id: mockDoctorId,
          day_of_week: 0, // Sunday
          start_time: '10:00',
          end_time: '16:00',
          is_active: true,
          doctor: [{
            first_name: 'Dr. Test',
            last_name: 'Doctor',
            organization_id: mockOrganizationId
          }]
        }],
        error: null
      }));

      const availability = await availabilityEngine.calculateAvailability({
        organizationId: mockOrganizationId,
        date: '2025-06-01', // Sunday
        doctorId: mockDoctorId,
        useConfigurableRules: true
      });

      // Should have available slots for Sunday
      expect(availability.length).toBeGreaterThan(0);
      const availableSlots = availability.filter(slot => slot.available);
      expect(availableSlots.length).toBeGreaterThan(0);
    });
  });

  describe('Date Validation Integration', () => {
    it('should integrate with enhanced date validation', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();

      // Mock tenant settings
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          booking_settings: {
            advance_booking_hours: 4,
            max_advance_booking_days: 30, // Limited to 30 days
            allow_same_day_booking: false, // Same day disabled
            booking_window_start: '08:00',
            booking_window_end: '18:00',
            weekend_booking_enabled: false,
            auto_confirmation: true,
            cancellation_deadline_hours: 2,
            reschedule_deadline_hours: 2
          }
        },
        error: null
      });

      // Test same day booking (should be rejected)
      const sameDayResult = await validateDateAvailabilityEnhanced(
        '2025-05-30', // Today
        [{ date: '2025-05-30', time: '15:00', available: true }],
        { organizationId: mockOrganizationId }
      );

      expect(sameDayResult.isValid).toBe(false);
      expect(sameDayResult.reason).toContain('mismo día no están permitidas');

      // Test date beyond max advance booking (should be rejected)
      const farFutureResult = await validateDateAvailabilityEnhanced(
        '2025-07-30', // More than 30 days
        [{ date: '2025-07-30', time: '10:00', available: true }],
        { organizationId: mockOrganizationId }
      );

      expect(farFutureResult.isValid).toBe(false);
      expect(farFutureResult.reason).toContain('más de 30 días');

      // Test valid future date (should be accepted)
      const validFutureResult = await validateDateAvailabilityEnhanced(
        '2025-06-15', // Within 30 days, not weekend
        [{ date: '2025-06-15', time: '10:00', available: true }],
        { organizationId: mockOrganizationId }
      );

      expect(validFutureResult.isValid).toBe(true);
    });
  });

  describe('Booking Window Validation', () => {
    it('should filter slots outside booking window', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();

      // Mock tenant settings with limited booking window
      mockSupabase.from().select().eq().single.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return Promise.resolve({
            data: {
              booking_settings: {
                advance_booking_hours: 4,
                max_advance_booking_days: 90,
                allow_same_day_booking: true,
                booking_window_start: '10:00', // Limited window
                booking_window_end: '14:00',   // 10 AM to 2 PM only
                weekend_booking_enabled: true,
                auto_confirmation: true,
                cancellation_deadline_hours: 2,
                reschedule_deadline_hours: 2
              }
            },
            error: null
          });
        }
        return Promise.resolve({ data: [], error: null });
      });

      // Mock doctor schedules with full day availability
      mockSupabase.from().select().eq().mockImplementation(() => ({
        data: [{
          doctor_id: mockDoctorId,
          day_of_week: 1, // Monday
          start_time: '08:00',
          end_time: '18:00',
          is_active: true,
          doctor: [{
            first_name: 'Dr. Test',
            last_name: 'Doctor',
            organization_id: mockOrganizationId
          }]
        }],
        error: null
      }));

      const availability = await availabilityEngine.calculateAvailability({
        organizationId: mockOrganizationId,
        date: '2025-06-02', // Monday
        doctorId: mockDoctorId,
        useConfigurableRules: true
      });

      const availableSlots = availability.filter(slot => slot.available);
      const availableTimes = availableSlots.map(slot => slot.start_time);

      // Should only have slots within booking window (10:00-14:00)
      expect(availableTimes).not.toContain('08:00');
      expect(availableTimes).not.toContain('09:00');
      expect(availableTimes).toContain('10:00');
      expect(availableTimes).toContain('13:30');
      expect(availableTimes).not.toContain('14:00');
      expect(availableTimes).not.toContain('15:00');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should fallback to default rules when tenant config fails', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();

      // Mock database error for tenant settings
      mockSupabase.from().select().eq().single.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return Promise.resolve({
            data: null,
            error: { message: 'Database connection failed' }
          });
        }
        return Promise.resolve({ data: [], error: null });
      });

      // Should still work with default 4-hour rule
      const result = await validateDateAvailabilityEnhanced(
        '2025-05-30',
        [{ date: '2025-05-30', time: '15:00', available: true }],
        { organizationId: mockOrganizationId }
      );

      // Should use default 4-hour rule and allow the 15:00 slot (5 hours from 10:00)
      expect(result.isValid).toBe(true);
    });

    it('should handle malformed tenant configuration gracefully', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();

      // Mock malformed tenant settings
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          booking_settings: {
            advance_booking_hours: 'invalid', // Invalid type
            max_advance_booking_days: -1,     // Invalid value
            // Missing required fields
          }
        },
        error: null
      });

      // Should fallback to default behavior
      const result = await validateDateAvailabilityEnhanced(
        '2025-05-31',
        [{ date: '2025-05-31', time: '10:00', available: true }],
        { organizationId: mockOrganizationId }
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache tenant configuration for performance', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          booking_settings: {
            advance_booking_hours: 4,
            max_advance_booking_days: 90,
            allow_same_day_booking: true,
            booking_window_start: '08:00',
            booking_window_end: '18:00',
            weekend_booking_enabled: false,
            auto_confirmation: true,
            cancellation_deadline_hours: 2,
            reschedule_deadline_hours: 2
          }
        },
        error: null
      });

      // Make multiple calls
      await bookingService.getBookingSettings(mockOrganizationId);
      await bookingService.getBookingSettings(mockOrganizationId);
      await bookingService.getBookingSettings(mockOrganizationId);

      // Should only call database once due to caching
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });
});
