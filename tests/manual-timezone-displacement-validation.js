/**
 * MANUAL TIMEZONE DISPLACEMENT VALIDATION SCRIPT
 * 
 * This script simulates the exact manual testing scenarios that users experience
 * when clicking on dates in the appointment booking system.
 * 
 * Testing Focus:
 * - Date selection in WeeklyAvailabilitySelector
 * - Calendar navigation and date clicking
 * - Appointment booking flow date consistency
 * - Cross-timezone validation
 * 
 * @author AgentSalud MVP Team - Manual Testing Simulation
 * @version 1.0.0
 */

const { ImmutableDateSystem } = require('../src/lib/core/ImmutableDateSystem');

// Simulation of user interactions
class ManualTestingSimulator {
  constructor() {
    this.testResults = [];
    this.displacementIssues = [];
  }

  /**
   * Simulate clicking on a date in the calendar
   */
  simulateDateClick(dateString, userRole = 'patient', timezone = 'UTC') {
    console.log(`\n🖱️  SIMULATING DATE CLICK: ${dateString} (${userRole} in ${timezone})`);
    
    // Set timezone for this test
    process.env.TZ = timezone;
    
    try {
      // Step 1: Validate the clicked date (what the system should do)
      const validation = ImmutableDateSystem.validateAndNormalize(dateString, 'ManualTest');
      
      if (!validation.isValid) {
        console.log(`❌ Date validation failed: ${validation.error}`);
        return { success: false, error: validation.error };
      }

      // Step 2: Check for displacement
      if (validation.displacement?.detected) {
        const issue = {
          originalDate: dateString,
          normalizedDate: validation.normalizedDate,
          displacement: validation.displacement.daysDifference,
          timezone,
          userRole
        };
        
        this.displacementIssues.push(issue);
        console.log(`🚨 DISPLACEMENT DETECTED:`, issue);
        return { success: false, displacement: issue };
      }

      // Step 3: Apply role-based validation
      const roleValidation = this.validateRoleBasedBooking(validation.normalizedDate, userRole);
      
      if (!roleValidation.allowed) {
        console.log(`🔒 Booking blocked: ${roleValidation.reason}`);
        return { success: false, blocked: true, reason: roleValidation.reason };
      }

      // Step 4: Simulate successful date selection
      console.log(`✅ Date selection successful: ${validation.normalizedDate}`);
      
      const result = {
        success: true,
        selectedDate: validation.normalizedDate,
        userRole,
        timezone,
        roleValidation
      };
      
      this.testResults.push(result);
      return result;

    } catch (error) {
      console.log(`💥 Error during date click simulation:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate role-based booking rules
   */
  validateRoleBasedBooking(dateString, userRole) {
    const isPrivilegedUser = ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole);
    const isToday = ImmutableDateSystem.isToday(dateString);
    const isPast = ImmutableDateSystem.isPastDate(dateString);

    if (isPast) {
      return { allowed: false, reason: 'No se pueden agendar citas en fechas pasadas' };
    }

    if (isToday && !isPrivilegedUser) {
      return { 
        allowed: false, 
        reason: 'Los pacientes deben reservar citas con al menos 24 horas de anticipación' 
      };
    }

    return { allowed: true, reason: 'Date is valid for booking' };
  }

  /**
   * Simulate week navigation
   */
  simulateWeekNavigation(startDate, direction, timezone = 'UTC') {
    console.log(`\n📅 SIMULATING WEEK NAVIGATION: ${startDate} ${direction} (${timezone})`);
    
    process.env.TZ = timezone;
    
    try {
      const daysToAdd = direction === 'next' ? 7 : -7;
      const newWeekStart = ImmutableDateSystem.addDays(startDate, daysToAdd);
      
      // Generate week dates
      const weekDates = ImmutableDateSystem.generateWeekDates(newWeekStart);
      
      console.log(`✅ Week navigation successful: ${newWeekStart}`);
      console.log(`📋 Week dates: ${weekDates.join(', ')}`);
      
      // Validate each date in the week
      const weekValidation = weekDates.map(date => {
        const validation = ImmutableDateSystem.validateAndNormalize(date, 'WeekNavigation');
        return {
          date,
          valid: validation.isValid,
          displaced: validation.displacement?.detected || false
        };
      });
      
      const displacedDates = weekValidation.filter(d => d.displaced);
      if (displacedDates.length > 0) {
        console.log(`🚨 DISPLACEMENT in week navigation:`, displacedDates);
        return { success: false, displacedDates };
      }
      
      return { success: true, newWeekStart, weekDates, weekValidation };

    } catch (error) {
      console.log(`💥 Error during week navigation:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run comprehensive manual testing scenarios
   */
  runComprehensiveTests() {
    console.log('🚀 STARTING COMPREHENSIVE MANUAL TESTING SIMULATION');
    console.log('=' .repeat(60));

    const timezones = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'];
    const userRoles = ['patient', 'admin', 'staff', 'doctor'];
    const testDates = [
      '2025-01-15', // Standard date
      '2025-01-31', // Month boundary
      '2025-02-28', // February end
      '2025-03-01', // Month start
      '2025-12-31', // Year end
      '2026-01-01'  // Year start
    ];

    // Test 1: Date clicking across timezones and roles
    console.log('\n📋 TEST 1: Date Clicking Simulation');
    testDates.forEach(date => {
      timezones.forEach(timezone => {
        userRoles.forEach(role => {
          this.simulateDateClick(date, role, timezone);
        });
      });
    });

    // Test 2: Week navigation
    console.log('\n📋 TEST 2: Week Navigation Simulation');
    const weekStartDates = ['2025-01-13', '2025-01-27', '2025-02-24'];
    weekStartDates.forEach(startDate => {
      timezones.forEach(timezone => {
        this.simulateWeekNavigation(startDate, 'next', timezone);
        this.simulateWeekNavigation(startDate, 'prev', timezone);
      });
    });

    // Test 3: Edge cases
    console.log('\n📋 TEST 3: Edge Cases Simulation');
    this.testEdgeCases();

    // Generate report
    this.generateReport();
  }

  /**
   * Test edge cases that commonly cause displacement
   */
  testEdgeCases() {
    const edgeCases = [
      { date: '2025-03-09', description: 'DST Spring Forward (US)' },
      { date: '2025-11-02', description: 'DST Fall Back (US)' },
      { date: '2025-03-30', description: 'DST Spring Forward (EU)' },
      { date: '2025-10-26', description: 'DST Fall Back (EU)' },
      { date: '2024-02-29', description: 'Leap Year February 29' },
      { date: '2025-02-28', description: 'Non-Leap Year February 28' }
    ];

    edgeCases.forEach(({ date, description }) => {
      console.log(`\n🔍 Testing edge case: ${description}`);
      ['UTC', 'America/New_York', 'Europe/London'].forEach(timezone => {
        this.simulateDateClick(date, 'patient', timezone);
      });
    });
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('\n📊 COMPREHENSIVE TEST REPORT');
    console.log('=' .repeat(60));

    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const displacementCount = this.displacementIssues.length;

    console.log(`📈 Total Tests Executed: ${totalTests}`);
    console.log(`✅ Successful Tests: ${successfulTests}`);
    console.log(`❌ Failed Tests: ${totalTests - successfulTests}`);
    console.log(`🚨 Displacement Issues: ${displacementCount}`);

    if (displacementCount > 0) {
      console.log('\n🚨 DISPLACEMENT ISSUES DETECTED:');
      this.displacementIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.originalDate} → ${issue.normalizedDate} (${issue.displacement} days) in ${issue.timezone}`);
      });
    } else {
      console.log('\n🎉 NO DISPLACEMENT ISSUES DETECTED!');
    }

    // Success criteria validation
    const successCriteriaMet = displacementCount === 0;
    console.log(`\n🎯 SUCCESS CRITERIA: Zero Date Displacement - ${successCriteriaMet ? 'PASSED' : 'FAILED'}`);

    return {
      totalTests,
      successfulTests,
      displacementCount,
      successCriteriaMet,
      displacementIssues: this.displacementIssues
    };
  }
}

// Run the manual testing simulation
if (require.main === module) {
  const simulator = new ManualTestingSimulator();
  const report = simulator.runComprehensiveTests();
  
  // Exit with appropriate code
  process.exit(report.successCriteriaMet ? 0 : 1);
}

module.exports = ManualTestingSimulator;
