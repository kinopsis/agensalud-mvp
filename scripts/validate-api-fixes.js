/**
 * @fileoverview API Fixes Validation Tool
 * Validates that all management APIs now return data in the correct format
 * after fixing the response structure inconsistencies
 */

require('dotenv').config({ path: '.env.local' });

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const BASE_URL = 'http://localhost:3000';

// Expected counts
const expectedCounts = {
  users: 13,
  patients: 3,
  doctors: 5,
  appointments: 10
};

/**
 * API Validation Results Tracker
 */
class APIValidator {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 Testing: ${name}`);
      const result = await testFn();
      console.log(`✅ PASSED: ${name}`);
      if (result.details) {
        console.log(`   ${result.details}`);
      }
      console.log('');
      this.passed++;
      this.tests.push({ name, status: 'PASSED', error: null, result });
      return result;
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
      console.log('');
      this.failed++;
      this.tests.push({ name, status: 'FAILED', error: error.message, result: null });
      throw error;
    }
  }

  printSummary() {
    console.log('=' .repeat(60));
    console.log('📊 API FIXES VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    console.log('');

    if (this.failed === 0) {
      console.log('🎉 ALL APIs FIXED! Management pages should now work correctly.');
      console.log('   Debug tool should show all expected data counts.');
    } else {
      console.log('⚠️  Some APIs still have issues. Check the failed tests above.');
    }

    console.log('=' .repeat(60));
  }
}

/**
 * Test API endpoint with expected format
 */
async function testAPI(name, endpoint, expectedCount) {
  const url = `${BASE_URL}${endpoint}?organizationId=${ORGANIZATION_ID}`;

  try {
    console.log(`   🔍 Testing: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real browser, authentication cookies would be included
      }
    });

    console.log(`   📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`   📋 Response structure:`, Object.keys(result));

    // Check if response has 'data' field
    if (!result.data) {
      throw new Error(`Response missing 'data' field. Found: ${Object.keys(result).join(', ')}`);
    }

    const actualCount = result.data.length;
    console.log(`   📊 Expected: ${expectedCount}, Actual: ${actualCount}`);

    if (actualCount !== expectedCount) {
      throw new Error(`Count mismatch: expected ${expectedCount}, got ${actualCount}`);
    }

    // Show sample data
    if (result.data.length > 0) {
      console.log(`   📋 Sample item keys:`, Object.keys(result.data[0]));
    }

    return {
      details: `✓ ${name}: ${actualCount}/${expectedCount} items with correct format`,
      count: actualCount,
      expectedCount,
      hasCorrectFormat: true
    };

  } catch (error) {
    throw new Error(`${name} failed: ${error.message}`);
  }
}

/**
 * Test all management APIs
 */
async function testAllAPIs() {
  const tests = [
    { name: 'Users API', endpoint: '/api/users', expected: expectedCounts.users },
    { name: 'Patients API', endpoint: '/api/patients', expected: expectedCounts.patients },
    { name: 'Doctors API', endpoint: '/api/doctors', expected: expectedCounts.doctors },
    { name: 'Appointments API', endpoint: '/api/appointments', expected: expectedCounts.appointments }
  ];

  const results = [];

  for (const test of tests) {
    try {
      const result = await testAPI(test.name, test.endpoint, test.expected);
      results.push({ ...test, result, status: 'PASSED' });
    } catch (error) {
      results.push({ ...test, error: error.message, status: 'FAILED' });
    }
  }

  return results;
}

/**
 * Generate test report
 */
function generateTestReport(results) {
  console.log('📋 DETAILED TEST REPORT:\n');

  results.forEach((test, index) => {
    const status = test.status === 'PASSED' ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${test.name}`);
    console.log(`   Endpoint: ${test.endpoint}`);
    console.log(`   Expected: ${test.expected} items`);
    
    if (test.status === 'PASSED') {
      console.log(`   Actual: ${test.result.count} items`);
      console.log(`   Format: Correct (has 'data' field)`);
    } else {
      console.log(`   Error: ${test.error}`);
    }
    console.log('');
  });
}

/**
 * Main validation function
 */
async function main() {
  console.log('🚀 AGENTSALUD MVP - API FIXES VALIDATION');
  console.log('🏥 Organization: VisualCare');
  console.log('🆔 ID: ' + ORGANIZATION_ID);
  console.log('🌐 Base URL: ' + BASE_URL);
  console.log('📅 Date: ' + new Date().toISOString());
  console.log('\n');

  const validator = new APIValidator();

  try {
    console.log('🔍 Testing all management APIs for correct format...\n');

    // Test all APIs
    const results = await testAllAPIs();

    // Generate detailed report
    generateTestReport(results);

    // Update validator stats
    results.forEach(result => {
      if (result.status === 'PASSED') {
        validator.passed++;
      } else {
        validator.failed++;
      }
      validator.tests.push({
        name: result.name,
        status: result.status,
        error: result.error || null,
        result: result.result || null
      });
    });

    // Print summary
    validator.printSummary();

    if (validator.failed === 0) {
      console.log('🎯 NEXT STEPS:');
      console.log('   1. Start development server: npm run dev');
      console.log('   2. Login as admin: laura.gomez.new@visualcare.com');
      console.log('   3. Test debug tool: http://localhost:3000/debug/management-pages');
      console.log('   4. Verify management pages show complete data');
      console.log('');
    }

    // Exit with appropriate code
    process.exit(validator.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error during validation:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { APIValidator, testAPI };
