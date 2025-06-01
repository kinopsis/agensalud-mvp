/**
 * Comprehensive 24-Hour Advance Booking Rule Validation Test
 * 
 * This test validates that the 24-hour advance booking rule is consistently
 * implemented across all components and flows after the critical fixes.
 * 
 * @author AgentSalud MVP Team - Critical Bug Fix Validation
 * @version 1.0.0
 */

const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
const BASE_URL = 'http://localhost:3000';

/**
 * Test role-based permission matrix
 */
const ROLE_PERMISSION_MATRIX = {
  patient: {
    canBook: true,
    canBookForOthers: false,
    subjectToBookingHorizon: true,
    minimumAdvanceHours: 24,
    realTimeBooking: false,
    expectedTodaySlots: 0
  },
  staff: {
    canBook: true,
    canBookForOthers: true,
    subjectToBookingHorizon: false,
    minimumAdvanceHours: 0,
    realTimeBooking: true,
    expectedTodaySlots: '>0'
  },
  admin: {
    canBook: true,
    canBookForOthers: true,
    subjectToBookingHorizon: false,
    minimumAdvanceHours: 0,
    realTimeBooking: true,
    expectedTodaySlots: '>0'
  },
  doctor: {
    canBook: false,
    canBookForOthers: false,
    subjectToBookingHorizon: false,
    minimumAdvanceHours: null,
    realTimeBooking: false,
    accessType: 'read-only',
    expectedTodaySlots: 'N/A'
  }
};

/**
 * Test API endpoints for role-based 24-hour rule enforcement
 */
async function testAPIEndpoints() {
  console.log('🌐 TESTING: API Endpoints - 24-Hour Rule Enforcement');
  console.log('===================================================');

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const results = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    details: []
  };

  // Test scenarios for different roles
  const testScenarios = [
    {
      role: 'patient',
      useStandardRules: true,
      date: today,
      expectedSlots: 0,
      description: 'Patient booking today (should be blocked)'
    },
    {
      role: 'patient',
      useStandardRules: true,
      date: tomorrowStr,
      expectedSlots: '>0',
      description: 'Patient booking tomorrow (should be allowed)'
    },
    {
      role: 'admin',
      useStandardRules: false,
      date: today,
      expectedSlots: '>0',
      description: 'Admin booking today (should be allowed)'
    },
    {
      role: 'staff',
      useStandardRules: false,
      date: today,
      expectedSlots: '>0',
      description: 'Staff booking today (should be allowed)'
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`\n🧪 Testing: ${scenario.description}`);
    results.totalTests++;

    try {
      const params = new URLSearchParams({
        organizationId: ORGANIZATION_ID,
        date: scenario.date,
        duration: '30'
      });

      if (scenario.useStandardRules) {
        params.append('useStandardRules', 'true');
      }

      const response = await fetch(`${BASE_URL}/api/doctors/availability?${params}`);
      const data = await response.json();

      const actualSlots = data.count || 0;
      let testPassed = false;

      if (scenario.expectedSlots === 0) {
        testPassed = actualSlots === 0;
      } else if (scenario.expectedSlots === '>0') {
        testPassed = actualSlots > 0;
      } else {
        testPassed = actualSlots === scenario.expectedSlots;
      }

      if (testPassed) {
        results.passedTests++;
        console.log(`  ✅ PASSED: ${actualSlots} slots (Expected: ${scenario.expectedSlots})`);
      } else {
        results.failedTests++;
        console.log(`  ❌ FAILED: ${actualSlots} slots (Expected: ${scenario.expectedSlots})`);
      }

      results.details.push({
        scenario: scenario.description,
        role: scenario.role,
        date: scenario.date,
        useStandardRules: scenario.useStandardRules,
        expectedSlots: scenario.expectedSlots,
        actualSlots,
        passed: testPassed
      });

    } catch (error) {
      results.failedTests++;
      console.log(`  ❌ ERROR: ${error.message}`);
      
      results.details.push({
        scenario: scenario.description,
        error: error.message,
        passed: false
      });
    }
  }

  return results;
}

/**
 * Test timezone edge cases
 */
async function testTimezoneEdgeCases() {
  console.log('\n🌍 TESTING: Timezone Edge Cases');
  console.log('===============================');

  const edgeCases = [
    {
      name: 'Midnight Boundary',
      description: 'Test booking at midnight transition',
      timeOffset: 0.1 // 6 minutes after midnight
    },
    {
      name: 'Late Night',
      description: 'Test booking late at night',
      timeOffset: 23.5 // 11:30 PM
    },
    {
      name: 'Early Morning',
      description: 'Test booking early morning',
      timeOffset: 6.0 // 6:00 AM
    }
  ];

  const results = [];

  for (const edgeCase of edgeCases) {
    console.log(`\n⏰ Testing: ${edgeCase.name}`);
    
    const now = new Date();
    const testTime = new Date(now);
    testTime.setHours(Math.floor(edgeCase.timeOffset), (edgeCase.timeOffset % 1) * 60, 0, 0);
    
    const timeDifferenceHours = (testTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const shouldBeAllowed = Math.abs(timeDifferenceHours) >= 24;
    
    console.log(`  Current: ${now.toISOString()}`);
    console.log(`  Test time: ${testTime.toISOString()}`);
    console.log(`  Difference: ${timeDifferenceHours.toFixed(2)} hours`);
    console.log(`  Should be allowed: ${shouldBeAllowed ? 'YES' : 'NO'}`);
    
    results.push({
      name: edgeCase.name,
      currentTime: now.toISOString(),
      testTime: testTime.toISOString(),
      timeDifferenceHours,
      shouldBeAllowed
    });
  }

  return results;
}

/**
 * Test role-based permission matrix compliance
 */
async function testRolePermissionMatrix() {
  console.log('\n👥 TESTING: Role-Based Permission Matrix Compliance');
  console.log('==================================================');

  const today = new Date().toISOString().split('T')[0];
  const results = [];

  for (const [role, permissions] of Object.entries(ROLE_PERMISSION_MATRIX)) {
    console.log(`\n🔐 Testing role: ${role.toUpperCase()}`);
    
    if (role === 'doctor') {
      console.log('  📖 Doctor role: Read-only access (no booking capabilities)');
      results.push({
        role,
        status: 'read-only',
        compliance: 'expected'
      });
      continue;
    }

    try {
      const useStandardRules = role === 'patient';
      const params = new URLSearchParams({
        organizationId: ORGANIZATION_ID,
        date: today,
        duration: '30'
      });

      if (useStandardRules) {
        params.append('useStandardRules', 'true');
      }

      const response = await fetch(`${BASE_URL}/api/doctors/availability?${params}`);
      const data = await response.json();
      const actualSlots = data.count || 0;

      let compliance = 'unknown';
      if (permissions.expectedTodaySlots === 0) {
        compliance = actualSlots === 0 ? 'compliant' : 'non-compliant';
      } else if (permissions.expectedTodaySlots === '>0') {
        compliance = actualSlots > 0 ? 'compliant' : 'non-compliant';
      }

      console.log(`  📊 Today's slots: ${actualSlots}`);
      console.log(`  📋 Expected: ${permissions.expectedTodaySlots}`);
      console.log(`  ✅ Compliance: ${compliance}`);

      results.push({
        role,
        actualSlots,
        expectedSlots: permissions.expectedTodaySlots,
        compliance,
        permissions
      });

    } catch (error) {
      console.log(`  ❌ Error testing ${role}: ${error.message}`);
      results.push({
        role,
        error: error.message,
        compliance: 'error'
      });
    }
  }

  return results;
}

/**
 * Main comprehensive validation function
 */
async function runComprehensive24HourRuleValidation() {
  console.log('🚨 COMPREHENSIVE 24-HOUR ADVANCE BOOKING RULE VALIDATION');
  console.log('=========================================================');
  console.log('Validating consistent enforcement across all components and flows');
  console.log('');

  try {
    // Run all validation tests
    const apiResults = await testAPIEndpoints();
    const timezoneResults = await testTimezoneEdgeCases();
    const roleResults = await testRolePermissionMatrix();

    // Generate comprehensive report
    console.log('\n📊 COMPREHENSIVE VALIDATION SUMMARY');
    console.log('===================================');

    const totalApiTests = apiResults.totalTests;
    const passedApiTests = apiResults.passedTests;
    const failedApiTests = apiResults.failedTests;
    const apiSuccessRate = ((passedApiTests / totalApiTests) * 100).toFixed(1);

    const compliantRoles = roleResults.filter(r => r.compliance === 'compliant').length;
    const totalRoles = roleResults.filter(r => r.compliance !== 'read-only').length;
    const roleComplianceRate = ((compliantRoles / totalRoles) * 100).toFixed(1);

    console.log(`API Tests: ${passedApiTests}/${totalApiTests} passed (${apiSuccessRate}%)`);
    console.log(`Role Compliance: ${compliantRoles}/${totalRoles} compliant (${roleComplianceRate}%)`);
    console.log(`Timezone Edge Cases: ${timezoneResults.length} analyzed`);

    // Determine overall status
    const overallStatus = failedApiTests === 0 && compliantRoles === totalRoles ? 'HEALTHY' : 'NEEDS_ATTENTION';

    console.log('\n🎯 OVERALL STATUS');
    console.log('=================');
    console.log(`24-Hour Rule Implementation: ${overallStatus}`);

    if (overallStatus === 'HEALTHY') {
      console.log('✅ All tests passed - 24-hour advance booking rule is working correctly');
      console.log('✅ Role-based permissions are properly enforced');
      console.log('✅ API endpoints are consistent');
    } else {
      console.log('❌ Some tests failed - review implementation for inconsistencies');
      
      if (failedApiTests > 0) {
        console.log(`   - ${failedApiTests} API tests failed`);
      }
      
      if (compliantRoles < totalRoles) {
        console.log(`   - ${totalRoles - compliantRoles} roles are non-compliant`);
      }
    }

    return {
      overallStatus,
      apiResults,
      timezoneResults,
      roleResults,
      summary: {
        apiSuccessRate: parseFloat(apiSuccessRate),
        roleComplianceRate: parseFloat(roleComplianceRate),
        totalTests: totalApiTests + totalRoles,
        passedTests: passedApiTests + compliantRoles
      }
    };

  } catch (error) {
    console.error('\n💥 COMPREHENSIVE VALIDATION FAILED:', error);
    return null;
  }
}

// Export for use in other tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runComprehensive24HourRuleValidation,
    testAPIEndpoints,
    testTimezoneEdgeCases,
    testRolePermissionMatrix,
    ROLE_PERMISSION_MATRIX
  };
}

// Run validation if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runComprehensive24HourRuleValidation()
    .then(results => {
      console.log('\n🏁 COMPREHENSIVE VALIDATION COMPLETE');
      if (results && results.overallStatus === 'HEALTHY') {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 COMPREHENSIVE VALIDATION FAILED:', error);
      process.exit(1);
    });
}
