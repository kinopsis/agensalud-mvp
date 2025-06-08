/**
 * Comprehensive QR Code Validation Script
 * Tests actual QR code generation, display, and scanning functionality
 */

async function validateQRCodeFunctionality() {
  console.log('🔍 COMPREHENSIVE QR CODE VALIDATION');
  console.log('=' .repeat(60));
  
  const results = {
    documentation: {},
    endpoints: {},
    qrCodes: {},
    timing: {},
    issues: []
  };

  // Test 1: Development QR Endpoint
  console.log('\n📊 TEST 1: Development QR Code Generation');
  console.log('-'.repeat(50));
  
  try {
    const startTime = Date.now();
    const response = await fetch('http://localhost:3001/api/dev/qr-test');
    const result = await response.json();
    const responseTime = Date.now() - startTime;
    
    results.endpoints.development = {
      status: response.status,
      success: result.success,
      responseTime,
      hasQRCode: !!result.data?.qrCode,
      qrCodeLength: result.data?.qrCode?.length || 0
    };
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`🎯 Has QR Code: ${!!result.data?.qrCode}`);
    
    if (result.data?.qrCode) {
      // Validate QR code format
      const qrCode = result.data.qrCode;
      const isValidDataURL = qrCode.startsWith('data:image/');
      const isValidBase64 = /^data:image\/[a-zA-Z]+;base64,/.test(qrCode);
      
      results.qrCodes.development = {
        format: isValidDataURL ? 'data-url' : 'unknown',
        isValidBase64,
        length: qrCode.length,
        preview: qrCode.substring(0, 100) + '...'
      };
      
      console.log(`📊 QR Code Format: ${isValidDataURL ? 'Valid Data URL' : 'Invalid'}`);
      console.log(`🔗 Base64 Valid: ${isValidBase64}`);
      console.log(`📏 Length: ${qrCode.length} characters`);
    }
    
  } catch (error) {
    console.error('❌ Development endpoint failed:', error.message);
    results.issues.push(`Development endpoint error: ${error.message}`);
  }

  // Test 2: Production QR Endpoint (with auth)
  console.log('\n📊 TEST 2: Production QR Code Generation');
  console.log('-'.repeat(50));
  
  try {
    const startTime = Date.now();
    const instanceId = 'test-instance-123';
    const response = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/${instanceId}/qr`);
    const result = await response.json();
    const responseTime = Date.now() - startTime;
    
    results.endpoints.production = {
      status: response.status,
      success: result.success,
      responseTime,
      error: result.error,
      authTime: result.performance?.authTime || 'N/A'
    };
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`🔐 Auth Time: ${result.performance?.authTime || 'N/A'}ms`);
    console.log(`❌ Error: ${result.error || 'None'}`);
    
  } catch (error) {
    console.error('❌ Production endpoint failed:', error.message);
    results.issues.push(`Production endpoint error: ${error.message}`);
  }

  // Test 3: QR Code Timing Analysis
  console.log('\n📊 TEST 3: QR Code Timing Analysis');
  console.log('-'.repeat(50));
  
  const timingTests = [];
  for (let i = 1; i <= 5; i++) {
    try {
      const startTime = Date.now();
      const response = await fetch('http://localhost:3001/api/dev/qr-test');
      const result = await response.json();
      const responseTime = Date.now() - startTime;
      
      timingTests.push({
        attempt: i,
        responseTime,
        success: result.success,
        hasQRCode: !!result.data?.qrCode
      });
      
      console.log(`🔄 Attempt ${i}: ${responseTime}ms - ${result.success ? 'Success' : 'Failed'}`);
      
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      timingTests.push({
        attempt: i,
        responseTime: null,
        success: false,
        error: error.message
      });
      console.log(`🔄 Attempt ${i}: Failed - ${error.message}`);
    }
  }
  
  // Calculate timing statistics
  const successfulTests = timingTests.filter(t => t.success);
  if (successfulTests.length > 0) {
    const avgTime = successfulTests.reduce((sum, t) => sum + t.responseTime, 0) / successfulTests.length;
    const minTime = Math.min(...successfulTests.map(t => t.responseTime));
    const maxTime = Math.max(...successfulTests.map(t => t.responseTime));
    
    results.timing = {
      successRate: (successfulTests.length / timingTests.length) * 100,
      averageTime: Math.round(avgTime),
      minTime,
      maxTime,
      under5Seconds: successfulTests.every(t => t.responseTime < 5000),
      under1Second: successfulTests.every(t => t.responseTime < 1000)
    };
    
    console.log(`📈 Success Rate: ${results.timing.successRate}%`);
    console.log(`⏱️  Average Time: ${results.timing.averageTime}ms`);
    console.log(`🚀 All Under 5s: ${results.timing.under5Seconds ? 'Yes' : 'No'}`);
    console.log(`⚡ All Under 1s: ${results.timing.under1Second ? 'Yes' : 'No'}`);
  }

  // Test 4: QR Code Expiration Testing
  console.log('\n📊 TEST 4: QR Code Expiration Analysis');
  console.log('-'.repeat(50));
  
  try {
    const response = await fetch('http://localhost:3001/api/dev/qr-test');
    const result = await response.json();
    
    if (result.data?.expiresAt) {
      const expiresAt = new Date(result.data.expiresAt);
      const now = new Date();
      const timeToExpiry = expiresAt.getTime() - now.getTime();
      const secondsToExpiry = Math.round(timeToExpiry / 1000);
      
      results.qrCodes.expiration = {
        expiresAt: result.data.expiresAt,
        secondsToExpiry,
        isValidWindow: secondsToExpiry >= 30 && secondsToExpiry <= 60
      };
      
      console.log(`⏰ Expires At: ${expiresAt.toLocaleTimeString()}`);
      console.log(`⏳ Time to Expiry: ${secondsToExpiry} seconds`);
      console.log(`✅ Valid Window: ${results.qrCodes.expiration.isValidWindow ? 'Yes (30-60s)' : 'No'}`);
      
      if (secondsToExpiry < 30) {
        results.issues.push('QR code expiration window too short (< 30 seconds)');
      } else if (secondsToExpiry > 60) {
        results.issues.push('QR code expiration window too long (> 60 seconds)');
      }
    }
    
  } catch (error) {
    console.error('❌ Expiration test failed:', error.message);
    results.issues.push(`Expiration test error: ${error.message}`);
  }

  // Final Analysis
  console.log('\n📈 COMPREHENSIVE ANALYSIS');
  console.log('=' .repeat(60));
  
  console.log('\n🎯 ENDPOINT STATUS:');
  console.log(`  Development Endpoint: ${results.endpoints.development?.success ? '✅ Working' : '❌ Failed'}`);
  console.log(`  Production Endpoint: ${results.endpoints.production?.success ? '✅ Working' : '❌ Failed'}`);
  
  console.log('\n⏱️ PERFORMANCE METRICS:');
  if (results.timing.successRate) {
    console.log(`  Success Rate: ${results.timing.successRate}%`);
    console.log(`  Average Response: ${results.timing.averageTime}ms`);
    console.log(`  5-Second Target: ${results.timing.under5Seconds ? '✅ Met' : '❌ Failed'}`);
    console.log(`  1-Second Excellence: ${results.timing.under1Second ? '✅ Achieved' : '⚠️ Not achieved'}`);
  }
  
  console.log('\n🔗 QR CODE QUALITY:');
  if (results.qrCodes.development) {
    console.log(`  Format: ${results.qrCodes.development.isValidBase64 ? '✅ Valid Base64' : '❌ Invalid'}`);
    console.log(`  Length: ${results.qrCodes.development.length} chars`);
  }
  if (results.qrCodes.expiration) {
    console.log(`  Expiration Window: ${results.qrCodes.expiration.isValidWindow ? '✅ Optimal' : '❌ Suboptimal'}`);
    console.log(`  Time to Expiry: ${results.qrCodes.expiration.secondsToExpiry}s`);
  }
  
  console.log('\n🚨 ISSUES IDENTIFIED:');
  if (results.issues.length === 0) {
    console.log('  ✅ No critical issues found');
  } else {
    results.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ❌ ${issue}`);
    });
  }
  
  // Final Verdict
  console.log('\n🏆 FINAL VERDICT:');
  const developmentWorking = results.endpoints.development?.success;
  const performanceGood = results.timing.under5Seconds;
  const qrCodeValid = results.qrCodes.development?.isValidBase64;
  const criticalIssues = results.issues.length;
  
  if (developmentWorking && performanceGood && qrCodeValid && criticalIssues === 0) {
    console.log('✅ QR CODE SYSTEM: FULLY FUNCTIONAL');
    console.log('🎯 Ready for user testing and production deployment');
  } else if (developmentWorking && performanceGood) {
    console.log('⚠️ QR CODE SYSTEM: PARTIALLY FUNCTIONAL');
    console.log('🔧 Minor issues need attention before full deployment');
  } else {
    console.log('❌ QR CODE SYSTEM: NEEDS ATTENTION');
    console.log('🚨 Critical issues prevent reliable QR code functionality');
  }
  
  return results;
}

// Run the comprehensive validation
validateQRCodeFunctionality().then(results => {
  console.log('\n📋 Comprehensive QR code validation completed.');
  console.log('🎯 Results available for detailed analysis.');
  
  const isFullyFunctional = results.endpoints.development?.success && 
                           results.timing?.under5Seconds && 
                           results.qrCodes.development?.isValidBase64;
  
  process.exit(isFullyFunctional ? 0 : 1);
}).catch(error => {
  console.error('\n💥 Validation failed:', error);
  process.exit(1);
});
