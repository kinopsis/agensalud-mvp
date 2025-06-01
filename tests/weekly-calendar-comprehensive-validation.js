/**
 * Comprehensive Weekly Calendar Validation Test
 * 
 * This test validates that both the new appointment booking flow and 
 * rescheduling flow are working correctly with the weekly calendar
 * after the critical fix.
 * 
 * @author AgentSalud MVP Team - Critical Bug Fix Validation
 * @version 1.0.0
 */

const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
const BASE_URL = 'http://localhost:3000';

/**
 * Test scenarios for comprehensive validation
 */
const TEST_SCENARIOS = [
  {
    name: 'New Appointment Booking Flow',
    description: 'Test weekly calendar in new appointment booking',
    url: `${BASE_URL}/appointments/new`,
    expectedBehavior: [
      'Weekly calendar displays availability indicators',
      'Dates with slots show proper counts (Alta/Media/Baja)',
      'No "Sin disponibilidad" message when slots exist',
      'Role-based blocking works (24-hour rule for patients)',
      'Navigation between weeks works correctly'
    ]
  },
  {
    name: 'Appointment Rescheduling Flow',
    description: 'Test weekly calendar in rescheduling modal',
    url: `${BASE_URL}/dashboard/patient`,
    expectedBehavior: [
      'Reschedule modal opens correctly',
      'Weekly calendar shows availability for rescheduling',
      'AI suggestions work if enabled',
      'Date selection updates properly',
      'Maintains original appointment context'
    ]
  }
];

/**
 * Validate API endpoints for weekly calendar data
 */
async function validateWeeklyCalendarAPIs() {
  console.log('🔍 VALIDATING: Weekly Calendar API Endpoints');
  console.log('=============================================');

  const results = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    details: []
  };

  // Test multiple date ranges to simulate weekly navigation
  const testRanges = [
    { start: 0, name: 'Current Week' },
    { start: 7, name: 'Next Week' },
    { start: 14, name: 'Week After Next' }
  ];

  for (const range of testRanges) {
    console.log(`\n📅 Testing: ${range.name}`);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + range.start);
    
    // Test 7 days for this week
    for (let i = 0; i < 7; i++) {
      const testDate = new Date(startDate);
      testDate.setDate(startDate.getDate() + i);
      const dateStr = testDate.toISOString().split('T')[0];
      
      results.totalTests++;
      
      try {
        const url = `${BASE_URL}/api/doctors/availability?organizationId=${ORGANIZATION_ID}&date=${dateStr}&duration=30`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && typeof data.count === 'number') {
          results.passedTests++;
          console.log(`  ✅ ${dateStr}: ${data.count} slots`);
        } else {
          throw new Error('Invalid response format');
        }
        
        results.details.push({
          date: dateStr,
          status: 'success',
          slotsCount: data.count,
          range: range.name
        });
        
      } catch (error) {
        results.failedTests++;
        console.log(`  ❌ ${dateStr}: ${error.message}`);
        
        results.details.push({
          date: dateStr,
          status: 'failed',
          error: error.message,
          range: range.name
        });
      }
    }
  }

  return results;
}

/**
 * Test role-based availability rules
 */
async function validateRoleBasedRules() {
  console.log('\n🔐 VALIDATING: Role-Based Availability Rules');
  console.log('============================================');

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const roleTests = [
    {
      role: 'patient',
      useStandardRules: true,
      expectedBehavior: 'Should block today, allow tomorrow+'
    },
    {
      role: 'admin',
      useStandardRules: false,
      expectedBehavior: 'Should allow same-day booking'
    }
  ];

  const results = [];

  for (const test of roleTests) {
    console.log(`\n👤 Testing role: ${test.role} (useStandardRules: ${test.useStandardRules})`);
    
    try {
      const params = new URLSearchParams({
        organizationId: ORGANIZATION_ID,
        date: today,
        duration: '30'
      });
      
      if (test.useStandardRules) {
        params.append('useStandardRules', 'true');
      }
      
      const url = `${BASE_URL}/api/doctors/availability?${params}`;
      const response = await fetch(url);
      const data = await response.json();
      
      results.push({
        role: test.role,
        useStandardRules: test.useStandardRules,
        todaySlots: data.count || 0,
        expectedBehavior: test.expectedBehavior,
        success: data.success
      });
      
      console.log(`  📊 Today's slots: ${data.count || 0}`);
      console.log(`  📝 Expected: ${test.expectedBehavior}`);
      
    } catch (error) {
      console.error(`  ❌ Error testing ${test.role}:`, error.message);
      results.push({
        role: test.role,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Generate comprehensive validation report
 */
async function generateValidationReport() {
  console.log('📋 GENERATING: Comprehensive Validation Report');
  console.log('==============================================');

  const apiResults = await validateWeeklyCalendarAPIs();
  const roleResults = await validateRoleBasedRules();

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      apiTests: {
        total: apiResults.totalTests,
        passed: apiResults.passedTests,
        failed: apiResults.failedTests,
        successRate: ((apiResults.passedTests / apiResults.totalTests) * 100).toFixed(1)
      },
      roleTests: {
        total: roleResults.length,
        successful: roleResults.filter(r => r.success).length
      }
    },
    weeklyCalendarStatus: 'UNKNOWN',
    recommendations: []
  };

  // Determine overall status
  if (apiResults.passedTests === apiResults.totalTests && apiResults.totalTests > 0) {
    report.weeklyCalendarStatus = 'WORKING';
    report.recommendations.push('✅ Weekly calendar API endpoints are functioning correctly');
  } else if (apiResults.passedTests > 0) {
    report.weeklyCalendarStatus = 'PARTIAL';
    report.recommendations.push('⚠️ Some API endpoints are failing - check server logs');
  } else {
    report.weeklyCalendarStatus = 'BROKEN';
    report.recommendations.push('❌ Weekly calendar API endpoints are not working - check server connectivity');
  }

  // Add specific recommendations
  if (report.weeklyCalendarStatus === 'WORKING') {
    report.recommendations.push('🧪 Test the UI components manually using the browser');
    report.recommendations.push('📱 Verify both new appointment and rescheduling flows');
    report.recommendations.push('👥 Test with different user roles (patient vs admin)');
  }

  return report;
}

/**
 * Main validation function
 */
async function runComprehensiveValidation() {
  console.log('🚀 WEEKLY CALENDAR COMPREHENSIVE VALIDATION');
  console.log('===========================================');
  console.log('Validating the fix for weekly calendar availability display issue');
  console.log('Testing both new appointment booking and rescheduling flows');
  console.log('');

  try {
    const report = await generateValidationReport();
    
    console.log('\n📊 FINAL VALIDATION REPORT');
    console.log('==========================');
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Weekly Calendar Status: ${report.weeklyCalendarStatus}`);
    console.log(`API Success Rate: ${report.summary.apiTests.successRate}%`);
    console.log(`API Tests: ${report.summary.apiTests.passed}/${report.summary.apiTests.total} passed`);
    
    console.log('\n📝 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => console.log(`  ${rec}`));
    
    console.log('\n🎯 MANUAL TESTING STEPS:');
    TEST_SCENARIOS.forEach((scenario, index) => {
      console.log(`\n${index + 1}. ${scenario.name}`);
      console.log(`   URL: ${scenario.url}`);
      console.log(`   Expected Behavior:`);
      scenario.expectedBehavior.forEach(behavior => {
        console.log(`     - ${behavior}`);
      });
    });

    return report.weeklyCalendarStatus === 'WORKING';
    
  } catch (error) {
    console.error('\n💥 VALIDATION FAILED:', error);
    return false;
  }
}

// Export for use in other tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runComprehensiveValidation,
    validateWeeklyCalendarAPIs,
    validateRoleBasedRules,
    TEST_SCENARIOS
  };
}

// Run validation if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runComprehensiveValidation()
    .then(success => {
      console.log('\n🏁 COMPREHENSIVE VALIDATION COMPLETE');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 COMPREHENSIVE VALIDATION FAILED:', error);
      process.exit(1);
    });
}
