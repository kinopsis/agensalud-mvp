/**
 * 24-Hour Advance Booking Rule Investigation Test
 * 
 * This test investigates the critical inconsistencies in the 24-hour advance booking rule
 * implementation across different components and flows in the AgentSalud MVP.
 * 
 * @author AgentSalud MVP Team - Critical Bug Investigation
 * @version 1.0.0
 */

const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
const BASE_URL = 'http://localhost:3000';

/**
 * Test different 24-hour rule implementations
 */
async function investigate24HourRuleInconsistencies() {
  console.log('🔍 INVESTIGATING: 24-Hour Advance Booking Rule Inconsistencies');
  console.log('================================================================');

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  console.log(`Today: ${today}`);
  console.log(`Tomorrow: ${tomorrowStr}`);

  const testResults = {
    apiTests: [],
    frontendTests: [],
    inconsistencies: []
  };

  // Test 1: API Availability Endpoint (useStandardRules=true for patients)
  console.log('\n🌐 Testing API: /api/doctors/availability (Patient Rules)');
  try {
    const params = new URLSearchParams({
      organizationId: ORGANIZATION_ID,
      date: today,
      duration: '30',
      useStandardRules: 'true'
    });

    const response = await fetch(`${BASE_URL}/api/doctors/availability?${params}`);
    const data = await response.json();

    testResults.apiTests.push({
      endpoint: '/api/doctors/availability',
      userType: 'patient',
      date: today,
      useStandardRules: true,
      success: data.success,
      slotsCount: data.count || 0,
      expectedBehavior: 'Should block same-day appointments (0 slots)',
      actualBehavior: `Returned ${data.count || 0} slots`,
      isCorrect: (data.count || 0) === 0
    });

    console.log(`  Result: ${data.count || 0} slots (Expected: 0 for patients)`);
    console.log(`  Status: ${(data.count || 0) === 0 ? '✅ CORRECT' : '❌ INCORRECT'}`);

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    testResults.apiTests.push({
      endpoint: '/api/doctors/availability',
      error: error.message
    });
  }

  // Test 2: API Availability Endpoint (useStandardRules=false for admin)
  console.log('\n🌐 Testing API: /api/doctors/availability (Admin Rules)');
  try {
    const params = new URLSearchParams({
      organizationId: ORGANIZATION_ID,
      date: today,
      duration: '30',
      useStandardRules: 'false'
    });

    const response = await fetch(`${BASE_URL}/api/doctors/availability?${params}`);
    const data = await response.json();

    testResults.apiTests.push({
      endpoint: '/api/doctors/availability',
      userType: 'admin',
      date: today,
      useStandardRules: false,
      success: data.success,
      slotsCount: data.count || 0,
      expectedBehavior: 'Should allow same-day appointments (>0 slots)',
      actualBehavior: `Returned ${data.count || 0} slots`,
      isCorrect: (data.count || 0) > 0
    });

    console.log(`  Result: ${data.count || 0} slots (Expected: >0 for admin)`);
    console.log(`  Status: ${(data.count || 0) > 0 ? '✅ CORRECT' : '❌ INCORRECT'}`);

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    testResults.apiTests.push({
      endpoint: '/api/doctors/availability',
      error: error.message
    });
  }

  // Test 3: Appointment Creation API (Patient)
  console.log('\n🌐 Testing API: /api/appointments (Patient Booking)');
  try {
    const appointmentData = {
      appointment_date: today,
      start_time: '10:00',
      end_time: '10:30',
      doctor_id: '2bb3b714-2fd3-44af-a5d2-c623ffaaa84d',
      service_id: 'test-service-id',
      organization_id: ORGANIZATION_ID,
      notes: 'Test appointment for 24-hour rule validation'
    };

    // Note: This would require authentication, so we'll simulate the test
    console.log('  Simulating patient booking for today...');
    console.log('  Expected: Should be blocked with 24-hour advance booking error');
    
    testResults.apiTests.push({
      endpoint: '/api/appointments',
      userType: 'patient',
      date: today,
      expectedBehavior: 'Should reject with 24-hour advance booking error',
      actualBehavior: 'Test simulated (requires auth)',
      isCorrect: null // Would need actual test
    });

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }

  return testResults;
}

/**
 * Test timezone edge cases
 */
async function investigateTimezoneIssues() {
  console.log('\n🌍 INVESTIGATING: Timezone Edge Cases');
  console.log('=====================================');

  const timezoneTests = [];

  // Test different timezone scenarios
  const testScenarios = [
    {
      name: 'Midnight Transition',
      description: 'Test booking at 23:59 vs 00:01',
      time: '23:59'
    },
    {
      name: 'Early Morning',
      description: 'Test booking at 01:00',
      time: '01:00'
    },
    {
      name: 'Business Hours',
      description: 'Test booking at 10:00',
      time: '10:00'
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`\n⏰ Testing: ${scenario.name} (${scenario.time})`);
    
    // Calculate 24 hours from now with specific time
    const now = new Date();
    const testDateTime = new Date();
    testDateTime.setDate(now.getDate() + 1);
    const [hours, minutes] = scenario.time.split(':');
    testDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const timeDifferenceMs = testDateTime.getTime() - now.getTime();
    const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);
    
    console.log(`  Current time: ${now.toISOString()}`);
    console.log(`  Test appointment: ${testDateTime.toISOString()}`);
    console.log(`  Time difference: ${timeDifferenceHours.toFixed(2)} hours`);
    console.log(`  Should be allowed: ${timeDifferenceHours >= 24 ? 'YES' : 'NO'}`);
    
    timezoneTests.push({
      scenario: scenario.name,
      currentTime: now.toISOString(),
      appointmentTime: testDateTime.toISOString(),
      timeDifferenceHours: timeDifferenceHours,
      shouldBeAllowed: timeDifferenceHours >= 24
    });
  }

  return timezoneTests;
}

/**
 * Analyze role-based permission matrix
 */
async function analyzeRoleBasedPermissions() {
  console.log('\n👥 ANALYZING: Role-Based Permission Matrix');
  console.log('==========================================');

  const expectedPermissions = {
    patient: {
      canBook: true,
      canBookForOthers: false,
      subjectToBookingHorizon: true,
      minimumAdvanceHours: 24,
      maximumAdvanceMonths: 6,
      realTimeBooking: false
    },
    staff: {
      canBook: true,
      canBookForOthers: true,
      subjectToBookingHorizon: false,
      minimumAdvanceHours: 0,
      maximumAdvanceMonths: null,
      realTimeBooking: true
    },
    admin: {
      canBook: true,
      canBookForOthers: true,
      subjectToBookingHorizon: false,
      minimumAdvanceHours: 0,
      maximumAdvanceMonths: null,
      realTimeBooking: true
    },
    doctor: {
      canBook: false,
      canBookForOthers: false,
      subjectToBookingHorizon: false,
      minimumAdvanceHours: null,
      maximumAdvanceMonths: null,
      realTimeBooking: false,
      accessType: 'read-only'
    }
  };

  console.log('Expected Permission Matrix:');
  Object.entries(expectedPermissions).forEach(([role, permissions]) => {
    console.log(`\n${role.toUpperCase()}:`);
    Object.entries(permissions).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  });

  return expectedPermissions;
}

/**
 * Main investigation function
 */
async function runComprehensive24HourRuleInvestigation() {
  console.log('🚨 24-HOUR ADVANCE BOOKING RULE INVESTIGATION');
  console.log('==============================================');
  console.log('Investigating critical inconsistencies in role-based booking restrictions');
  console.log('');

  try {
    // Run all investigations
    const apiResults = await investigate24HourRuleInconsistencies();
    const timezoneResults = await investigateTimezoneIssues();
    const permissionMatrix = await analyzeRoleBasedPermissions();

    // Analyze results
    console.log('\n📊 INVESTIGATION SUMMARY');
    console.log('========================');

    const apiTestsPassed = apiResults.apiTests.filter(test => test.isCorrect === true).length;
    const apiTestsFailed = apiResults.apiTests.filter(test => test.isCorrect === false).length;
    const apiTestsUnclear = apiResults.apiTests.filter(test => test.isCorrect === null).length;

    console.log(`API Tests: ${apiTestsPassed} passed, ${apiTestsFailed} failed, ${apiTestsUnclear} unclear`);
    console.log(`Timezone Scenarios: ${timezoneResults.length} analyzed`);

    // Identify critical issues
    console.log('\n🚨 CRITICAL ISSUES IDENTIFIED:');
    
    if (apiTestsFailed > 0) {
      console.log('❌ API endpoint inconsistencies detected');
      apiResults.apiTests.forEach(test => {
        if (test.isCorrect === false) {
          console.log(`   - ${test.endpoint}: ${test.actualBehavior} (Expected: ${test.expectedBehavior})`);
        }
      });
    }

    // Check for timezone edge cases
    const problematicTimezones = timezoneResults.filter(test => 
      test.timeDifferenceHours > 23 && test.timeDifferenceHours < 25
    );
    
    if (problematicTimezones.length > 0) {
      console.log('⚠️ Timezone edge cases detected:');
      problematicTimezones.forEach(test => {
        console.log(`   - ${test.scenario}: ${test.timeDifferenceHours.toFixed(2)} hours difference`);
      });
    }

    return {
      apiResults,
      timezoneResults,
      permissionMatrix,
      summary: {
        apiTestsPassed,
        apiTestsFailed,
        apiTestsUnclear,
        hasTimezoneIssues: problematicTimezones.length > 0,
        overallStatus: apiTestsFailed === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION'
      }
    };

  } catch (error) {
    console.error('\n💥 INVESTIGATION FAILED:', error);
    return null;
  }
}

// Export for use in other tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runComprehensive24HourRuleInvestigation,
    investigate24HourRuleInconsistencies,
    investigateTimezoneIssues,
    analyzeRoleBasedPermissions
  };
}

// Run investigation if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runComprehensive24HourRuleInvestigation()
    .then(results => {
      console.log('\n🏁 INVESTIGATION COMPLETE');
      if (results && results.summary.overallStatus === 'HEALTHY') {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 INVESTIGATION FAILED:', error);
      process.exit(1);
    });
}
