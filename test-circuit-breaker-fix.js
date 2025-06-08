/**
 * Test Circuit Breaker Fix
 * Verify that the previously blocked instance can now access endpoints
 */

async function testCircuitBreakerFix() {
  console.log('🔧 TESTING CIRCUIT BREAKER FIX');
  console.log('=' .repeat(60));
  
  const results = {
    statusEndpoint: {},
    qrEndpoint: {},
    circuitBreakerRemoved: false
  };

  const blockedInstanceId = '927cecbe-pticavisualcarwhatsa';
  
  // Test 1: Status Endpoint Access
  console.log('\n📊 TEST 1: Status Endpoint Access');
  console.log('-'.repeat(50));
  
  try {
    console.log(`🔄 Testing status endpoint for previously blocked instance: ${blockedInstanceId}`);
    
    const statusResponse = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/test-${blockedInstanceId}/status`);
    const statusResult = await statusResponse.json();
    
    results.statusEndpoint = {
      status: statusResponse.status,
      success: statusResult.success,
      error: statusResult.error,
      isBlocked: statusResult.error?.code === 'INSTANCE_BLOCKED'
    };
    
    console.log(`📊 Status Response: ${statusResponse.status}`);
    console.log(`✅ Success: ${statusResult.success}`);
    console.log(`❌ Error: ${statusResult.error?.message || 'None'}`);
    console.log(`🚫 Is Blocked: ${results.statusEndpoint.isBlocked ? 'Yes' : 'No'}`);
    
    if (!results.statusEndpoint.isBlocked) {
      console.log('✅ Circuit breaker appears to be removed from status endpoint');
    } else {
      console.log('❌ Circuit breaker is still active on status endpoint');
    }
    
  } catch (error) {
    console.error('❌ Status endpoint test failed:', error.message);
    results.statusEndpoint = { error: error.message };
  }

  // Test 2: QR Endpoint Access
  console.log('\n📱 TEST 2: QR Endpoint Access');
  console.log('-'.repeat(50));
  
  try {
    console.log(`🔄 Testing QR endpoint for previously blocked instance: ${blockedInstanceId}`);
    
    const qrResponse = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/test-${blockedInstanceId}/qr`);
    const qrResult = await qrResponse.json();
    
    results.qrEndpoint = {
      status: qrResponse.status,
      success: qrResult.success,
      error: qrResult.error,
      hasQRCode: !!qrResult.data?.qrCode,
      authTime: qrResult.performance?.authTime
    };
    
    console.log(`📊 QR Response: ${qrResponse.status}`);
    console.log(`✅ Success: ${qrResult.success}`);
    console.log(`❌ Error: ${qrResult.error || 'None'}`);
    console.log(`📱 Has QR Code: ${results.qrEndpoint.hasQRCode ? 'Yes' : 'No'}`);
    console.log(`⏱️  Auth Time: ${results.qrEndpoint.authTime || 'N/A'}ms`);
    
    // Check if this is still a circuit breaker block or a different error
    if (qrResult.error && qrResult.error.includes('blocked')) {
      console.log('❌ Circuit breaker may still be active on QR endpoint');
    } else if (qrResult.error && qrResult.error.includes('User profile not found')) {
      console.log('⚠️ Circuit breaker removed, but authentication issue remains');
    } else if (qrResult.success) {
      console.log('✅ QR endpoint is now accessible');
    }
    
  } catch (error) {
    console.error('❌ QR endpoint test failed:', error.message);
    results.qrEndpoint = { error: error.message };
  }

  // Test 3: Compare with Non-Blocked Instance
  console.log('\n🔄 TEST 3: Compare with Non-Blocked Instance');
  console.log('-'.repeat(50));
  
  try {
    const normalInstanceId = 'test-normal-instance';
    console.log(`🔄 Testing normal instance for comparison: ${normalInstanceId}`);
    
    const normalResponse = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/${normalInstanceId}/status`);
    const normalResult = await normalResponse.json();
    
    console.log(`📊 Normal Instance Status: ${normalResponse.status}`);
    console.log(`✅ Normal Instance Success: ${normalResult.success}`);
    console.log(`❌ Normal Instance Error: ${normalResult.error?.message || 'None'}`);
    
    // Compare error types
    const blockedError = results.statusEndpoint.error?.code;
    const normalError = normalResult.error?.code;
    
    if (blockedError === normalError) {
      console.log('✅ Previously blocked instance now behaves like normal instances');
      results.circuitBreakerRemoved = true;
    } else if (blockedError === 'INSTANCE_BLOCKED') {
      console.log('❌ Previously blocked instance still shows circuit breaker error');
      results.circuitBreakerRemoved = false;
    } else {
      console.log('⚠️ Previously blocked instance shows different error - circuit breaker likely removed');
      results.circuitBreakerRemoved = true;
    }
    
  } catch (error) {
    console.error('❌ Normal instance comparison failed:', error.message);
  }

  // Summary
  console.log('\n📈 CIRCUIT BREAKER FIX SUMMARY');
  console.log('=' .repeat(60));
  
  console.log('\n🎯 FIX STATUS:');
  console.log(`  Circuit Breaker Removed: ${results.circuitBreakerRemoved ? '✅ Yes' : '❌ No'}`);
  console.log(`  Status Endpoint Accessible: ${!results.statusEndpoint.isBlocked ? '✅ Yes' : '❌ No'}`);
  console.log(`  QR Endpoint Accessible: ${results.qrEndpoint.status !== 503 ? '✅ Yes' : '❌ No'}`);
  
  console.log('\n📊 ENDPOINT RESPONSES:');
  console.log(`  Status Endpoint: ${results.statusEndpoint.status || 'Failed'} - ${results.statusEndpoint.error?.message || 'Success'}`);
  console.log(`  QR Endpoint: ${results.qrEndpoint.status || 'Failed'} - ${results.qrEndpoint.error || 'Success'}`);
  
  if (results.circuitBreakerRemoved) {
    console.log('\n✅ SUCCESS: Circuit breaker has been successfully removed!');
    console.log('🎯 Previously blocked instance can now access endpoints');
    
    if (results.qrEndpoint.error && results.qrEndpoint.error.includes('User profile not found')) {
      console.log('⚠️ NEXT STEP: Fix authentication issues to enable QR generation');
    } else if (results.qrEndpoint.hasQRCode) {
      console.log('🎉 BONUS: QR codes are now being generated!');
    }
  } else {
    console.log('\n❌ ISSUE: Circuit breaker may still be active');
    console.log('🔧 Check if all circuit breaker instances were removed from:');
    console.log('   - src/lib/services/EvolutionAPIService.ts');
    console.log('   - src/hooks/useConnectionStatusMonitor.ts');
    console.log('   - src/app/api/channels/whatsapp/instances/[id]/status/route.ts');
  }
  
  console.log('\n🏆 NEXT STEPS:');
  if (results.circuitBreakerRemoved) {
    console.log('  1. ✅ Circuit breaker fix complete');
    console.log('  2. 🔧 Fix authentication issues');
    console.log('  3. 📱 Replace mock QR codes with real ones');
    console.log('  4. 🧪 Test end-to-end WhatsApp connection');
  } else {
    console.log('  1. 🔧 Complete circuit breaker removal');
    console.log('  2. 🔄 Restart development server');
    console.log('  3. 🧪 Re-test endpoint access');
  }
  
  return results;
}

// Run the circuit breaker fix test
testCircuitBreakerFix().then(results => {
  console.log('\n📋 Circuit breaker fix test completed.');
  
  const isFixed = results.circuitBreakerRemoved && !results.statusEndpoint.isBlocked;
  process.exit(isFixed ? 0 : 1);
}).catch(error => {
  console.error('\n💥 Circuit breaker test failed:', error);
  process.exit(1);
});
