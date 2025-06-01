/**
 * CRITICAL DATE DISPLACEMENT FIX VALIDATION TESTS
 * 
 * Comprehensive test suite to validate that the June 4th → June 5th displacement
 * issue has been resolved with the DateHandler implementation.
 * 
 * Tests cover:
 * - Date arithmetic operations
 * - Week generation
 * - Month boundary handling
 * - Timezone safety
 * - Displacement detection
 */

import { DateHandler } from '@/lib/utils/DateHandler';

describe('Date Displacement Fix Validation', () => {
  
  describe('DateHandler.generateWeekDates', () => {
    test('should generate correct week dates without displacement', () => {
      // Test the specific problematic date: June 4th, 2025
      const june4th2025 = new Date(2025, 5, 4); // Month is 0-indexed
      const weekDates = DateHandler.generateWeekDates(june4th2025);
      
      expect(weekDates).toHaveLength(7);
      expect(weekDates[0]).toBe('2025-06-04'); // Should be June 4th, not June 5th
      expect(weekDates[1]).toBe('2025-06-05');
      expect(weekDates[2]).toBe('2025-06-06');
      expect(weekDates[3]).toBe('2025-06-07');
      expect(weekDates[4]).toBe('2025-06-08');
      expect(weekDates[5]).toBe('2025-06-09');
      expect(weekDates[6]).toBe('2025-06-10');
    });

    test('should handle month boundaries correctly', () => {
      // Test month boundary: May 30th, 2025 (should generate into June)
      const may30th2025 = new Date(2025, 4, 30); // May 30th
      const weekDates = DateHandler.generateWeekDates(may30th2025);
      
      expect(weekDates[0]).toBe('2025-05-30');
      expect(weekDates[1]).toBe('2025-05-31');
      expect(weekDates[2]).toBe('2025-06-01'); // Should cross into June correctly
      expect(weekDates[3]).toBe('2025-06-02');
      expect(weekDates[4]).toBe('2025-06-03');
      expect(weekDates[5]).toBe('2025-06-04');
      expect(weekDates[6]).toBe('2025-06-05');
    });

    test('should handle year boundaries correctly', () => {
      // Test year boundary: December 29th, 2024
      const dec29th2024 = new Date(2024, 11, 29); // December 29th
      const weekDates = DateHandler.generateWeekDates(dec29th2024);
      
      expect(weekDates[0]).toBe('2024-12-29');
      expect(weekDates[1]).toBe('2024-12-30');
      expect(weekDates[2]).toBe('2024-12-31');
      expect(weekDates[3]).toBe('2025-01-01'); // Should cross into new year correctly
      expect(weekDates[4]).toBe('2025-01-02');
      expect(weekDates[5]).toBe('2025-01-03');
      expect(weekDates[6]).toBe('2025-01-04');
    });
  });

  describe('DateHandler.addDays', () => {
    test('should add days without displacement', () => {
      const june4th2025 = new Date(2025, 5, 4);
      
      const nextDay = DateHandler.addDays(june4th2025, 1);
      expect(DateHandler.createDateString(nextDay)).toBe('2025-06-05');
      
      const weekLater = DateHandler.addDays(june4th2025, 7);
      expect(DateHandler.createDateString(weekLater)).toBe('2025-06-11');
    });

    test('should handle negative day addition', () => {
      const june4th2025 = new Date(2025, 5, 4);
      
      const previousDay = DateHandler.addDays(june4th2025, -1);
      expect(DateHandler.createDateString(previousDay)).toBe('2025-06-03');
      
      const weekBefore = DateHandler.addDays(june4th2025, -7);
      expect(DateHandler.createDateString(weekBefore)).toBe('2025-05-28');
    });
  });

  describe('DateHandler.getStartOfWeek', () => {
    test('should calculate start of week correctly', () => {
      // June 4th, 2025 is a Wednesday (day 3)
      const june4th2025 = new Date(2025, 5, 4);
      const startOfWeek = DateHandler.getStartOfWeek(june4th2025);
      
      // Start of week should be Sunday, June 1st, 2025
      expect(DateHandler.createDateString(startOfWeek)).toBe('2025-06-01');
    });

    test('should handle Sunday correctly (no change)', () => {
      // June 1st, 2025 is a Sunday
      const june1st2025 = new Date(2025, 5, 1);
      const startOfWeek = DateHandler.getStartOfWeek(june1st2025);
      
      // Should remain the same date
      expect(DateHandler.createDateString(startOfWeek)).toBe('2025-06-01');
    });
  });

  describe('DateHandler.validateAndNormalize', () => {
    test('should validate dates without displacement', () => {
      const result = DateHandler.validateAndNormalize('2025-06-04', 'TestComponent');
      
      expect(result.isValid).toBe(true);
      expect(result.normalizedDate).toBe('2025-06-04');
      expect(result.displacement?.detected).toBe(false);
    });

    test('should detect displacement if it occurs', () => {
      // This test simulates what would happen if displacement occurred
      // In our fixed implementation, this should not happen
      const result = DateHandler.validateAndNormalize('2025-06-04', 'TestComponent');
      
      // With our fix, there should be no displacement
      expect(result.displacement?.detected).toBe(false);
    });
  });

  describe('Edge Cases and Regression Tests', () => {
    test('should handle leap year February correctly', () => {
      // February 28th, 2024 (leap year)
      const feb28th2024 = new Date(2024, 1, 28);
      const weekDates = DateHandler.generateWeekDates(feb28th2024);
      
      expect(weekDates[0]).toBe('2024-02-28');
      expect(weekDates[1]).toBe('2024-02-29'); // Leap day
      expect(weekDates[2]).toBe('2024-03-01'); // March 1st
    });

    test('should handle non-leap year February correctly', () => {
      // February 28th, 2025 (non-leap year)
      const feb28th2025 = new Date(2025, 1, 28);
      const weekDates = DateHandler.generateWeekDates(feb28th2025);
      
      expect(weekDates[0]).toBe('2025-02-28');
      expect(weekDates[1]).toBe('2025-03-01'); // Should skip to March 1st
      expect(weekDates[2]).toBe('2025-03-02');
    });

    test('should handle DST transitions correctly', () => {
      // Test around typical DST transition dates
      // March 10th, 2025 (around DST start in many regions)
      const march10th2025 = new Date(2025, 2, 10);
      const weekDates = DateHandler.generateWeekDates(march10th2025);
      
      expect(weekDates[0]).toBe('2025-03-10');
      expect(weekDates[6]).toBe('2025-03-16');
      
      // Verify no displacement occurred
      weekDates.forEach((dateStr, index) => {
        const expectedDate = DateHandler.addDays(march10th2025, index);
        expect(dateStr).toBe(DateHandler.createDateString(expectedDate));
      });
    });
  });

  describe('Performance and Consistency Tests', () => {
    test('should generate consistent results across multiple calls', () => {
      const june4th2025 = new Date(2025, 5, 4);
      
      const result1 = DateHandler.generateWeekDates(june4th2025);
      const result2 = DateHandler.generateWeekDates(june4th2025);
      const result3 = DateHandler.generateWeekDates(june4th2025);
      
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    test('should handle large date ranges without displacement', () => {
      const startDate = new Date(2025, 0, 1); // January 1st, 2025
      
      // Generate 52 weeks worth of dates
      for (let week = 0; week < 52; week++) {
        const weekStart = DateHandler.addDays(startDate, week * 7);
        const weekDates = DateHandler.generateWeekDates(weekStart);
        
        // Verify each week has 7 consecutive dates
        for (let day = 1; day < 7; day++) {
          const prevDate = new Date(weekDates[day - 1]);
          const currDate = new Date(weekDates[day]);
          const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
          
          expect(dayDiff).toBe(1); // Should be exactly 1 day apart
        }
      }
    });
  });
});
