/**
 * QR Code Timing and Scannability Analysis Script
 * Comprehensive investigation of QR code display timing and user experience issues
 */

async function analyzeQRTimingAndScannability() {
  console.log('🔍 QR CODE TIMING & SCANNABILITY ANALYSIS');
  console.log('=' .repeat(70));
  
  const results = {
    timing: {},
    scannability: {},
    statusEndpoints: {},
    userExperience: {},
    criticalIssues: []
  };

  // Test 1: QR Code Display Timing Analysis
  console.log('\n📊 TEST 1: QR Code Display Timing Analysis');
  console.log('-'.repeat(60));
  
  try {
    const instanceId = '9e47a580-0b7d-41ea-b99d-e0c9304a29f9'; // From logs
    const timingTests = [];
    
    for (let i = 1; i <= 5; i++) {
      console.log(`🔄 Timing Test ${i}/5...`);
      
      const startTime = Date.now();
      const response = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/${instanceId}/qr`);
      const result = await response.json();
      const totalTime = Date.now() - startTime;
      
      const timingData = {
        attempt: i,
        totalTime,
        status: response.status,
        success: result.success,
        hasQRCode: !!result.data?.qrCode,
        expiresAt: result.data?.expiresAt,
        authTime: result.performance?.authTime || 'N/A'
      };
      
      timingTests.push(timingData);
      
      console.log(`  ⏱️  Total: ${totalTime}ms | Auth: ${timingData.authTime}ms | Status: ${response.status} | QR: ${timingData.hasQRCode ? 'Yes' : 'No'}`);
      
      if (result.data?.expiresAt) {
        const expiresAt = new Date(result.data.expiresAt);
        const now = new Date();
        const timeToExpiry = Math.round((expiresAt.getTime() - now.getTime()) / 1000);
        console.log(`  ⏰ Expires in: ${timeToExpiry} seconds`);
        timingData.timeToExpiry = timeToExpiry;
      }
      
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Calculate timing statistics
    const successfulTests = timingTests.filter(t => t.success);
    if (successfulTests.length > 0) {
      const avgTime = successfulTests.reduce((sum, t) => sum + t.totalTime, 0) / successfulTests.length;
      const avgExpiry = successfulTests.filter(t => t.timeToExpiry).reduce((sum, t) => sum + t.timeToExpiry, 0) / successfulTests.filter(t => t.timeToExpiry).length;
      
      results.timing = {
        successRate: (successfulTests.length / timingTests.length) * 100,
        averageDisplayTime: Math.round(avgTime),
        averageExpiryTime: Math.round(avgExpiry) || 'N/A',
        under5Seconds: successfulTests.every(t => t.totalTime < 5000),
        optimalExpiryWindow: avgExpiry >= 30 && avgExpiry <= 60
      };
      
      console.log(`\n📈 Timing Summary:`);
      console.log(`  Success Rate: ${results.timing.successRate}%`);
      console.log(`  Average Display Time: ${results.timing.averageDisplayTime}ms`);
      console.log(`  Average Expiry Time: ${results.timing.averageExpiryTime}s`);
      console.log(`  Under 5s Target: ${results.timing.under5Seconds ? '✅' : '❌'}`);
      console.log(`  Optimal Expiry (30-60s): ${results.timing.optimalExpiryWindow ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('❌ QR timing analysis failed:', error.message);
    results.criticalIssues.push(`QR timing analysis error: ${error.message}`);
  }

  // Test 2: Status Endpoint Analysis (500 Error Investigation)
  console.log('\n📊 TEST 2: Status Endpoint Analysis (500 Error Investigation)');
  console.log('-'.repeat(60));
  
  try {
    const instanceId = '9e47a580-0b7d-41ea-b99d-e0c9304a29f9';
    const statusTests = [];
    
    for (let i = 1; i <= 3; i++) {
      console.log(`🔄 Status Test ${i}/3...`);
      
      const startTime = Date.now();
      const response = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/${instanceId}/status`);
      const totalTime = Date.now() - startTime;
      
      let result = null;
      try {
        result = await response.json();
      } catch (parseError) {
        result = { error: 'JSON parse error', rawResponse: await response.text() };
      }
      
      const statusData = {
        attempt: i,
        status: response.status,
        totalTime,
        success: response.ok,
        error: result.error || null,
        hasData: !!result.data
      };
      
      statusTests.push(statusData);
      
      console.log(`  📊 Status: ${response.status} | Time: ${totalTime}ms | Success: ${statusData.success ? 'Yes' : 'No'}`);
      if (statusData.error) {
        console.log(`  ❌ Error: ${statusData.error}`);
      }
      
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const statusErrors = statusTests.filter(t => !t.success);
    results.statusEndpoints = {
      successRate: ((statusTests.length - statusErrors.length) / statusTests.length) * 100,
      has500Errors: statusErrors.some(t => t.status === 500),
      averageResponseTime: Math.round(statusTests.reduce((sum, t) => sum + t.totalTime, 0) / statusTests.length),
      commonErrors: statusErrors.map(t => t.error).filter(Boolean)
    };
    
    console.log(`\n📈 Status Endpoint Summary:`);
    console.log(`  Success Rate: ${results.statusEndpoints.successRate}%`);
    console.log(`  Has 500 Errors: ${results.statusEndpoints.has500Errors ? '❌ Yes' : '✅ No'}`);
    console.log(`  Average Response Time: ${results.statusEndpoints.averageResponseTime}ms`);
    
    if (results.statusEndpoints.has500Errors) {
      results.criticalIssues.push('Status endpoint returning 500 errors - prevents proper QR state management');
    }
    
  } catch (error) {
    console.error('❌ Status endpoint analysis failed:', error.message);
    results.criticalIssues.push(`Status endpoint analysis error: ${error.message}`);
  }

  // Test 3: QR Code Scannability Analysis
  console.log('\n📊 TEST 3: QR Code Scannability Analysis');
  console.log('-'.repeat(60));
  
  try {
    // Test development endpoint QR code format
    const devResponse = await fetch('http://localhost:3001/api/dev/qr-test');
    const devResult = await devResponse.json();
    
    if (devResult.data?.qrCode) {
      const qrCode = devResult.data.qrCode;
      
      // Analyze QR code format for scannability
      const scannabilityChecks = {
        isDataURL: qrCode.startsWith('data:image/'),
        isBase64: /^data:image\/[a-zA-Z]+;base64,/.test(qrCode),
        hasValidLength: qrCode.length > 100, // Minimum for real QR code
        isPNG: qrCode.includes('data:image/png'),
        isJPEG: qrCode.includes('data:image/jpeg'),
        isMockQR: qrCode.length < 200 // Likely a mock/placeholder
      };
      
      results.scannability = {
        format: scannabilityChecks.isDataURL ? 'data-url' : 'unknown',
        isValidBase64: scannabilityChecks.isBase64,
        length: qrCode.length,
        imageType: scannabilityChecks.isPNG ? 'PNG' : scannabilityChecks.isJPEG ? 'JPEG' : 'Unknown',
        isMockQR: scannabilityChecks.isMockQR,
        likelyScannableByWhatsApp: scannabilityChecks.isDataURL && scannabilityChecks.isBase64 && !scannabilityChecks.isMockQR
      };
      
      console.log(`📱 QR Code Analysis:`);
      console.log(`  Format: ${results.scannability.format}`);
      console.log(`  Valid Base64: ${scannabilityChecks.isBase64 ? '✅' : '❌'}`);
      console.log(`  Length: ${qrCode.length} characters`);
      console.log(`  Image Type: ${results.scannability.imageType}`);
      console.log(`  Is Mock QR: ${scannabilityChecks.isMockQR ? '⚠️ Yes' : '✅ No'}`);
      console.log(`  Likely Scannable by WhatsApp: ${results.scannability.likelyScannableByWhatsApp ? '✅ Yes' : '❌ No'}`);
      
      if (scannabilityChecks.isMockQR) {
        results.criticalIssues.push('QR codes are mock/placeholder - cannot be scanned by WhatsApp');
      }
      
      // Test QR code content
      try {
        const base64Data = qrCode.split(',')[1];
        if (base64Data && base64Data.length > 50) {
          console.log(`  Base64 Content: Valid (${base64Data.length} chars)`);
        } else {
          console.log(`  Base64 Content: ❌ Too short or invalid`);
          results.criticalIssues.push('QR code base64 content appears invalid or too short');
        }
      } catch (error) {
        console.log(`  Base64 Content: ❌ Parse error`);
      }
      
    } else {
      console.log('❌ No QR code available for scannability analysis');
      results.criticalIssues.push('No QR code available for scannability testing');
    }
    
  } catch (error) {
    console.error('❌ QR scannability analysis failed:', error.message);
    results.criticalIssues.push(`QR scannability analysis error: ${error.message}`);
  }

  // Test 4: User Experience Flow Analysis
  console.log('\n📊 TEST 4: User Experience Flow Analysis');
  console.log('-'.repeat(60));
  
  try {
    // Simulate user flow: Create instance -> Get QR -> Monitor status
    console.log('🔄 Simulating user flow...');
    
    const flowSteps = [];
    
    // Step 1: Check if QR is available quickly
    const qrStartTime = Date.now();
    const qrResponse = await fetch('http://localhost:3001/api/dev/qr-test');
    const qrResult = await qrResponse.json();
    const qrTime = Date.now() - qrStartTime;
    
    flowSteps.push({
      step: 'QR Generation',
      time: qrTime,
      success: qrResult.success,
      userFriendly: qrTime < 3000 // Under 3 seconds is user-friendly
    });
    
    console.log(`  1. QR Generation: ${qrTime}ms - ${qrResult.success ? '✅' : '❌'}`);
    
    // Step 2: Check QR expiration window
    if (qrResult.data?.expiresAt) {
      const expiresAt = new Date(qrResult.data.expiresAt);
      const now = new Date();
      const scanWindow = Math.round((expiresAt.getTime() - now.getTime()) / 1000);
      
      flowSteps.push({
        step: 'Scan Window',
        time: scanWindow,
        success: scanWindow >= 30,
        userFriendly: scanWindow >= 45 // 45+ seconds is comfortable for users
      });
      
      console.log(`  2. Scan Window: ${scanWindow}s - ${scanWindow >= 30 ? '✅' : '❌'}`);
    }
    
    // Step 3: Check status endpoint reliability
    const statusStartTime = Date.now();
    const statusResponse = await fetch('http://localhost:3001/api/channels/whatsapp/instances/9e47a580-0b7d-41ea-b99d-e0c9304a29f9/status');
    const statusTime = Date.now() - statusStartTime;
    
    flowSteps.push({
      step: 'Status Check',
      time: statusTime,
      success: statusResponse.ok,
      userFriendly: statusResponse.ok && statusTime < 2000
    });
    
    console.log(`  3. Status Check: ${statusTime}ms - ${statusResponse.ok ? '✅' : '❌'}`);
    
    // Calculate overall user experience score
    const successfulSteps = flowSteps.filter(s => s.success).length;
    const userFriendlySteps = flowSteps.filter(s => s.userFriendly).length;
    
    results.userExperience = {
      overallSuccess: (successfulSteps / flowSteps.length) * 100,
      userFriendliness: (userFriendlySteps / flowSteps.length) * 100,
      criticalFailures: flowSteps.filter(s => !s.success).map(s => s.step),
      flowSteps
    };
    
    console.log(`\n📈 User Experience Summary:`);
    console.log(`  Overall Success: ${results.userExperience.overallSuccess}%`);
    console.log(`  User Friendliness: ${results.userExperience.userFriendliness}%`);
    
    if (results.userExperience.criticalFailures.length > 0) {
      console.log(`  Critical Failures: ${results.userExperience.criticalFailures.join(', ')}`);
      results.criticalIssues.push(`User experience failures: ${results.userExperience.criticalFailures.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ User experience analysis failed:', error.message);
    results.criticalIssues.push(`User experience analysis error: ${error.message}`);
  }

  // Final Analysis and Recommendations
  console.log('\n📈 COMPREHENSIVE ANALYSIS RESULTS');
  console.log('=' .repeat(70));
  
  console.log('\n⏱️ TIMING PERFORMANCE:');
  if (results.timing.averageDisplayTime) {
    console.log(`  QR Display Time: ${results.timing.averageDisplayTime}ms ${results.timing.under5Seconds ? '✅' : '❌'}`);
    console.log(`  QR Expiry Window: ${results.timing.averageExpiryTime}s ${results.timing.optimalExpiryWindow ? '✅' : '❌'}`);
  }
  
  console.log('\n📊 STATUS ENDPOINTS:');
  console.log(`  Success Rate: ${results.statusEndpoints.successRate || 'N/A'}%`);
  console.log(`  500 Errors: ${results.statusEndpoints.has500Errors ? '❌ Present' : '✅ None'}`);
  
  console.log('\n📱 QR SCANNABILITY:');
  if (results.scannability.likelyScannableByWhatsApp !== undefined) {
    console.log(`  WhatsApp Compatible: ${results.scannability.likelyScannableByWhatsApp ? '✅ Yes' : '❌ No'}`);
    console.log(`  Mock QR Code: ${results.scannability.isMockQR ? '⚠️ Yes' : '✅ No'}`);
  }
  
  console.log('\n👤 USER EXPERIENCE:');
  if (results.userExperience.overallSuccess) {
    console.log(`  Overall Success: ${results.userExperience.overallSuccess}%`);
    console.log(`  User Friendliness: ${results.userExperience.userFriendliness}%`);
  }
  
  console.log('\n🚨 CRITICAL ISSUES IDENTIFIED:');
  if (results.criticalIssues.length === 0) {
    console.log('  ✅ No critical issues found');
  } else {
    results.criticalIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ❌ ${issue}`);
    });
  }
  
  // Recommendations
  console.log('\n🎯 IMMEDIATE RECOMMENDATIONS:');
  
  if (results.scannability?.isMockQR) {
    console.log('  1. 🚨 CRITICAL: Replace mock QR codes with real Evolution API QR codes');
  }
  
  if (results.statusEndpoints?.has500Errors) {
    console.log('  2. 🚨 CRITICAL: Fix 500 errors in status endpoints');
  }
  
  if (results.timing?.averageExpiryTime && results.timing.averageExpiryTime < 30) {
    console.log('  3. ⚠️ HIGH: Increase QR code expiry window to 45-60 seconds');
  }
  
  if (results.userExperience?.userFriendliness < 80) {
    console.log('  4. 🔧 MEDIUM: Improve user experience flow and feedback');
  }
  
  console.log('\n🏆 NEXT STEPS FOR PRODUCTION READINESS:');
  console.log('  1. Generate real QR codes from Evolution API');
  console.log('  2. Fix status endpoint 500 errors');
  console.log('  3. Test actual WhatsApp scanning with real QR codes');
  console.log('  4. Implement proper user feedback and error handling');
  console.log('  5. Validate complete end-to-end connection flow');
  
  return results;
}

// Run the comprehensive analysis
analyzeQRTimingAndScannability().then(results => {
  console.log('\n📋 QR timing and scannability analysis completed.');
  console.log('🎯 Results available for production optimization.');
  
  const hasBlockingIssues = results.criticalIssues.length > 0 || 
                           results.scannability?.isMockQR ||
                           results.statusEndpoints?.has500Errors;
  
  process.exit(hasBlockingIssues ? 1 : 0);
}).catch(error => {
  console.error('\n💥 Analysis failed:', error);
  process.exit(1);
});
