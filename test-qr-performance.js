/**
 * QR Code Performance Testing Script
 * Tests the optimized QR code endpoints and measures performance metrics
 */

async function testQRPerformance() {
  console.log('🚀 QR CODE PERFORMANCE TESTING STARTED');
  console.log('=' .repeat(60));
  
  const testResults = [];
  const instanceId = 'c4165106-2fb3-49e8-adc2-275fda3ae34c';
  
  // Test 1: Production QR Endpoint (with fast auth)
  console.log('\n📊 TEST 1: Production QR Endpoint Performance');
  console.log('-'.repeat(50));
  
  for (let i = 1; i <= 3; i++) {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Attempt ${i}/3: Testing production endpoint...`);
      
      const response = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/${instanceId}/qr`);
      const result = await response.json();
      const totalTime = Date.now() - startTime;
      
      const testResult = {
        test: 'production',
        attempt: i,
        status: response.status,
        success: result.success,
        totalTime,
        authTime: result.data?.performance?.authTime || result.performance?.authTime || 'N/A',
        authMethod: result.data?.performance?.method || result.performance?.method || 'N/A',
        isFallback: result.data?.performance?.isFallback || result.performance?.isFallback || false,
        hasQRCode: !!result.data?.qrCode,
        error: result.error || null
      };
      
      testResults.push(testResult);
      
      console.log(`  ✅ Status: ${response.status}`);
      console.log(`  ⏱️  Total Time: ${totalTime}ms`);
      console.log(`  🔐 Auth Time: ${testResult.authTime}ms`);
      console.log(`  🔧 Auth Method: ${testResult.authMethod}`);
      console.log(`  🎯 Has QR Code: ${testResult.hasQRCode}`);
      console.log(`  🔄 Is Fallback: ${testResult.isFallback}`);
      
      if (result.error) {
        console.log(`  ❌ Error: ${result.error}`);
      }
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.log(`  ❌ Request failed in ${totalTime}ms:`, error.message);
      
      testResults.push({
        test: 'production',
        attempt: i,
        status: 'ERROR',
        success: false,
        totalTime,
        error: error.message
      });
    }
    
    // Wait between attempts
    if (i < 3) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Test 2: Development QR Endpoint (baseline)
  console.log('\n📊 TEST 2: Development QR Endpoint Performance (Baseline)');
  console.log('-'.repeat(50));
  
  for (let i = 1; i <= 3; i++) {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Attempt ${i}/3: Testing development endpoint...`);
      
      const response = await fetch(`http://localhost:3001/api/dev/qr-test`);
      const result = await response.json();
      const totalTime = Date.now() - startTime;
      
      const testResult = {
        test: 'development',
        attempt: i,
        status: response.status,
        success: result.success,
        totalTime,
        hasQRCode: !!result.data?.qrCode,
        error: result.error || null
      };
      
      testResults.push(testResult);
      
      console.log(`  ✅ Status: ${response.status}`);
      console.log(`  ⏱️  Total Time: ${totalTime}ms`);
      console.log(`  🎯 Has QR Code: ${testResult.hasQRCode}`);
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.log(`  ❌ Request failed in ${totalTime}ms:`, error.message);
      
      testResults.push({
        test: 'development',
        attempt: i,
        status: 'ERROR',
        success: false,
        totalTime,
        error: error.message
      });
    }
    
    // Wait between attempts
    if (i < 3) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Performance Analysis
  console.log('\n📈 PERFORMANCE ANALYSIS');
  console.log('=' .repeat(60));
  
  const productionTests = testResults.filter(r => r.test === 'production');
  const developmentTests = testResults.filter(r => r.test === 'development');
  
  // Production Stats
  const prodSuccessful = productionTests.filter(r => r.success);
  const prodTimes = prodSuccessful.map(r => r.totalTime);
  const prodAuthTimes = prodSuccessful.map(r => r.authTime).filter(t => t !== 'N/A');
  
  console.log('\n🏭 PRODUCTION ENDPOINT STATS:');
  console.log(`  Success Rate: ${prodSuccessful.length}/${productionTests.length} (${Math.round(prodSuccessful.length/productionTests.length*100)}%)`);
  if (prodTimes.length > 0) {
    console.log(`  Average Total Time: ${Math.round(prodTimes.reduce((a,b) => a+b, 0) / prodTimes.length)}ms`);
    console.log(`  Min Time: ${Math.min(...prodTimes)}ms`);
    console.log(`  Max Time: ${Math.max(...prodTimes)}ms`);
  }
  if (prodAuthTimes.length > 0) {
    console.log(`  Average Auth Time: ${Math.round(prodAuthTimes.reduce((a,b) => a+b, 0) / prodAuthTimes.length)}ms`);
  }
  
  // Development Stats
  const devSuccessful = developmentTests.filter(r => r.success);
  const devTimes = devSuccessful.map(r => r.totalTime);
  
  console.log('\n🔧 DEVELOPMENT ENDPOINT STATS:');
  console.log(`  Success Rate: ${devSuccessful.length}/${developmentTests.length} (${Math.round(devSuccessful.length/developmentTests.length*100)}%)`);
  if (devTimes.length > 0) {
    console.log(`  Average Total Time: ${Math.round(devTimes.reduce((a,b) => a+b, 0) / devTimes.length)}ms`);
    console.log(`  Min Time: ${Math.min(...devTimes)}ms`);
    console.log(`  Max Time: ${Math.max(...devTimes)}ms`);
  }
  
  // Performance Goals Check
  console.log('\n🎯 PERFORMANCE GOALS CHECK:');
  console.log(`  Target: < 5000ms (5 seconds)`);
  
  const allSuccessfulTimes = [...prodTimes, ...devTimes];
  if (allSuccessfulTimes.length > 0) {
    const maxTime = Math.max(...allSuccessfulTimes);
    const avgTime = Math.round(allSuccessfulTimes.reduce((a,b) => a+b, 0) / allSuccessfulTimes.length);
    
    console.log(`  Average Time: ${avgTime}ms ${avgTime < 5000 ? '✅' : '❌'}`);
    console.log(`  Max Time: ${maxTime}ms ${maxTime < 5000 ? '✅' : '❌'}`);
    console.log(`  All requests under 5s: ${allSuccessfulTimes.every(t => t < 5000) ? '✅' : '❌'}`);
  }
  
  console.log('\n🏁 PERFORMANCE TESTING COMPLETED');
  
  return testResults;
}

// Run the performance test
testQRPerformance().then(results => {
  console.log('\n📋 Test completed. Results available for analysis.');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Performance test failed:', error);
  process.exit(1);
});
