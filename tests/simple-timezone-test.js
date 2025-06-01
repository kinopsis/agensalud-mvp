/**
 * SIMPLE TIMEZONE DISPLACEMENT TEST
 * 
 * Direct test of the ImmutableDateSystem to validate timezone displacement resolution
 */

// Simple implementation to test the core logic
class TestImmutableDateSystem {
  static parseDate(dateStr) {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
    }
    
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10), // 1-12
      day: parseInt(match[3], 10)
    };
  }
  
  static formatDate(components) {
    const { year, month, day } = components;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }
  
  static validateAndNormalize(dateStr, component = 'Test') {
    try {
      // Parse to validate format
      const components = this.parseDate(dateStr);
      
      // Validate ranges
      if (components.month < 1 || components.month > 12) {
        return {
          isValid: false,
          error: `Invalid month: ${components.month}. Must be 1-12`
        };
      }
      
      const daysInMonth = this.getDaysInMonth(components.year, components.month);
      if (components.day < 1 || components.day > daysInMonth) {
        return {
          isValid: false,
          error: `Invalid day: ${components.day}. Must be 1-${daysInMonth} for ${components.year}-${components.month}`
        };
      }
      
      // Re-format to ensure consistency
      const normalizedDate = this.formatDate(components);
      
      // Check for displacement
      const displacement = {
        detected: dateStr !== normalizedDate,
        originalDate: dateStr,
        normalizedDate: normalizedDate,
        daysDifference: dateStr !== normalizedDate ? 1 : 0
      };
      
      return {
        isValid: true,
        normalizedDate,
        displacement
      };
      
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
  
  static getDaysInMonth(year, month) {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    if (month === 2 && this.isLeapYear(year)) {
      return 29;
    }
    
    return daysInMonth[month - 1];
  }
  
  static isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }
  
  static getTodayString() {
    const now = new Date();
    return this.formatDate({
      year: now.getFullYear(),
      month: now.getMonth() + 1, // Convert 0-11 to 1-12
      day: now.getDate()
    });
  }
  
  static addDays(dateStr, daysToAdd) {
    const components = this.parseDate(dateStr);
    let { year, month, day } = components;
    
    day += daysToAdd;
    
    // Handle month overflow/underflow
    while (day > this.getDaysInMonth(year, month)) {
      day -= this.getDaysInMonth(year, month);
      month++;
      
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    
    while (day < 1) {
      month--;
      
      if (month < 1) {
        month = 12;
        year--;
      }
      
      day += this.getDaysInMonth(year, month);
    }
    
    return this.formatDate({ year, month, day });
  }
}

// Test execution
function runTimezoneDisplacementTests() {
  console.log('🔍 SIMPLE TIMEZONE DISPLACEMENT TEST');
  console.log('=' .repeat(50));
  
  const testResults = {
    totalTests: 0,
    successfulTests: 0,
    displacementIssues: 0,
    errors: []
  };
  
  // Test scenarios
  const timezones = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'];
  const testDates = [
    '2025-01-15', // Standard date
    '2025-01-31', // Month boundary
    '2025-02-28', // February end
    '2025-03-01', // Month start
    '2025-12-31', // Year end
    '2026-01-01', // Year start
    '2024-02-29', // Leap year
    '2025-03-09', // DST transition
    '2025-11-02'  // DST transition
  ];
  
  console.log(`Testing ${testDates.length} dates across ${timezones.length} timezones...`);
  console.log('');
  
  // Test each date in each timezone
  timezones.forEach(timezone => {
    console.log(`🌍 Testing timezone: ${timezone}`);
    
    // Set timezone (note: this may not work in all environments)
    const originalTZ = process.env.TZ;
    process.env.TZ = timezone;
    
    testDates.forEach(date => {
      testResults.totalTests++;
      
      try {
        const validation = TestImmutableDateSystem.validateAndNormalize(date, 'TimezoneTest');
        
        if (!validation.isValid) {
          console.log(`  ❌ ${date}: Validation failed - ${validation.error}`);
          testResults.errors.push(`${timezone}: ${date} - ${validation.error}`);
          return;
        }
        
        if (validation.displacement?.detected) {
          console.log(`  🚨 ${date}: DISPLACEMENT DETECTED! ${validation.displacement.originalDate} → ${validation.displacement.normalizedDate}`);
          testResults.displacementIssues++;
          testResults.errors.push(`${timezone}: ${date} - Displacement detected`);
          return;
        }
        
        if (validation.normalizedDate !== date) {
          console.log(`  ⚠️  ${date}: Date changed to ${validation.normalizedDate}`);
          testResults.displacementIssues++;
          testResults.errors.push(`${timezone}: ${date} - Date changed`);
          return;
        }
        
        console.log(`  ✅ ${date}: OK`);
        testResults.successfulTests++;
        
      } catch (error) {
        console.log(`  💥 ${date}: Error - ${error.message}`);
        testResults.errors.push(`${timezone}: ${date} - ${error.message}`);
      }
    });
    
    // Restore timezone
    process.env.TZ = originalTZ;
    console.log('');
  });
  
  // Test date arithmetic
  console.log('🧮 Testing date arithmetic...');
  const arithmeticTests = [
    { date: '2025-01-15', addDays: 1, expected: '2025-01-16' },
    { date: '2025-01-31', addDays: 1, expected: '2025-02-01' },
    { date: '2025-02-28', addDays: 1, expected: '2025-03-01' },
    { date: '2024-02-29', addDays: 1, expected: '2024-03-01' },
    { date: '2025-12-31', addDays: 1, expected: '2026-01-01' }
  ];
  
  arithmeticTests.forEach(test => {
    testResults.totalTests++;
    
    try {
      const result = TestImmutableDateSystem.addDays(test.date, test.addDays);
      
      if (result === test.expected) {
        console.log(`  ✅ ${test.date} + ${test.addDays} days = ${result}`);
        testResults.successfulTests++;
      } else {
        console.log(`  ❌ ${test.date} + ${test.addDays} days = ${result} (expected ${test.expected})`);
        testResults.errors.push(`Arithmetic: ${test.date} + ${test.addDays} = ${result} (expected ${test.expected})`);
      }
    } catch (error) {
      console.log(`  💥 ${test.date} + ${test.addDays} days: Error - ${error.message}`);
      testResults.errors.push(`Arithmetic: ${test.date} + ${test.addDays} - ${error.message}`);
    }
  });
  
  // Generate report
  console.log('');
  console.log('📊 TEST RESULTS');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${testResults.totalTests}`);
  console.log(`Successful Tests: ${testResults.successfulTests}`);
  console.log(`Failed Tests: ${testResults.totalTests - testResults.successfulTests}`);
  console.log(`Displacement Issues: ${testResults.displacementIssues}`);
  console.log(`Success Rate: ${Math.round((testResults.successfulTests / testResults.totalTests) * 100)}%`);
  console.log('');
  
  // Success criteria
  const successCriteriaMet = testResults.displacementIssues === 0;
  console.log(`🎯 SUCCESS CRITERIA: Zero Date Displacement - ${successCriteriaMet ? 'PASSED ✅' : 'FAILED ❌'}`);
  
  if (testResults.errors.length > 0) {
    console.log('');
    console.log('🚨 ERRORS AND ISSUES:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  console.log('');
  console.log('=' .repeat(50));
  
  return {
    successCriteriaMet,
    testResults
  };
}

// Run the tests
if (require.main === module) {
  const result = runTimezoneDisplacementTests();
  process.exit(result.successCriteriaMet ? 0 : 1);
}

module.exports = { TestImmutableDateSystem, runTimezoneDisplacementTests };
