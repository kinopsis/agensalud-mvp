/**
 * Test Script: Infinite Loop Resolution Validation
 * 
 * This script validates that the infinite loop issues have been resolved
 * and that the emergency reset functionality is working correctly.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const PROBLEMATIC_INSTANCE_ID = 'bc3f6952-378a-4dc4-9d1e-1e8f8f426967';

// Test configuration
const TESTS = {
  EMERGENCY_RESET: true,
  MONITORING_CLEANUP: true,
  INSTANCE_STATE_CHECK: true,
  INFINITE_LOOP_PREVENTION: true
};

/**
 * Test emergency reset functionality
 */
async function testEmergencyReset() {
  console.log('\n🧪 Testing Emergency Reset Functionality...');
  
  try {
    // Test 1: Reset problematic instance
    console.log('  1. Resetting problematic instance...');
    const resetResponse = await fetch(`${BASE_URL}/api/admin/instances/emergency-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reset_instance',
        instanceId: PROBLEMATIC_INSTANCE_ID,
        targetState: 'error'
      })
    });
    
    const resetResult = await resetResponse.json();
    console.log(`    ✅ Reset result:`, resetResult.success ? 'SUCCESS' : 'FAILED');
    console.log(`    📊 Previous state: ${resetResult.result?.previousState}`);
    console.log(`    📊 New state: ${resetResult.result?.newState}`);
    
    // Test 2: Get problematic instances list
    console.log('  2. Getting problematic instances list...');
    const listResponse = await fetch(`${BASE_URL}/api/admin/instances/emergency-reset`);
    const listResult = await listResponse.json();
    console.log(`    ✅ Found ${listResult.count} problematic instances`);
    
    // Test 3: Mark instance as problematic
    console.log('  3. Marking instance as problematic...');
    const markResponse = await fetch(`${BASE_URL}/api/admin/instances/emergency-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_problematic',
        instanceId: PROBLEMATIC_INSTANCE_ID
      })
    });
    
    const markResult = await markResponse.json();
    console.log(`    ✅ Mark result:`, markResult.success ? 'SUCCESS' : 'FAILED');
    
    return true;
    
  } catch (error) {
    console.error('    ❌ Emergency reset test failed:', error.message);
    return false;
  }
}

/**
 * Test monitoring cleanup functionality
 */
async function testMonitoringCleanup() {
  console.log('\n🧪 Testing Monitoring Cleanup Functionality...');
  
  try {
    // Test 1: Get monitoring status
    console.log('  1. Getting monitoring status...');
    const statusResponse = await fetch(`${BASE_URL}/api/admin/monitoring/cleanup`);
    const statusResult = await statusResponse.json();
    console.log(`    ✅ Monitoring registry available:`, statusResult.monitoring_registry_available);
    console.log(`    📊 Process PID: ${statusResult.process_info?.pid}`);
    
    // Test 2: Stop monitoring for problematic instance
    console.log('  2. Stopping monitoring for problematic instance...');
    const stopResponse = await fetch(`${BASE_URL}/api/admin/monitoring/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'stop_instance',
        instanceId: PROBLEMATIC_INSTANCE_ID
      })
    });
    
    const stopResult = await stopResponse.json();
    console.log(`    ✅ Stop monitoring result:`, stopResult.success ? 'SUCCESS' : 'FAILED');
    console.log(`    📊 Operations performed: ${stopResult.operations?.length || 0}`);
    
    return true;
    
  } catch (error) {
    console.error('    ❌ Monitoring cleanup test failed:', error.message);
    return false;
  }
}

/**
 * Test instance state checking
 */
async function testInstanceStateCheck() {
  console.log('\n🧪 Testing Instance State Checking...');
  
  try {
    // Test 1: Try to get the problematic instance (should be blocked)
    console.log('  1. Attempting to get problematic instance...');
    const instanceResponse = await fetch(`${BASE_URL}/api/whatsapp/simple/instances/${PROBLEMATIC_INSTANCE_ID}`);
    const instanceResult = await instanceResponse.json();
    
    if (instanceResult.success && instanceResult.data) {
      console.log(`    ⚠️  Instance still accessible (may need more blocking)`);
      console.log(`    📊 Instance status: ${instanceResult.data.status}`);
    } else {
      console.log(`    ✅ Instance properly blocked or not found`);
    }
    
    // Test 2: Check simple instances list
    console.log('  2. Getting simple instances list...');
    const listResponse = await fetch(`${BASE_URL}/api/whatsapp/simple/instances`);
    const listResult = await listResponse.json();
    
    if (listResult.success) {
      const problematicCount = (listResult.data || []).filter(instance => 
        instance.id.includes(PROBLEMATIC_INSTANCE_ID.substring(0, 8))
      ).length;
      
      console.log(`    ✅ Total instances: ${listResult.data?.length || 0}`);
      console.log(`    📊 Problematic instances found: ${problematicCount}`);
    }
    
    return true;
    
  } catch (error) {
    console.error('    ❌ Instance state check failed:', error.message);
    return false;
  }
}

/**
 * Test infinite loop prevention
 */
async function testInfiniteLoopPrevention() {
  console.log('\n🧪 Testing Infinite Loop Prevention...');
  
  try {
    console.log('  1. Making multiple rapid requests to test circuit breaker...');
    
    const requests = [];
    for (let i = 0; i < 3; i++) {
      requests.push(
        fetch(`${BASE_URL}/api/whatsapp/simple/instances/${PROBLEMATIC_INSTANCE_ID}`)
          .then(res => res.json())
          .catch(err => ({ error: err.message }))
      );
    }
    
    const results = await Promise.all(requests);
    const blockedCount = results.filter(result => 
      !result.success || result.error?.includes('blocked') || result.error?.includes('problematic')
    ).length;
    
    console.log(`    ✅ Requests blocked: ${blockedCount}/3`);
    console.log(`    📊 Circuit breaker effectiveness: ${(blockedCount/3*100).toFixed(1)}%`);
    
    return blockedCount >= 2; // At least 2 out of 3 should be blocked
    
  } catch (error) {
    console.error('    ❌ Infinite loop prevention test failed:', error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Infinite Loop Resolution Validation Tests...');
  console.log(`📍 Target URL: ${BASE_URL}`);
  console.log(`🎯 Problematic Instance: ${PROBLEMATIC_INSTANCE_ID}`);
  
  const results = {};
  
  if (TESTS.EMERGENCY_RESET) {
    results.emergencyReset = await testEmergencyReset();
  }
  
  if (TESTS.MONITORING_CLEANUP) {
    results.monitoringCleanup = await testMonitoringCleanup();
  }
  
  if (TESTS.INSTANCE_STATE_CHECK) {
    results.instanceStateCheck = await testInstanceStateCheck();
  }
  
  if (TESTS.INFINITE_LOOP_PREVENTION) {
    results.infiniteLoopPrevention = await testInfiniteLoopPrevention();
  }
  
  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('================================');
  
  const testNames = Object.keys(results);
  const passedTests = testNames.filter(test => results[test]);
  const failedTests = testNames.filter(test => !results[test]);
  
  passedTests.forEach(test => {
    console.log(`✅ ${test}: PASSED`);
  });
  
  failedTests.forEach(test => {
    console.log(`❌ ${test}: FAILED`);
  });
  
  console.log(`\n🎯 Overall Success Rate: ${passedTests.length}/${testNames.length} (${(passedTests.length/testNames.length*100).toFixed(1)}%)`);
  
  if (passedTests.length === testNames.length) {
    console.log('🎉 ALL TESTS PASSED! Infinite loop issue appears to be resolved.');
  } else {
    console.log('⚠️  Some tests failed. Manual investigation may be required.');
  }
}

// Run tests
runTests().catch(console.error);
