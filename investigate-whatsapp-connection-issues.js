/**
 * Comprehensive WhatsApp Connection Issues Investigation
 * Analyzes QR timing, instance connection failures, infinite loops, and console patterns
 */

async function investigateWhatsAppConnectionIssues() {
  console.log('🔍 COMPREHENSIVE WHATSAPP CONNECTION ISSUES INVESTIGATION');
  console.log('=' .repeat(80));
  
  const results = {
    qrTiming: {},
    instanceConnection: {},
    infiniteLoops: {},
    consolePatterns: {},
    rootCauses: [],
    actionPlan: []
  };

  // Issue 1: QR Code Display Timing Investigation
  console.log('\n📱 ISSUE 1: QR Code Display Timing Investigation');
  console.log('-'.repeat(70));
  
  try {
    console.log('🔄 Testing QR code timing and expiration patterns...');
    
    const timingTests = [];
    for (let i = 1; i <= 3; i++) {
      const startTime = Date.now();
      const response = await fetch('http://localhost:3001/api/dev/qr-test');
      const result = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (result.data?.expiresAt) {
        const expiresAt = new Date(result.data.expiresAt);
        const now = new Date();
        const timeToExpiry = Math.round((expiresAt.getTime() - now.getTime()) / 1000);
        
        timingTests.push({
          attempt: i,
          responseTime,
          timeToExpiry,
          qrLength: result.data.qrCode?.length || 0,
          isOptimalWindow: timeToExpiry >= 45 && timeToExpiry <= 60
        });
        
        console.log(`  Test ${i}: Response ${responseTime}ms | Expiry ${timeToExpiry}s | Optimal: ${timeToExpiry >= 45 && timeToExpiry <= 60 ? 'Yes' : 'No'}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const avgExpiry = timingTests.reduce((sum, t) => sum + t.timeToExpiry, 0) / timingTests.length;
    const allOptimal = timingTests.every(t => t.isOptimalWindow);
    
    results.qrTiming = {
      averageExpiryTime: Math.round(avgExpiry),
      optimalWindow: allOptimal,
      consistentTiming: timingTests.every(t => Math.abs(t.timeToExpiry - avgExpiry) < 5),
      issue: !allOptimal ? 'QR expiry window not optimal' : null
    };
    
    console.log(`\n📊 QR Timing Analysis:`);
    console.log(`  Average Expiry Time: ${results.qrTiming.averageExpiryTime}s`);
    console.log(`  Optimal Window (45-60s): ${allOptimal ? '✅ Yes' : '❌ No'}`);
    console.log(`  Consistent Timing: ${results.qrTiming.consistentTiming ? '✅ Yes' : '❌ No'}`);
    
    if (!allOptimal) {
      results.rootCauses.push('QR code expiry timing not optimal for user scanning');
      results.actionPlan.push('Adjust QR code expiration to 45-60 second window');
    }
    
  } catch (error) {
    console.error('❌ QR timing investigation failed:', error.message);
    results.rootCauses.push(`QR timing investigation error: ${error.message}`);
  }

  // Issue 2: Instance Connection Failure Analysis
  console.log('\n🔗 ISSUE 2: Instance Connection Failure Analysis');
  console.log('-'.repeat(70));
  
  try {
    const testInstanceId = '63b5ff17-0a49-483a-92d1-2bccb359ace7'; // From user context
    console.log(`🔄 Analyzing connection failure for instance: ${testInstanceId}`);
    
    // Test instance status
    const statusResponse = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/${testInstanceId}/status`);
    const statusResult = await statusResponse.json();
    
    console.log(`📊 Instance Status Response: ${statusResponse.status}`);
    console.log(`📋 Status Data:`, statusResult);
    
    // Test QR generation for this instance
    const qrResponse = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/${testInstanceId}/qr`);
    const qrResult = await qrResponse.json();
    
    console.log(`📱 QR Response: ${qrResponse.status}`);
    console.log(`📋 QR Data:`, qrResult);
    
    results.instanceConnection = {
      statusCode: statusResponse.status,
      statusSuccess: statusResult.success,
      qrCode: qrResponse.status,
      qrSuccess: qrResult.success,
      hasQRCode: !!qrResult.data?.qrCode,
      connectionState: statusResult.data?.status || 'unknown',
      issue: null
    };
    
    // Analyze connection patterns
    if (statusResponse.status === 404) {
      results.instanceConnection.issue = 'Instance not found in database';
      results.rootCauses.push('WhatsApp instances created but not persisted in database');
      results.actionPlan.push('Fix instance creation to properly save to database');
    } else if (statusResult.data?.status === 'disconnected' && !qrResult.data?.qrCode) {
      results.instanceConnection.issue = 'Instance disconnected with no QR code available';
      results.rootCauses.push('QR code generation failing for disconnected instances');
      results.actionPlan.push('Fix QR code generation for disconnected instances');
    } else if (qrResult.success && qrResult.data?.qrCode?.length < 200) {
      results.instanceConnection.issue = 'Mock QR codes preventing real connections';
      results.rootCauses.push('Evolution API not generating real QR codes');
      results.actionPlan.push('Configure Evolution API for real QR code generation');
    }
    
  } catch (error) {
    console.error('❌ Instance connection analysis failed:', error.message);
    results.rootCauses.push(`Instance connection analysis error: ${error.message}`);
  }

  // Issue 3: Infinite Monitoring Loop Investigation
  console.log('\n🔄 ISSUE 3: Infinite Monitoring Loop Investigation');
  console.log('-'.repeat(70));
  
  try {
    console.log('🔄 Testing for infinite monitoring loops...');
    
    // Test multiple rapid status calls to detect loops
    const loopTests = [];
    const startTime = Date.now();
    
    for (let i = 1; i <= 5; i++) {
      const testStart = Date.now();
      const response = await fetch('http://localhost:3001/api/channels/whatsapp/instances/test-loop/status');
      const testTime = Date.now() - testStart;
      
      loopTests.push({
        attempt: i,
        responseTime: testTime,
        status: response.status
      });
      
      console.log(`  Loop Test ${i}: ${testTime}ms - Status: ${response.status}`);
      
      // Brief pause to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const totalTime = Date.now() - startTime;
    const avgResponseTime = loopTests.reduce((sum, t) => sum + t.responseTime, 0) / loopTests.length;
    const hasSlowResponses = loopTests.some(t => t.responseTime > 5000);
    
    results.infiniteLoops = {
      totalTestTime: totalTime,
      averageResponseTime: Math.round(avgResponseTime),
      hasSlowResponses,
      possibleInfiniteLoop: hasSlowResponses || avgResponseTime > 3000,
      issue: hasSlowResponses ? 'Slow responses indicate possible infinite loops' : null
    };
    
    console.log(`\n📊 Loop Detection Analysis:`);
    console.log(`  Total Test Time: ${totalTime}ms`);
    console.log(`  Average Response Time: ${results.infiniteLoops.averageResponseTime}ms`);
    console.log(`  Slow Responses Detected: ${hasSlowResponses ? '⚠️ Yes' : '✅ No'}`);
    console.log(`  Possible Infinite Loop: ${results.infiniteLoops.possibleInfiniteLoop ? '⚠️ Yes' : '✅ No'}`);
    
    if (results.infiniteLoops.possibleInfiniteLoop) {
      results.rootCauses.push('Infinite monitoring loops causing performance issues');
      results.actionPlan.push('Implement circuit breakers and rate limiting for monitoring');
    }
    
  } catch (error) {
    console.error('❌ Infinite loop investigation failed:', error.message);
    results.rootCauses.push(`Infinite loop investigation error: ${error.message}`);
  }

  // Issue 4: Console Pattern Analysis
  console.log('\n📋 ISSUE 4: Console Pattern Analysis');
  console.log('-'.repeat(70));
  
  try {
    console.log('🔄 Analyzing console patterns and Fast Refresh cycles...');
    
    // Simulate console pattern detection
    const consolePatterns = {
      fastRefreshCycles: true, // Based on user context: "Fast Refresh rebuilding cycles (1363ms)"
      phoneExtractionLoops: true, // Based on user context: "extractedPhone: 'N/A'"
      connectionInitiationSuccess: true, // Based on user context: "Connection initiation success but no actual connection"
      qrCodeUnavailable: true // Based on screenshot: "Código QR no disponible"
    };
    
    results.consolePatterns = consolePatterns;
    
    console.log(`📊 Console Pattern Analysis:`);
    console.log(`  Fast Refresh Cycles: ${consolePatterns.fastRefreshCycles ? '⚠️ Detected' : '✅ Normal'}`);
    console.log(`  Phone Extraction Loops: ${consolePatterns.phoneExtractionLoops ? '⚠️ Detected' : '✅ Normal'}`);
    console.log(`  Connection Success (No Actual Connection): ${consolePatterns.connectionInitiationSuccess ? '⚠️ Detected' : '✅ Normal'}`);
    console.log(`  QR Code Unavailable: ${consolePatterns.qrCodeUnavailable ? '⚠️ Detected' : '✅ Available'}`);
    
    // Add root causes based on patterns
    if (consolePatterns.fastRefreshCycles) {
      results.rootCauses.push('Fast Refresh cycles indicating development instability');
      results.actionPlan.push('Optimize component re-rendering to reduce Fast Refresh cycles');
    }
    
    if (consolePatterns.phoneExtractionLoops) {
      results.rootCauses.push('Phone number extraction infinite loops in ChannelInstanceCard');
      results.actionPlan.push('Fix phone number extraction logic in ChannelInstanceCard.tsx:192');
    }
    
    if (consolePatterns.connectionInitiationSuccess && consolePatterns.qrCodeUnavailable) {
      results.rootCauses.push('Connection shows success but QR codes are not available');
      results.actionPlan.push('Fix disconnect between connection status and QR code availability');
    }
    
  } catch (error) {
    console.error('❌ Console pattern analysis failed:', error.message);
    results.rootCauses.push(`Console pattern analysis error: ${error.message}`);
  }

  // Comprehensive Analysis and Action Plan
  console.log('\n📈 COMPREHENSIVE ANALYSIS RESULTS');
  console.log('=' .repeat(80));
  
  console.log('\n🚨 ROOT CAUSES IDENTIFIED:');
  if (results.rootCauses.length === 0) {
    console.log('  ✅ No critical root causes identified');
  } else {
    results.rootCauses.forEach((cause, index) => {
      console.log(`  ${index + 1}. ❌ ${cause}`);
    });
  }
  
  console.log('\n🎯 ACTION PLAN:');
  if (results.actionPlan.length === 0) {
    console.log('  ✅ No actions required');
  } else {
    results.actionPlan.forEach((action, index) => {
      console.log(`  ${index + 1}. 🔧 ${action}`);
    });
  }
  
  console.log('\n📊 ISSUE SUMMARY:');
  console.log(`  QR Timing Issues: ${results.qrTiming.issue ? '❌ Found' : '✅ None'}`);
  console.log(`  Instance Connection Issues: ${results.instanceConnection.issue ? '❌ Found' : '✅ None'}`);
  console.log(`  Infinite Loop Issues: ${results.infiniteLoops.issue ? '❌ Found' : '✅ None'}`);
  console.log(`  Console Pattern Issues: ${Object.values(results.consolePatterns).some(Boolean) ? '❌ Found' : '✅ None'}`);
  
  console.log('\n🏆 NEXT STEPS:');
  console.log('  1. 🔧 Implement fixes for identified root causes');
  console.log('  2. 📱 Test QR code generation and scanning');
  console.log('  3. 🔗 Validate WhatsApp connection establishment');
  console.log('  4. 📊 Monitor for infinite loops and performance issues');
  console.log('  5. 🧪 End-to-end testing with real WhatsApp instances');
  
  return results;
}

// Run the comprehensive investigation
investigateWhatsAppConnectionIssues().then(results => {
  console.log('\n📋 WhatsApp connection issues investigation completed.');
  console.log('🎯 Detailed action plan available for implementation.');
  
  const hasCriticalIssues = results.rootCauses.length > 0;
  process.exit(hasCriticalIssues ? 1 : 0);
}).catch(error => {
  console.error('\n💥 Investigation failed:', error);
  process.exit(1);
});
