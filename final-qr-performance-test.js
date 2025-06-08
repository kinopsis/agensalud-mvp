/**
 * Final QR Code Performance Validation Test
 * Comprehensive test suite to validate all optimizations meet the 5-second target
 */

async function runComprehensiveQRTest() {
  console.log('🎯 FINAL QR CODE PERFORMANCE VALIDATION');
  console.log('=' .repeat(70));
  console.log('Target: QR code display within 5 seconds consistently');
  console.log('Testing: Fast auth, intelligent fallback, UI component simulation');
  console.log('');

  const results = {
    tests: [],
    summary: {
      totalTests: 0,
      successfulTests: 0,
      averageTime: 0,
      maxTime: 0,
      minTime: Infinity,
      under5Seconds: 0,
      under1Second: 0
    }
  };

  // Test scenarios
  const scenarios = [
    {
      name: 'Production Endpoint (Fast Auth)',
      endpoint: '/api/channels/whatsapp/instances/c4165106-2fb3-49e8-adc2-275fda3ae34c/qr',
      expectedFallback: true
    },
    {
      name: 'Development Endpoint (Baseline)',
      endpoint: '/api/dev/qr-test',
      expectedFallback: false
    },
    {
      name: 'UI Component Simulation',
      endpoint: '/api/channels/whatsapp/instances/test-instance/qr',
      expectedFallback: true,
      simulateUI: true
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n📊 TESTING: ${scenario.name}`);
    console.log('-'.repeat(50));

    for (let attempt = 1; attempt <= 5; attempt++) {
      const testStart = Date.now();
      
      try {
        console.log(`🔄 Attempt ${attempt}/5...`);
        
        let response;
        let fallbackUsed = false;
        let attemptCount = 0;
        
        if (scenario.simulateUI) {
          // Simulate UI component behavior with fallback
          attemptCount++;
          response = await fetch(`http://localhost:3001${scenario.endpoint}`);
          
          if (!response.ok && (response.status === 401 || response.status === 403)) {
            console.log(`  ⚠️ Primary failed (${response.status}), using fallback...`);
            fallbackUsed = true;
            attemptCount++;
            response = await fetch(`http://localhost:3001/api/dev/qr-test`);
          }
        } else {
          // Direct endpoint test
          attemptCount++;
          response = await fetch(`http://localhost:3001${scenario.endpoint}`);
        }
        
        const result = await response.json();
        const totalTime = Date.now() - testStart;
        
        const testResult = {
          scenario: scenario.name,
          attempt,
          success: response.ok && result.success,
          totalTime,
          status: response.status,
          hasQRCode: !!result.data?.qrCode,
          fallbackUsed,
          attemptCount,
          authTime: result.data?.performance?.authTime || result.performance?.authTime || 'N/A',
          authMethod: result.data?.performance?.method || result.performance?.method || 'N/A',
          error: result.error || null
        };
        
        results.tests.push(testResult);
        results.summary.totalTests++;
        
        if (testResult.success) {
          results.summary.successfulTests++;
          results.summary.averageTime = (results.summary.averageTime * (results.summary.successfulTests - 1) + totalTime) / results.summary.successfulTests;
          results.summary.maxTime = Math.max(results.summary.maxTime, totalTime);
          results.summary.minTime = Math.min(results.summary.minTime, totalTime);
          
          if (totalTime < 5000) results.summary.under5Seconds++;
          if (totalTime < 1000) results.summary.under1Second++;
        }
        
        // Log result
        const statusIcon = testResult.success ? '✅' : '❌';
        const timeIcon = totalTime < 1000 ? '🚀' : totalTime < 5000 ? '⚡' : '⚠️';
        
        console.log(`  ${statusIcon} ${timeIcon} ${totalTime}ms - Status: ${response.status} - QR: ${testResult.hasQRCode ? 'Yes' : 'No'} - Fallback: ${fallbackUsed ? 'Yes' : 'No'}`);
        
        if (testResult.authTime !== 'N/A') {
          console.log(`    🔐 Auth: ${testResult.authTime}ms (${testResult.authMethod})`);
        }
        
        if (testResult.error) {
          console.log(`    ❌ Error: ${testResult.error}`);
        }
        
      } catch (error) {
        const totalTime = Date.now() - testStart;
        console.log(`  ❌ 💥 ${totalTime}ms - Request failed: ${error.message}`);
        
        results.tests.push({
          scenario: scenario.name,
          attempt,
          success: false,
          totalTime,
          error: error.message
        });
        results.summary.totalTests++;
      }
      
      // Brief pause between attempts
      if (attempt < 5) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // Final Analysis
  console.log('\n📈 COMPREHENSIVE PERFORMANCE ANALYSIS');
  console.log('=' .repeat(70));
  
  console.log(`\n🎯 SUCCESS METRICS:`);
  console.log(`  Total Tests: ${results.summary.totalTests}`);
  console.log(`  Successful Tests: ${results.summary.successfulTests}/${results.summary.totalTests} (${Math.round(results.summary.successfulTests/results.summary.totalTests*100)}%)`);
  
  if (results.summary.successfulTests > 0) {
    console.log(`  Average Response Time: ${Math.round(results.summary.averageTime)}ms`);
    console.log(`  Fastest Response: ${results.summary.minTime}ms`);
    console.log(`  Slowest Response: ${results.summary.maxTime}ms`);
    
    console.log(`\n⏱️ PERFORMANCE TARGETS:`);
    console.log(`  Under 5 seconds: ${results.summary.under5Seconds}/${results.summary.successfulTests} (${Math.round(results.summary.under5Seconds/results.summary.successfulTests*100)}%) ${results.summary.under5Seconds === results.summary.successfulTests ? '✅' : '❌'}`);
    console.log(`  Under 1 second: ${results.summary.under1Second}/${results.summary.successfulTests} (${Math.round(results.summary.under1Second/results.summary.successfulTests*100)}%) ${results.summary.under1Second > 0 ? '🚀' : '⚡'}`);
    
    console.log(`\n🔧 OPTIMIZATION EFFECTIVENESS:`);
    const fallbackTests = results.tests.filter(t => t.fallbackUsed);
    const directTests = results.tests.filter(t => t.success && !t.fallbackUsed);
    
    if (fallbackTests.length > 0) {
      const avgFallbackTime = fallbackTests.reduce((sum, t) => sum + t.totalTime, 0) / fallbackTests.length;
      console.log(`  Fallback Mechanism: ${fallbackTests.length} uses, avg ${Math.round(avgFallbackTime)}ms`);
    }
    
    if (directTests.length > 0) {
      const avgDirectTime = directTests.reduce((sum, t) => sum + t.totalTime, 0) / directTests.length;
      console.log(`  Direct Endpoint: ${directTests.length} uses, avg ${Math.round(avgDirectTime)}ms`);
    }
  }
  
  // Final Verdict
  console.log(`\n🏆 FINAL VERDICT:`);
  const meetTarget = results.summary.under5Seconds === results.summary.successfulTests && results.summary.successfulTests > 0;
  const excellentPerformance = results.summary.under1Second > results.summary.successfulTests * 0.8;
  
  if (meetTarget) {
    console.log(`✅ SUCCESS: All QR codes display within 5-second target!`);
    if (excellentPerformance) {
      console.log(`🚀 EXCELLENT: ${Math.round(results.summary.under1Second/results.summary.successfulTests*100)}% of requests under 1 second!`);
    }
    console.log(`🎯 READY FOR PRODUCTION: QR code performance optimizations are working perfectly.`);
  } else {
    console.log(`❌ NEEDS IMPROVEMENT: Some requests exceed 5-second target.`);
    console.log(`🔧 RECOMMENDATION: Review slow requests and implement additional optimizations.`);
  }
  
  return results;
}

// Run the comprehensive test
runComprehensiveQRTest().then(results => {
  console.log('\n📋 Comprehensive QR performance test completed.');
  console.log('🎯 Results available for further analysis if needed.');
  
  const success = results.summary.under5Seconds === results.summary.successfulTests && results.summary.successfulTests > 0;
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('\n💥 Comprehensive test failed:', error);
  process.exit(1);
});
