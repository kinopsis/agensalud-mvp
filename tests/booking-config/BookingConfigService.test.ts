/**
 * BookingConfigService Tests
 * Comprehensive test suite for tenant-configurable booking rules
 * 
 * @description Tests for advance booking validation, timezone handling,
 * tenant configuration, and edge cases
 */

import BookingConfigService, { type BookingSettings } from '@/lib/services/BookingConfigService';

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

describe('BookingConfigService', () => {
  let service: BookingConfigService;
  const mockOrganizationId = 'test-org-123';

  beforeEach(() => {
    service = BookingConfigService.getInstance();
    service.clearCache();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BookingConfigService.getInstance();
      const instance2 = BookingConfigService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getBookingSettings', () => {
    it('should return default settings when organization not found', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Organization not found' }
      });

      const settings = await service.getBookingSettings(mockOrganizationId);

      expect(settings).toEqual({
        advance_booking_hours: 4,
        max_advance_booking_days: 90,
        allow_same_day_booking: true,
        booking_window_start: '08:00',
        booking_window_end: '18:00',
        weekend_booking_enabled: false,
        auto_confirmation: true,
        cancellation_deadline_hours: 2,
        reschedule_deadline_hours: 2
      });
    });

    it('should return cached settings on subsequent calls', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      const mockSettings = {
        advance_booking_hours: 6,
        max_advance_booking_days: 60,
        allow_same_day_booking: false,
        booking_window_start: '09:00',
        booking_window_end: '17:00',
        weekend_booking_enabled: true,
        auto_confirmation: false,
        cancellation_deadline_hours: 4,
        reschedule_deadline_hours: 4
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { booking_settings: mockSettings },
        error: null
      });

      // First call
      const settings1 = await service.getBookingSettings(mockOrganizationId);
      // Second call (should use cache)
      const settings2 = await service.getBookingSettings(mockOrganizationId);

      expect(settings1).toEqual(mockSettings);
      expect(settings2).toEqual(mockSettings);
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateDateAvailability', () => {
    beforeEach(() => {
      // Mock current date to 2025-05-30 10:00 AM for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-05-30T10:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should reject past dates', async () => {
      const result = await service.validateDateAvailability(
        mockOrganizationId,
        '2025-05-29', // Yesterday
        ['09:00', '10:00', '11:00']
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Fecha pasada');
    });

    it('should reject weekend dates when weekend booking is disabled', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { 
          booking_settings: {
            advance_booking_hours: 4,
            weekend_booking_enabled: false,
            allow_same_day_booking: true,
            booking_window_start: '08:00',
            booking_window_end: '18:00',
            max_advance_booking_days: 90
          }
        },
        error: null
      });

      const result = await service.validateDateAvailability(
        mockOrganizationId,
        '2025-06-01', // Sunday
        ['09:00', '10:00', '11:00']
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('fin de semana');
    });

    it('should reject same day booking when disabled', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { 
          booking_settings: {
            advance_booking_hours: 4,
            weekend_booking_enabled: false,
            allow_same_day_booking: false,
            booking_window_start: '08:00',
            booking_window_end: '18:00',
            max_advance_booking_days: 90
          }
        },
        error: null
      });

      const result = await service.validateDateAvailability(
        mockOrganizationId,
        '2025-05-30', // Today
        ['15:00', '16:00', '17:00']
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('mismo día no están permitidas');
    });

    it('should reject dates beyond max advance booking limit', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { 
          booking_settings: {
            advance_booking_hours: 4,
            weekend_booking_enabled: true,
            allow_same_day_booking: true,
            booking_window_start: '08:00',
            booking_window_end: '18:00',
            max_advance_booking_days: 30
          }
        },
        error: null
      });

      const result = await service.validateDateAvailability(
        mockOrganizationId,
        '2025-07-30', // More than 30 days from now
        ['09:00', '10:00', '11:00']
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('más de 30 días');
    });

    it('should validate advance booking hours correctly', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { 
          booking_settings: {
            advance_booking_hours: 4,
            weekend_booking_enabled: true,
            allow_same_day_booking: true,
            booking_window_start: '08:00',
            booking_window_end: '18:00',
            max_advance_booking_days: 90
          }
        },
        error: null
      });

      // Test with slots that don't meet 4-hour rule (current time is 10:00 AM)
      const result1 = await service.validateDateAvailability(
        mockOrganizationId,
        '2025-05-30', // Today
        ['11:00', '12:00', '13:00'] // Only 1-3 hours from now
      );

      expect(result1.isValid).toBe(false);
      expect(result1.reason).toContain('4 horas de anticipación');

      // Test with slots that meet 4-hour rule
      const result2 = await service.validateDateAvailability(
        mockOrganizationId,
        '2025-05-30', // Today
        ['15:00', '16:00', '17:00'] // 5-7 hours from now
      );

      expect(result2.isValid).toBe(true);
      expect(result2.validTimeSlots).toEqual(['15:00', '16:00', '17:00']);
    });

    it('should handle mixed valid and invalid time slots', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { 
          booking_settings: {
            advance_booking_hours: 4,
            weekend_booking_enabled: true,
            allow_same_day_booking: true,
            booking_window_start: '08:00',
            booking_window_end: '18:00',
            max_advance_booking_days: 90
          }
        },
        error: null
      });

      const result = await service.validateDateAvailability(
        mockOrganizationId,
        '2025-05-30', // Today
        ['11:00', '12:00', '15:00', '16:00'] // Mix of valid and invalid slots
      );

      expect(result.isValid).toBe(true);
      expect(result.validTimeSlots).toEqual(['15:00', '16:00']);
    });
  });

  describe('validateTimeSlot', () => {
    const mockSettings: BookingSettings = {
      advance_booking_hours: 4,
      max_advance_booking_days: 90,
      allow_same_day_booking: true,
      booking_window_start: '08:00',
      booking_window_end: '18:00',
      weekend_booking_enabled: false,
      auto_confirmation: true,
      cancellation_deadline_hours: 2,
      reschedule_deadline_hours: 2
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-05-30T10:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should validate advance booking rule', () => {
      const result1 = service.validateTimeSlot(
        mockOrganizationId,
        '2025-05-30',
        '12:00', // Only 2 hours from now
        mockSettings
      );

      expect(result1.isValid).toBe(false);
      expect(result1.meetsAdvanceRule).toBe(false);
      expect(result1.reason).toContain('4 horas de anticipación');

      const result2 = service.validateTimeSlot(
        mockOrganizationId,
        '2025-05-30',
        '15:00', // 5 hours from now
        mockSettings
      );

      expect(result2.isValid).toBe(true);
      expect(result2.meetsAdvanceRule).toBe(true);
    });

    it('should validate booking window', () => {
      const result1 = service.validateTimeSlot(
        mockOrganizationId,
        '2025-05-31',
        '07:00', // Before booking window
        mockSettings
      );

      expect(result1.isValid).toBe(false);
      expect(result1.withinBookingWindow).toBe(false);
      expect(result1.reason).toContain('Fuera del horario de reservas');

      const result2 = service.validateTimeSlot(
        mockOrganizationId,
        '2025-05-31',
        '19:00', // After booking window
        mockSettings
      );

      expect(result2.isValid).toBe(false);
      expect(result2.withinBookingWindow).toBe(false);

      const result3 = service.validateTimeSlot(
        mockOrganizationId,
        '2025-05-31',
        '10:00', // Within booking window
        mockSettings
      );

      expect(result3.withinBookingWindow).toBe(true);
    });

    it('should validate weekend policy', () => {
      const result1 = service.validateTimeSlot(
        mockOrganizationId,
        '2025-06-01', // Sunday
        '10:00',
        mockSettings
      );

      expect(result1.isValid).toBe(false);
      expect(result1.weekendAllowed).toBe(false);
      expect(result1.reason).toContain('fin de semana no permitidas');

      const weekendEnabledSettings = { ...mockSettings, weekend_booking_enabled: true };
      const result2 = service.validateTimeSlot(
        mockOrganizationId,
        '2025-06-01', // Sunday
        '10:00',
        weekendEnabledSettings
      );

      expect(result2.weekendAllowed).toBe(true);
    });
  });

  describe('updateBookingSettings', () => {
    it('should update settings successfully', async () => {
      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      // Mock current settings
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

      // Mock update
      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      });

      const newSettings = {
        advance_booking_hours: 6,
        weekend_booking_enabled: true
      };

      const result = await service.updateBookingSettings(mockOrganizationId, newSettings);

      expect(result).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        booking_settings: expect.objectContaining({
          advance_booking_hours: 6,
          weekend_booking_enabled: true
        })
      });
    });

    it('should reject invalid settings', async () => {
      const invalidSettings = {
        advance_booking_hours: -1, // Invalid
        max_advance_booking_days: 500 // Invalid
      };

      const result = await service.updateBookingSettings(mockOrganizationId, invalidSettings);

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle timezone edge cases correctly', async () => {
      // Test around midnight transitions
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-05-30T23:30:00.000Z'));

      const { createClient } = require('@/lib/supabase/server');
      const mockSupabase = createClient();
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { 
          booking_settings: {
            advance_booking_hours: 4,
            weekend_booking_enabled: true,
            allow_same_day_booking: true,
            booking_window_start: '08:00',
            booking_window_end: '18:00',
            max_advance_booking_days: 90
          }
        },
        error: null
      });

      const result = await service.validateDateAvailability(
        mockOrganizationId,
        '2025-05-31', // Next day
        ['08:00', '09:00', '10:00']
      );

      expect(result.isValid).toBe(true);
      
      jest.useRealTimers();
    });

    it('should handle empty time slots gracefully', async () => {
      const result = await service.validateDateAvailability(
        mockOrganizationId,
        '2025-05-31',
        [] // No time slots
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('No hay horarios disponibles');
    });

    it('should handle malformed date strings', async () => {
      const result = await service.validateDateAvailability(
        mockOrganizationId,
        'invalid-date',
        ['09:00', '10:00']
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Error validando');
    });
  });
});
