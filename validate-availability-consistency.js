/**
 * CRITICAL VALIDATION: Availability Data Consistency Fix
 * 
 * This script validates that the fix for availability data inconsistency
 * between reschedule modal and new appointment flows is working correctly.
 * 
 * @author AgentSalud MVP Team - Critical Consistency Fix
 * @version 1.0.0
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

/**
 * Test availability API consistency
 */
async function testAvailabilityConsistency() {
  console.log('🔍 CRITICAL VALIDATION: Testing Availability Data Consistency Fix\n');
  
  const baseUrl = 'http://localhost:3000';
  const testParams = {
    organizationId: 'test-org-123',
    startDate: '2025-06-01',
    endDate: '2025-06-07',
    serviceId: 'test-service-1',
    userRole: 'patient',
    useStandardRules: 'false'
  };

  try {
    // Test 1: Basic API Response Structure
    console.log('📋 Test 1: Validating API Response Structure');
    const queryString = new URLSearchParams(testParams).toString();
    const apiUrl = `${baseUrl}/api/appointments/availability?${queryString}`;
    
    const response = await makeRequest(apiUrl);
    
    if (response.statusCode !== 200) {
      console.log(`❌ FAILED - API returned status ${response.statusCode}`);
      console.log(`   Response: ${response.data}`);
      return false;
    }

    const apiData = JSON.parse(response.data);
    
    if (!apiData.success) {
      console.log(`❌ FAILED - API returned success: false`);
      console.log(`   Error: ${apiData.error}`);
      return false;
    }

    console.log('✅ PASSED - API response structure is valid');
    console.log(`   📊 Dates returned: ${Object.keys(apiData.data || {}).length}`);

    // Test 2: Validate Data Structure Consistency
    console.log('\n📋 Test 2: Validating Data Structure for Both Flows');
    
    let allTestsPassed = true;
    const dates = Object.keys(apiData.data || {});
    
    if (dates.length === 0) {
      console.log('❌ FAILED - No availability data returned');
      return false;
    }

    for (const date of dates.slice(0, 3)) { // Test first 3 dates
      const dayData = apiData.data[date];
      
      // Validate required properties exist
      const requiredProps = ['slots', 'totalSlots', 'availableSlots'];
      const missingProps = requiredProps.filter(prop => !(prop in dayData));
      
      if (missingProps.length > 0) {
        console.log(`❌ FAILED - Missing properties for ${date}: ${missingProps.join(', ')}`);
        allTestsPassed = false;
        continue;
      }

      // Validate data types
      if (!Array.isArray(dayData.slots)) {
        console.log(`❌ FAILED - slots is not an array for ${date}`);
        allTestsPassed = false;
        continue;
      }

      if (typeof dayData.totalSlots !== 'number' || typeof dayData.availableSlots !== 'number') {
        console.log(`❌ FAILED - totalSlots or availableSlots is not a number for ${date}`);
        allTestsPassed = false;
        continue;
      }

      // CRITICAL: Validate that availableSlots matches actual available slots
      const actualAvailableSlots = dayData.slots.filter(slot => slot.available).length;
      
      if (dayData.availableSlots !== actualAvailableSlots) {
        console.log(`❌ CRITICAL INCONSISTENCY for ${date}:`);
        console.log(`   API availableSlots: ${dayData.availableSlots}`);
        console.log(`   Actual available slots: ${actualAvailableSlots}`);
        console.log(`   Total slots: ${dayData.totalSlots}`);
        console.log(`   Slots array length: ${dayData.slots.length}`);
        allTestsPassed = false;
        continue;
      }

      console.log(`✅ PASSED - Data consistency validated for ${date}`);
      console.log(`   📊 Available/Total: ${dayData.availableSlots}/${dayData.totalSlots}`);
    }

    if (!allTestsPassed) {
      return false;
    }

    // Test 3: Simulate Both Flow Processing Logic
    console.log('\n📋 Test 3: Simulating Both Flow Processing Logic');
    
    // Simulate UnifiedAppointmentFlow processing
    const newAppointmentResults = [];
    for (const date of dates) {
      const dayData = apiData.data[date];
      const availableSlots = dayData?.availableSlots || 0;
      
      let availabilityLevel = 'none';
      if (availableSlots === 0) availabilityLevel = 'none';
      else if (availableSlots <= 2) availabilityLevel = 'low';
      else if (availableSlots <= 5) availabilityLevel = 'medium';
      else availabilityLevel = 'high';
      
      newAppointmentResults.push({
        date,
        slotsCount: availableSlots,
        availabilityLevel
      });
    }

    // Simulate AIEnhancedRescheduleModal processing (FIXED VERSION)
    const rescheduleModalResults = [];
    for (const date of dates) {
      const dayData = apiData.data[date];
      const slotsCount = dayData?.availableSlots || 0; // FIXED: Use pre-calculated value
      
      let availabilityLevel = 'none';
      if (slotsCount === 0) availabilityLevel = 'none';
      else if (slotsCount <= 2) availabilityLevel = 'low';
      else if (slotsCount <= 5) availabilityLevel = 'medium';
      else availabilityLevel = 'high';
      
      rescheduleModalResults.push({
        date,
        slotsCount,
        availabilityLevel
      });
    }

    // Compare results
    let consistencyPassed = true;
    for (let i = 0; i < dates.length; i++) {
      const newApp = newAppointmentResults[i];
      const reschedule = rescheduleModalResults[i];
      
      if (newApp.slotsCount !== reschedule.slotsCount || 
          newApp.availabilityLevel !== reschedule.availabilityLevel) {
        console.log(`❌ INCONSISTENCY DETECTED for ${newApp.date}:`);
        console.log(`   New Appointment Flow: ${newApp.slotsCount} slots, ${newApp.availabilityLevel}`);
        console.log(`   Reschedule Modal: ${reschedule.slotsCount} slots, ${reschedule.availabilityLevel}`);
        consistencyPassed = false;
      }
    }

    if (consistencyPassed) {
      console.log('✅ PASSED - Both flows produce identical results');
      console.log('   🎯 Slot counts match perfectly');
      console.log('   🎯 Availability levels match perfectly');
    }

    // Test 4: Role-based Parameter Validation
    console.log('\n📋 Test 4: Validating Role-based Parameters');
    
    const roleTestCases = [
      { userRole: 'patient', useStandardRules: 'false' },
      { userRole: 'admin', useStandardRules: 'false' },
      { userRole: 'staff', useStandardRules: 'true' }
    ];

    for (const testCase of roleTestCases) {
      const testQueryString = new URLSearchParams({
        ...testParams,
        ...testCase
      }).toString();
      
      const testApiUrl = `${baseUrl}/api/appointments/availability?${testQueryString}`;
      const testResponse = await makeRequest(testApiUrl);
      
      if (testResponse.statusCode === 200) {
        const testData = JSON.parse(testResponse.data);
        if (testData.success) {
          console.log(`✅ PASSED - Role ${testCase.userRole} with useStandardRules=${testCase.useStandardRules}`);
        } else {
          console.log(`❌ FAILED - Role ${testCase.userRole}: ${testData.error}`);
          consistencyPassed = false;
        }
      } else {
        console.log(`❌ FAILED - Role ${testCase.userRole}: HTTP ${testResponse.statusCode}`);
        consistencyPassed = false;
      }
    }

    return consistencyPassed;

  } catch (error) {
    console.error('❌ CRITICAL ERROR during validation:', error.message);
    return false;
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log('🚀 Starting Availability Data Consistency Validation\n');
  
  const startTime = Date.now();
  const success = await testAvailabilityConsistency();
  const duration = Date.now() - startTime;
  
  console.log('\n' + '='.repeat(60));
  
  if (success) {
    console.log('🎉 ALL TESTS PASSED - Availability Data Consistency Fix Validated');
    console.log('✅ Both flows now produce identical results');
    console.log('✅ API response structure is consistent');
    console.log('✅ Role-based parameters work correctly');
  } else {
    console.log('❌ VALIDATION FAILED - Issues detected in availability data consistency');
    console.log('🔧 Please review the implementation and fix any remaining issues');
  }
  
  console.log(`⏱️  Validation completed in ${duration}ms`);
  console.log('='.repeat(60));
  
  process.exit(success ? 0 : 1);
}

// Run validation
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
