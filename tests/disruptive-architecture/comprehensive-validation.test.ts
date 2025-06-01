/**
 * COMPREHENSIVE VALIDATION TESTS - DISRUPTIVE SOLUTION
 * 
 * Tests for the new disruptive architecture that eliminates:
 * 1. Date displacement issues
 * 2. Slot count mismatches
 * 3. Data integrity problems
 * 4. Inconsistent data sources
 * 
 * @author AgentSalud MVP Team - Disruptive Architecture Solution
 * @version 2.0.0
 */

import { ImmutableDateSystem } from '@/lib/core/ImmutableDateSystem';
import { UnifiedAppointmentDataService } from '@/lib/core/UnifiedAppointmentDataService';
import { DataIntegrityValidator } from '@/lib/core/DataIntegrityValidator';

describe('DISRUPTIVE ARCHITECTURE - Comprehensive Validation', () => {
  
  describe('ImmutableDateSystem - Date Displacement Prevention', () => {
    
    test('should handle date arithmetic without displacement', () => {
      const startDate = '2025-06-04';
      
      // Test adding days
      const nextDay = ImmutableDateSystem.addDays(startDate, 1);
      expect(nextDay).toBe('2025-06-05');
      
      const nextWeek = ImmutableDateSystem.addDays(startDate, 7);
      expect(nextWeek).toBe('2025-06-11');
      
      // Test month boundaries
      const endOfMonth = '2025-06-30';
      const nextMonth = ImmutableDateSystem.addDays(endOfMonth, 1);
      expect(nextMonth).toBe('2025-07-01');
    });
    
    test('should handle leap years correctly', () => {
      const leapYearFeb = '2024-02-28';
      const nextDay = ImmutableDateSystem.addDays(leapYearFeb, 1);
      expect(nextDay).toBe('2024-02-29');
      
      const leapDay = '2024-02-29';
      const dayAfter = ImmutableDateSystem.addDays(leapDay, 1);
      expect(dayAfter).toBe('2024-03-01');
    });
    
    test('should generate week dates without displacement', () => {
      const startDate = '2025-06-01'; // Sunday
      const weekDates = ImmutableDateSystem.generateWeekDates(startDate);
      
      expect(weekDates).toEqual([
        '2025-06-01',
        '2025-06-02',
        '2025-06-03',
        '2025-06-04',
        '2025-06-05',
        '2025-06-06',
        '2025-06-07'
      ]);
    });
    
    test('should detect and prevent date displacement', () => {
      const validDate = '2025-06-04';
      const validation = ImmutableDateSystem.validateAndNormalize(validDate);
      
      expect(validation.isValid).toBe(true);
      expect(validation.displacement?.detected).toBe(false);
      expect(validation.normalizedDate).toBe(validDate);
    });
    
    test('should handle invalid dates gracefully', () => {
      const invalidDate = '2025-02-30'; // February doesn't have 30 days
      const validation = ImmutableDateSystem.validateAndNormalize(invalidDate);
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Invalid day');
    });
    
    test('should compare dates correctly', () => {
      const date1 = '2025-06-04';
      const date2 = '2025-06-05';
      const date3 = '2025-06-04';
      
      expect(ImmutableDateSystem.compareDates(date1, date2)).toBe(-1);
      expect(ImmutableDateSystem.compareDates(date2, date1)).toBe(1);
      expect(ImmutableDateSystem.compareDates(date1, date3)).toBe(0);
    });
  });
  
  describe('UnifiedAppointmentDataService - Data Consistency', () => {
    
    beforeEach(() => {
      // Clear cache before each test
      UnifiedAppointmentDataService.clearCache();
    });
    
    test('should provide consistent data across multiple calls', async () => {
      const query = {
        organizationId: 'org-123',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        serviceId: 'service-1',
        userRole: 'patient'
      };
      
      // Mock fetch to return consistent data
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            '2025-06-01': {
              slots: [
                { id: '1', start_time: '09:00', available: true },
                { id: '2', start_time: '09:30', available: true },
                { id: '3', start_time: '10:00', available: false }
              ],
              totalSlots: 3,
              availableSlots: 2
            }
          }
        })
      });
      
      // First call
      const data1 = await UnifiedAppointmentDataService.getAvailabilityData(query);
      
      // Second call (should use cache)
      const data2 = await UnifiedAppointmentDataService.getAvailabilityData(query);
      
      // Data should be identical
      expect(data1).toEqual(data2);
      expect(data1[0].slotsCount).toBe(2); // Should use availableSlots
      expect(data1[0].availableSlots).toBe(2);
      expect(data1[0].totalSlots).toBe(3);
    });
    
    test('should handle API errors gracefully with mock fallback', async () => {
      const query = {
        organizationId: 'org-123',
        startDate: '2025-06-01',
        endDate: '2025-06-07'
      };
      
      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      const data = await UnifiedAppointmentDataService.getAvailabilityData(query);
      
      // Should return mock data instead of throwing
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
    });
  });
  
  describe('DataIntegrityValidator - Real-time Validation', () => {
    
    test('should detect slot count mismatches', () => {
      const invalidData = [{
        date: '2025-06-04',
        dayName: 'Miércoles',
        slotsCount: 5, // This doesn't match availableSlots
        availabilityLevel: 'medium' as const,
        isToday: false,
        isTomorrow: false,
        isWeekend: false,
        slots: [
          { id: '1', start_time: '09:00', available: true },
          { id: '2', start_time: '09:30', available: false }
        ],
        totalSlots: 2,
        availableSlots: 1 // Only 1 available, but slotsCount says 5
      }];
      
      const validation = DataIntegrityValidator.validateAvailabilityData(
        invalidData,
        'TestComponent',
        'api'
      );
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].code).toBe('AVAILABLE_SLOTS_MISMATCH');
    });
    
    test('should detect date format issues', () => {
      const invalidData = [{
        date: '2025/06/04', // Wrong format
        dayName: 'Miércoles',
        slotsCount: 2,
        availabilityLevel: 'low' as const,
        isToday: false,
        isTomorrow: false,
        isWeekend: false,
        slots: [],
        totalSlots: 2,
        availableSlots: 2
      }];
      
      const validation = DataIntegrityValidator.validateAvailabilityData(
        invalidData,
        'TestComponent',
        'api'
      );
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === 'INVALID_DATE_FORMAT')).toBe(true);
    });
    
    test('should detect impossible slot counts', () => {
      const invalidData = [{
        date: '2025-06-04',
        dayName: 'Miércoles',
        slotsCount: 10,
        availabilityLevel: 'high' as const,
        isToday: false,
        isTomorrow: false,
        isWeekend: false,
        slots: [],
        totalSlots: 5,
        availableSlots: 10 // More available than total!
      }];
      
      const validation = DataIntegrityValidator.validateAvailabilityData(
        invalidData,
        'TestComponent',
        'api'
      );
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === 'IMPOSSIBLE_SLOT_COUNT')).toBe(true);
    });
    
    test('should log data transformations', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const logId = DataIntegrityValidator.logDataTransformation(
        'TestComponent',
        'TEST_OPERATION',
        { input: 'test' },
        { output: 'result' },
        ['TestRule']
      );
      
      expect(logId).toBeDefined();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('DataTransformation [TestComponent]: TEST_OPERATION'),
        expect.any(Object)
      );
      
      logSpy.mockRestore();
    });
  });
  
  describe('Integration Tests - End-to-End Validation', () => {
    
    test('should prevent date displacement in complete flow', async () => {
      // Test the complete flow from date input to final validation
      const inputDate = '2025-06-04';
      
      // Step 1: Validate with ImmutableDateSystem
      const validation = ImmutableDateSystem.validateAndNormalize(inputDate);
      expect(validation.isValid).toBe(true);
      expect(validation.displacement?.detected).toBe(false);
      
      // Step 2: Generate week dates
      const weekStart = ImmutableDateSystem.getStartOfWeek(inputDate);
      const weekDates = ImmutableDateSystem.generateWeekDates(weekStart);
      expect(weekDates).toContain(inputDate);
      
      // Step 3: Verify no displacement in week generation
      expect(weekDates[0]).toBe(weekStart);
      expect(weekDates[6]).toBe(ImmutableDateSystem.addDays(weekStart, 6));
    });
    
    test('should maintain data consistency across components', async () => {
      // Mock consistent API response
      const mockApiData = {
        '2025-06-04': {
          slots: [
            { id: '1', start_time: '09:00', available: true },
            { id: '2', start_time: '09:30', available: true },
            { id: '3', start_time: '10:00', available: false }
          ],
          totalSlots: 3,
          availableSlots: 2
        }
      };
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockApiData })
      });
      
      const query = {
        organizationId: 'org-123',
        startDate: '2025-06-04',
        endDate: '2025-06-04'
      };
      
      // Get data through unified service
      const data = await UnifiedAppointmentDataService.getAvailabilityData(query);
      
      // Validate data integrity
      const validation = DataIntegrityValidator.validateAvailabilityData(
        data,
        'IntegrationTest',
        'api'
      );
      
      expect(validation.isValid).toBe(true);
      expect(data[0].slotsCount).toBe(2); // Should match availableSlots
      expect(data[0].availableSlots).toBe(2);
      expect(data[0].totalSlots).toBe(3);
    });
  });
});
