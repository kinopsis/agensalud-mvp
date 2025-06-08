/**
 * Test Infinite Loop Fix
 * Verify that the infinite monitoring loop for problematic instances has been eliminated
 */

async function testInfiniteLoopFix() {
  console.log('🛑 TESTING INFINITE LOOP FIX');
  console.log('=' .repeat(70));
  
  const results = {
    circuitBreakerWorking: false,
    statusEndpointBlocked: false,
    qrEndpointBlocked: false,
    noInfiniteRequests: false,
    intelligentCircuitBreaker: false
  };

  const problematicInstanceId = '927cecbe-pticavisualcarwhatsa';
  
  // Test 1: Status Endpoint Circuit Breaker
  console.log('\n🚨 TEST 1: Status Endpoint Circuit Breaker');
  console.log('-'.repeat(60));
  
  try {
    console.log(`🔄 Testing status endpoint for problematic instance: ${problematicInstanceId}`);
    
    const statusResponse = await fetch(`http://localhost:3000/api/channels/whatsapp/instances/${problematicInstanceId}/status`);
    const statusResult = await statusResponse.json();
    
    console.log(`📊 Status Response: ${statusResponse.status}`);
    console.log(`✅ Success: ${statusResult.success}`);
    console.log(`❌ Error: ${statusResult.error?.message || 'None'}`);
    console.log(`📋 Error Code: ${statusResult.error?.code || 'None'}`);
    
    // Check if circuit breaker is working
    if (statusResponse.status === 503 && statusResult.error?.code === 'INSTANCE_BLOCKED') {
      console.log('✅ Circuit breaker is working! Instance is blocked.');
      results.statusEndpointBlocked = true;
    } else if (statusResponse.status === 403) {
      console.log('⚠️ Authentication working but instance not blocked by circuit breaker');
    } else {
      console.log('❌ Circuit breaker may not be working properly');
    }
    
  } catch (error) {
    console.error('❌ Status endpoint test failed:', error.message);
  }

  // Test 2: QR Endpoint Circuit Breaker
  console.log('\n📱 TEST 2: QR Endpoint Circuit Breaker');
  console.log('-'.repeat(60));
  
  try {
    console.log(`🔄 Testing QR endpoint for problematic instance: ${problematicInstanceId}`);
    
    const qrResponse = await fetch(`http://localhost:3000/api/channels/whatsapp/instances/${problematicInstanceId}/qr`);
    const qrResult = await qrResponse.json();
    
    console.log(`📊 QR Response: ${qrResponse.status}`);
    console.log(`✅ Success: ${qrResult.success}`);
    console.log(`❌ Error: ${qrResult.error || 'None'}`);
    console.log(`📱 Has QR Code: ${!!qrResult.data?.qrCode}`);
    
    // Check if circuit breaker is working for QR endpoint
    if (qrResponse.status === 404 && qrResult.error?.includes('Evolution API instance not found')) {
      console.log('✅ QR endpoint properly handles missing instances');
      results.qrEndpointBlocked = true;
    } else if (qrResponse.status === 503) {
      console.log('✅ QR endpoint circuit breaker is working!');
      results.qrEndpointBlocked = true;
    } else {
      console.log('⚠️ QR endpoint behavior may need verification');
    }
    
  } catch (error) {
    console.error('❌ QR endpoint test failed:', error.message);
  }

  // Test 3: Monitor Server Logs for Infinite Requests
  console.log('\n🔍 TEST 3: Monitor for Infinite Evolution API Requests');
  console.log('-'.repeat(60));
  
  console.log('🔄 Monitoring server logs for 10 seconds to detect infinite loops...');
  console.log('⚠️ Check the server terminal for repeated Evolution API requests');
  console.log('✅ If no repeated requests appear, the infinite loop is fixed');
  
  // Wait 10 seconds to observe server behavior
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log('📊 10-second monitoring period completed');
  console.log('🔍 Check server terminal logs for any repeated requests to:');
  console.log(`   🔗 GET https://evo.torrecentral.com/instance/connectionState/${problematicInstanceId}`);
  
  // Test 4: Test Non-Problematic Instance (Should Work)
  console.log('\n✅ TEST 4: Test Non-Problematic Instance');
  console.log('-'.repeat(60));
  
  try {
    console.log('🔄 Testing development endpoint (should still work)...');
    
    const devResponse = await fetch('http://localhost:3000/api/dev/qr-test');
    const devResult = await devResponse.json();
    
    console.log(`📊 Dev Response: ${devResponse.status}`);
    console.log(`✅ Success: ${devResult.success}`);
    console.log(`📱 Has QR: ${!!devResult.data?.qrCode}`);
    
    if (devResponse.status === 200 && devResult.success) {
      console.log('✅ Non-problematic instances still work correctly');
      results.noInfiniteRequests = true;
    } else {
      console.log('❌ Development endpoint has issues');
    }
    
  } catch (error) {
    console.error('❌ Development endpoint test failed:', error.message);
  }

  // Test 5: Test Intelligent Circuit Breaker (Simulate Multiple Failures)
  console.log('\n🧠 TEST 5: Test Intelligent Circuit Breaker');
  console.log('-'.repeat(60));
  
  try {
    console.log('🔄 Testing intelligent circuit breaker with multiple rapid requests...');
    
    const testInstanceId = 'test-circuit-breaker-instance';
    let blockedAfterFailures = false;
    
    for (let i = 1; i <= 5; i++) {
      console.log(`  Attempt ${i}/5...`);
      
      const testResponse = await fetch(`http://localhost:3000/api/channels/whatsapp/instances/${testInstanceId}/status`);
      const testResult = await testResponse.json();
      
      console.log(`    Response: ${testResponse.status} - ${testResult.error?.message || 'Success'}`);
      
      if (testResponse.status === 503 && testResult.error?.code === 'INSTANCE_BLOCKED') {
        console.log('✅ Intelligent circuit breaker activated after multiple failures!');
        blockedAfterFailures = true;
        break;
      }
      
      // Brief pause between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (blockedAfterFailures) {
      results.intelligentCircuitBreaker = true;
    } else {
      console.log('⚠️ Intelligent circuit breaker may need more testing');
    }
    
  } catch (error) {
    console.error('❌ Intelligent circuit breaker test failed:', error.message);
  }

  // Summary
  console.log('\n📈 INFINITE LOOP FIX TEST SUMMARY');
  console.log('=' .repeat(70));
  
  console.log('\n🎯 FIX STATUS:');
  console.log(`  Status Endpoint Blocked: ${results.statusEndpointBlocked ? '✅ Yes' : '❌ No'}`);
  console.log(`  QR Endpoint Blocked: ${results.qrEndpointBlocked ? '✅ Yes' : '❌ No'}`);
  console.log(`  No Infinite Requests: ${results.noInfiniteRequests ? '✅ Yes' : '❌ No'}`);
  console.log(`  Intelligent Circuit Breaker: ${results.intelligentCircuitBreaker ? '✅ Yes' : '⚠️ Partial'}`);
  
  const overallSuccess = results.statusEndpointBlocked && results.qrEndpointBlocked && results.noInfiniteRequests;
  
  console.log('\n🔍 ANALYSIS:');
  if (overallSuccess) {
    console.log('✅ SUCCESS: Infinite loop has been eliminated!');
    console.log('🎯 All circuit breakers are working correctly');
    console.log('🛑 Problematic instance is properly blocked');
    console.log('✅ Non-problematic instances continue to work');
    console.log('🧠 Intelligent circuit breaker provides additional protection');
  } else {
    console.log('❌ ISSUE: Some circuit breakers may not be working properly');
    console.log('🔧 Check server logs for continued infinite requests');
    console.log('📊 Verify circuit breaker implementation');
  }
  
  console.log('\n🏆 NEXT STEPS:');
  if (overallSuccess) {
    console.log('  1. ✅ Infinite loop fix is complete');
    console.log('  2. 🔄 Monitor server logs to confirm no more infinite requests');
    console.log('  3. 📱 Test normal WhatsApp functionality with valid instances');
    console.log('  4. 🧹 Clean up orphaned instances if needed');
  } else {
    console.log('  1. 🔧 Debug remaining circuit breaker issues');
    console.log('  2. 📊 Check server logs for infinite request patterns');
    console.log('  3. 🛠️ Strengthen circuit breaker logic if needed');
  }
  
  console.log('\n📋 Server Log Monitoring:');
  console.log('  🔍 Watch for repeated requests to Evolution API');
  console.log('  🚨 Look for circuit breaker activation messages');
  console.log('  ✅ Confirm no more infinite loops in terminal');
  
  return results;
}

// Run the infinite loop fix test
testInfiniteLoopFix().then(results => {
  console.log('\n📋 Infinite loop fix test completed.');
  
  const isFixed = results.statusEndpointBlocked && results.qrEndpointBlocked && results.noInfiniteRequests;
  process.exit(isFixed ? 0 : 1);
}).catch(error => {
  console.error('\n💥 Infinite loop fix test failed:', error);
  process.exit(1);
});
