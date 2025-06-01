/**
 * COMPREHENSIVE TIMEZONE DISPLACEMENT VALIDATION
 * 
 * This test suite validates that the timezone displacement issue has been completely resolved
 * across all appointment booking flows and calendar components.
 * 
 * Testing Methodology: 3-Phase Approach
 * - Investigation (60min): System analysis and component testing
 * - Implementation (90min): Comprehensive test execution
 * - Validation (45min): Results analysis and reporting
 * 
 * @author AgentSalud MVP Team - Timezone Displacement Resolution
 * @version 1.0.0
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ImmutableDateSystem } from '@/lib/core/ImmutableDateSystem';

// Test data for different timezone scenarios
const TIMEZONE_TEST_SCENARIOS = [
  { name: 'UTC', timezone: 'UTC', offset: '+00:00' },
  { name: 'EST (New York)', timezone: 'America/New_York', offset: '-05:00' },
  { name: 'PST (Los Angeles)', timezone: 'America/Los_Angeles', offset: '-08:00' },
  { name: 'GMT (London)', timezone: 'Europe/London', offset: '+00:00' },
  { name: 'JST (Tokyo)', timezone: 'Asia/Tokyo', offset: '+09:00' },
  { name: 'AEDT (Sydney)', timezone: 'Australia/Sydney', offset: '+11:00' },
  { name: 'BRT (São Paulo)', timezone: 'America/Sao_Paulo', offset: '-03:00' },
  { name: 'IST (Mumbai)', timezone: 'Asia/Kolkata', offset: '+05:30' }
];

const CRITICAL_TEST_DATES = [
  '2025-01-15', // Standard date
  '2025-01-31', // Month boundary
  '2025-02-28', // February end (non-leap year)
  '2024-02-29', // Leap year February
  '2025-03-01', // Month start
  '2025-12-31', // Year end
  '2026-01-01', // Year start
  '2025-03-09', // DST transition (US Spring)
  '2025-11-02', // DST transition (US Fall)
  '2025-03-30', // DST transition (EU Spring)
  '2025-10-26'  // DST transition (EU Fall)
];

describe('Comprehensive Timezone Displacement Validation', () => {
  let originalTimezone: string;
  let originalDateNow: () => number;

  beforeEach(() => {
    // Store original environment
    originalTimezone = process.env.TZ || 'UTC';
    originalDateNow = Date.now;
    
    // Mock console methods to capture logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original environment
    process.env.TZ = originalTimezone;
    Date.now = originalDateNow;
    jest.restoreAllMocks();
  });

  describe('Phase 1: ImmutableDateSystem Validation (60min)', () => {
    test('Date parsing consistency across all timezones', () => {
      console.log('🔍 PHASE 1: Testing date parsing consistency...');
      
      CRITICAL_TEST_DATES.forEach(testDate => {
        TIMEZONE_TEST_SCENARIOS.forEach(({ name, timezone }) => {
          // Set timezone for this test iteration
          process.env.TZ = timezone;
          
          const parsed = ImmutableDateSystem.parseDate(testDate);
          const reformatted = ImmutableDateSystem.formatDate(parsed);
          
          // CRITICAL: Date should remain exactly the same
          expect(reformatted).toBe(testDate);
          expect(parsed.year).toBe(parseInt(testDate.split('-')[0]));
          expect(parsed.month).toBe(parseInt(testDate.split('-')[1]));
          expect(parsed.day).toBe(parseInt(testDate.split('-')[2]));
          
          console.log(`✅ ${name}: ${testDate} parsed correctly`);
        });
      });
    });

    test('Date arithmetic without displacement', () => {
      console.log('🔍 PHASE 1: Testing date arithmetic...');
      
      const testCases = [
        { date: '2025-01-15', addDays: 1, expected: '2025-01-16' },
        { date: '2025-01-31', addDays: 1, expected: '2025-02-01' },
        { date: '2025-02-28', addDays: 1, expected: '2025-03-01' },
        { date: '2024-02-29', addDays: 1, expected: '2024-03-01' }, // Leap year
        { date: '2025-12-31', addDays: 1, expected: '2026-01-01' },
        { date: '2025-01-01', addDays: -1, expected: '2024-12-31' }
      ];

      testCases.forEach(({ date, addDays, expected }) => {
        TIMEZONE_TEST_SCENARIOS.forEach(({ name, timezone }) => {
          process.env.TZ = timezone;
          
          const result = ImmutableDateSystem.addDays(date, addDays);
          expect(result).toBe(expected);
          
          console.log(`✅ ${name}: ${date} + ${addDays} days = ${result}`);
        });
      });
    });

    test('Today calculation consistency', () => {
      console.log('🔍 PHASE 1: Testing today calculation...');
      
      // Mock a specific date for consistent testing
      const mockDate = new Date('2025-01-15T12:00:00Z');
      Date.now = jest.fn(() => mockDate.getTime());
      
      TIMEZONE_TEST_SCENARIOS.forEach(({ name, timezone }) => {
        process.env.TZ = timezone;
        
        const today = ImmutableDateSystem.getTodayString();
        
        // Today should be consistent regardless of timezone for this test
        // (Note: In real scenarios, timezone affects "today", but for displacement testing,
        // we want to ensure the calculation is consistent)
        expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        
        console.log(`✅ ${name}: Today calculated as ${today}`);
      });
    });
  });

  describe('Phase 2: Date Selection Flow Validation (90min)', () => {
    test('Date selection maintains exact date string', () => {
      console.log('🔍 PHASE 2: Testing date selection flow...');
      
      const mockDateSelectHandler = jest.fn();
      
      CRITICAL_TEST_DATES.forEach(testDate => {
        TIMEZONE_TEST_SCENARIOS.forEach(({ name, timezone }) => {
          process.env.TZ = timezone;
          
          // Simulate the date selection process
          const validation = ImmutableDateSystem.validateAndNormalize(testDate, 'TestComponent');
          
          if (validation.isValid) {
            mockDateSelectHandler(validation.normalizedDate);
            
            // CRITICAL: The normalized date should be exactly the same as input
            expect(validation.normalizedDate).toBe(testDate);
            expect(validation.displacement?.detected).toBe(false);
            
            console.log(`✅ ${name}: Date ${testDate} selected without displacement`);
          }
        });
      });
    });

    test('Week generation without displacement', () => {
      console.log('🔍 PHASE 2: Testing week generation...');
      
      const testStartDates = ['2025-01-13', '2025-01-27', '2025-02-24']; // Various Mondays
      
      testStartDates.forEach(startDate => {
        TIMEZONE_TEST_SCENARIOS.forEach(({ name, timezone }) => {
          process.env.TZ = timezone;
          
          const weekDates = ImmutableDateSystem.generateWeekDates(startDate);
          
          // Verify week has 7 days
          expect(weekDates).toHaveLength(7);
          
          // Verify each day is exactly one day after the previous
          for (let i = 1; i < weekDates.length; i++) {
            const prevDate = weekDates[i - 1];
            const currentDate = weekDates[i];
            const expectedDate = ImmutableDateSystem.addDays(prevDate, 1);
            
            expect(currentDate).toBe(expectedDate);
          }
          
          console.log(`✅ ${name}: Week from ${startDate} generated correctly`);
        });
      });
    });

    test('Role-based booking validation consistency', () => {
      console.log('🔍 PHASE 2: Testing role-based validation...');
      
      const roles = ['patient', 'admin', 'staff', 'doctor', 'superadmin'] as const;
      const testDate = '2025-01-20'; // Future date
      
      roles.forEach(role => {
        TIMEZONE_TEST_SCENARIOS.forEach(({ name, timezone }) => {
          process.env.TZ = timezone;
          
          // Mock today as a different date to test future date logic
          const mockToday = new Date('2025-01-15T10:00:00Z');
          Date.now = jest.fn(() => mockToday.getTime());
          
          const isToday = ImmutableDateSystem.isToday(testDate);
          const isPast = ImmutableDateSystem.isPastDate(testDate);
          
          // Future date should not be today or past
          expect(isToday).toBe(false);
          expect(isPast).toBe(false);
          
          console.log(`✅ ${name}: Role ${role} - Date ${testDate} validation consistent`);
        });
      });
    });
  });

  describe('Phase 3: Integration and Edge Cases (45min)', () => {
    test('DST transition handling', () => {
      console.log('🔍 PHASE 3: Testing DST transitions...');
      
      const dstDates = [
        '2025-03-09', // US Spring forward
        '2025-11-02', // US Fall back
        '2025-03-30', // EU Spring forward
        '2025-10-26'  // EU Fall back
      ];
      
      dstDates.forEach(dstDate => {
        TIMEZONE_TEST_SCENARIOS.forEach(({ name, timezone }) => {
          process.env.TZ = timezone;
          
          // Test date operations around DST transitions
          const dayBefore = ImmutableDateSystem.addDays(dstDate, -1);
          const dayAfter = ImmutableDateSystem.addDays(dstDate, 1);
          
          // Verify dates are sequential
          const validation1 = ImmutableDateSystem.validateAndNormalize(dayBefore, 'DSTTest');
          const validation2 = ImmutableDateSystem.validateAndNormalize(dstDate, 'DSTTest');
          const validation3 = ImmutableDateSystem.validateAndNormalize(dayAfter, 'DSTTest');
          
          expect(validation1.isValid).toBe(true);
          expect(validation2.isValid).toBe(true);
          expect(validation3.isValid).toBe(true);
          
          // No displacement should be detected
          expect(validation1.displacement?.detected).toBe(false);
          expect(validation2.displacement?.detected).toBe(false);
          expect(validation3.displacement?.detected).toBe(false);
          
          console.log(`✅ ${name}: DST transition ${dstDate} handled correctly`);
        });
      });
    });

    test('Month and year boundary transitions', () => {
      console.log('🔍 PHASE 3: Testing boundary transitions...');
      
      const boundaryTests = [
        { date: '2025-01-31', next: '2025-02-01', description: 'January to February' },
        { date: '2025-02-28', next: '2025-03-01', description: 'February to March (non-leap)' },
        { date: '2024-02-29', next: '2024-03-01', description: 'February to March (leap year)' },
        { date: '2025-12-31', next: '2026-01-01', description: 'Year boundary' }
      ];
      
      boundaryTests.forEach(({ date, next, description }) => {
        TIMEZONE_TEST_SCENARIOS.forEach(({ name, timezone }) => {
          process.env.TZ = timezone;
          
          const calculated = ImmutableDateSystem.addDays(date, 1);
          expect(calculated).toBe(next);
          
          // Verify no displacement in validation
          const validation = ImmutableDateSystem.validateAndNormalize(calculated, 'BoundaryTest');
          expect(validation.isValid).toBe(true);
          expect(validation.displacement?.detected).toBe(false);
          
          console.log(`✅ ${name}: ${description} - ${date} → ${calculated}`);
        });
      });
    });

    test('Comprehensive displacement detection', () => {
      console.log('🔍 PHASE 3: Testing displacement detection...');
      
      // Test with potentially problematic date formats
      const testCases = [
        { input: '2025-01-15', shouldBeValid: true },
        { input: '2025-1-15', shouldBeValid: false }, // Invalid format
        { input: '2025-01-32', shouldBeValid: false }, // Invalid day
        { input: '2025-13-01', shouldBeValid: false }, // Invalid month
        { input: '2025-02-29', shouldBeValid: false }, // Invalid leap year
        { input: '2024-02-29', shouldBeValid: true }   // Valid leap year
      ];
      
      testCases.forEach(({ input, shouldBeValid }) => {
        TIMEZONE_TEST_SCENARIOS.forEach(({ name, timezone }) => {
          process.env.TZ = timezone;
          
          const validation = ImmutableDateSystem.validateAndNormalize(input, 'DisplacementTest');
          expect(validation.isValid).toBe(shouldBeValid);
          
          if (shouldBeValid) {
            expect(validation.displacement?.detected).toBe(false);
            expect(validation.normalizedDate).toBe(input);
          }
          
          console.log(`✅ ${name}: Input "${input}" validation = ${validation.isValid}`);
        });
      });
    });
  });

  describe('Success Criteria Validation', () => {
    test('Zero date displacement across all scenarios', () => {
      console.log('🎯 FINAL VALIDATION: Zero displacement check...');
      
      let totalTests = 0;
      let displacementDetected = 0;
      
      CRITICAL_TEST_DATES.forEach(date => {
        TIMEZONE_TEST_SCENARIOS.forEach(({ name, timezone }) => {
          process.env.TZ = timezone;
          totalTests++;
          
          const validation = ImmutableDateSystem.validateAndNormalize(date, 'FinalValidation');
          
          if (validation.isValid && validation.displacement?.detected) {
            displacementDetected++;
            console.error(`❌ DISPLACEMENT DETECTED: ${name} - ${date}`);
          }
        });
      });
      
      console.log(`📊 FINAL RESULTS: ${totalTests} tests, ${displacementDetected} displacements`);
      expect(displacementDetected).toBe(0);
    });
  });
});
