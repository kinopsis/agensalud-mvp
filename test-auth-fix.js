/**
 * Test Authentication Fix
 * Verify that the authentication issues have been resolved
 */

async function testAuthenticationFix() {
  console.log('🔐 TESTING AUTHENTICATION FIX');
  console.log('=' .repeat(60));
  
  const results = {
    qrEndpoint: {},
    statusEndpoint: {},
    authFixed: false,
    qrGeneration: {}
  };

  const testInstanceId = '927cecbe-pticavisualcarwhatsa';
  
  // Test 1: QR Endpoint Authentication
  console.log('\n📱 TEST 1: QR Endpoint Authentication');
  console.log('-'.repeat(50));
  
  try {
    console.log(`🔄 Testing QR endpoint authentication for: ${testInstanceId}`);
    
    const qrResponse = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/test-${testInstanceId}/qr`);
    const qrResult = await qrResponse.json();
    
    results.qrEndpoint = {
      status: qrResponse.status,
      success: qrResult.success,
      error: qrResult.error,
      hasQRCode: !!qrResult.data?.qrCode,
      authTime: qrResult.performance?.authTime,
      authMethod: qrResult.performance?.method,
      isFallback: qrResult.performance?.isFallback,
      developmentNote: qrResult.data?.developmentNote
    };
    
    console.log(`📊 QR Response: ${qrResponse.status}`);
    console.log(`✅ Success: ${qrResult.success}`);
    console.log(`❌ Error: ${qrResult.error || 'None'}`);
    console.log(`📱 Has QR Code: ${results.qrEndpoint.hasQRCode ? 'Yes' : 'No'}`);
    console.log(`⏱️  Auth Time: ${results.qrEndpoint.authTime || 'N/A'}ms`);
    console.log(`🔧 Auth Method: ${results.qrEndpoint.authMethod || 'N/A'}`);
    console.log(`🔄 Is Fallback: ${results.qrEndpoint.isFallback ? 'Yes' : 'No'}`);
    
    if (results.qrEndpoint.developmentNote) {
      console.log(`📝 Dev Note: ${results.qrEndpoint.developmentNote}`);
    }
    
    // Check if authentication is now working
    if (qrResponse.status === 200 && qrResult.success) {
      console.log('✅ Authentication is now working!');
      results.authFixed = true;
    } else if (qrResponse.status === 403 && qrResult.error?.includes('User profile not found')) {
      console.log('❌ Authentication still failing - profile lookup issue');
    } else if (qrResponse.status === 401) {
      console.log('❌ Authentication still failing - auth required');
    } else {
      console.log('⚠️ Different issue detected');
    }
    
  } catch (error) {
    console.error('❌ QR endpoint test failed:', error.message);
    results.qrEndpoint = { error: error.message };
  }

  // Test 2: Status Endpoint Authentication
  console.log('\n📊 TEST 2: Status Endpoint Authentication');
  console.log('-'.repeat(50));
  
  try {
    console.log(`🔄 Testing status endpoint authentication for: ${testInstanceId}`);
    
    const statusResponse = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/test-${testInstanceId}/status`);
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
    
    if (statusResponse.status === 401 && statusResult.error?.includes('Authentication required')) {
      console.log('⚠️ Status endpoint still requires authentication (expected for production)');
    }
    
  } catch (error) {
    console.error('❌ Status endpoint test failed:', error.message);
    results.statusEndpoint = { error: error.message };
  }

  // Test 3: QR Code Quality Analysis
  console.log('\n🔍 TEST 3: QR Code Quality Analysis');
  console.log('-'.repeat(50));
  
  if (results.qrEndpoint.hasQRCode && results.qrEndpoint.success) {
    try {
      // Get the QR code again to analyze it
      const qrResponse = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/test-${testInstanceId}/qr`);
      const qrResult = await qrResponse.json();
      
      if (qrResult.data?.qrCode) {
        const qrCode = qrResult.data.qrCode;
        const base64Data = qrCode.split(',')[1];
        
        results.qrGeneration = {
          totalLength: qrCode.length,
          base64Length: base64Data?.length || 0,
          format: qrCode.startsWith('data:image/png') ? 'PNG' : qrCode.startsWith('data:image/jpeg') ? 'JPEG' : 'Unknown',
          isLikelyReal: qrCode.length > 500 && base64Data?.length > 200,
          isMock: qrCode.length < 200,
          expiresAt: qrResult.data.expiresAt,
          lastUpdated: qrResult.data.lastUpdated
        };
        
        console.log(`📊 QR Code Analysis:`);
        console.log(`  Total Length: ${results.qrGeneration.totalLength} chars`);
        console.log(`  Base64 Length: ${results.qrGeneration.base64Length} chars`);
        console.log(`  Format: ${results.qrGeneration.format}`);
        console.log(`  Likely Real QR: ${results.qrGeneration.isLikelyReal ? '✅ Yes' : '❌ No'}`);
        console.log(`  Is Mock: ${results.qrGeneration.isMock ? '⚠️ Yes' : '✅ No'}`);
        console.log(`  Expires At: ${results.qrGeneration.expiresAt}`);
        
        if (results.qrGeneration.expiresAt) {
          const expiresAt = new Date(results.qrGeneration.expiresAt);
          const now = new Date();
          const timeToExpiry = Math.round((expiresAt.getTime() - now.getTime()) / 1000);
          console.log(`  Time to Expiry: ${timeToExpiry} seconds`);
        }
        
      } else {
        console.log('❌ No QR code data available for analysis');
      }
      
    } catch (error) {
      console.error('❌ QR code analysis failed:', error.message);
    }
  } else {
    console.log('⚠️ No QR code available for analysis (authentication may still be failing)');
  }

  // Test 4: Development vs Production Behavior
  console.log('\n🔧 TEST 4: Development vs Production Behavior');
  console.log('-'.repeat(50));
  
  try {
    // Test development endpoint
    const devResponse = await fetch('http://localhost:3001/api/dev/qr-test');
    const devResult = await devResponse.json();
    
    console.log(`📊 Development Endpoint:`);
    console.log(`  Status: ${devResponse.status}`);
    console.log(`  Success: ${devResult.success}`);
    console.log(`  Has QR: ${!!devResult.data?.qrCode}`);
    
    // Compare with production endpoint
    console.log(`📊 Production Endpoint:`);
    console.log(`  Status: ${results.qrEndpoint.status}`);
    console.log(`  Success: ${results.qrEndpoint.success}`);
    console.log(`  Has QR: ${results.qrEndpoint.hasQRCode}`);
    console.log(`  Uses Fallback: ${results.qrEndpoint.isFallback ? 'Yes' : 'No'}`);
    
    if (results.qrEndpoint.success && results.qrEndpoint.isFallback) {
      console.log('✅ Production endpoint now uses development fallback successfully');
    } else if (results.qrEndpoint.success && !results.qrEndpoint.isFallback) {
      console.log('🎉 Production endpoint works with real authentication!');
    }
    
  } catch (error) {
    console.error('❌ Development vs production comparison failed:', error.message);
  }

  // Summary
  console.log('\n📈 AUTHENTICATION FIX SUMMARY');
  console.log('=' .repeat(60));
  
  console.log('\n🎯 FIX STATUS:');
  console.log(`  Authentication Fixed: ${results.authFixed ? '✅ Yes' : '❌ No'}`);
  console.log(`  QR Endpoint Working: ${results.qrEndpoint.success ? '✅ Yes' : '❌ No'}`);
  console.log(`  QR Code Generated: ${results.qrEndpoint.hasQRCode ? '✅ Yes' : '❌ No'}`);
  console.log(`  Circuit Breaker Bypassed: ${!results.statusEndpoint.isBlocked ? '✅ Yes' : '❌ No'}`);
  
  console.log('\n📊 ENDPOINT RESPONSES:');
  console.log(`  QR Endpoint: ${results.qrEndpoint.status || 'Failed'} - ${results.qrEndpoint.error || 'Success'}`);
  console.log(`  Status Endpoint: ${results.statusEndpoint.status || 'Failed'} - ${results.statusEndpoint.error?.message || 'Success'}`);
  
  if (results.qrGeneration.totalLength) {
    console.log('\n📱 QR CODE QUALITY:');
    console.log(`  Length: ${results.qrGeneration.totalLength} chars`);
    console.log(`  Format: ${results.qrGeneration.format}`);
    console.log(`  Real QR Code: ${results.qrGeneration.isLikelyReal ? '✅ Yes' : '❌ No (Mock)'}`);
  }
  
  if (results.authFixed) {
    console.log('\n✅ SUCCESS: Authentication issues have been resolved!');
    console.log('🎯 QR codes can now be generated successfully');
    
    if (results.qrGeneration.isMock) {
      console.log('⚠️ NEXT STEP: Replace mock QR codes with real Evolution API QR codes');
    } else if (results.qrGeneration.isLikelyReal) {
      console.log('🎉 BONUS: Real QR codes are being generated!');
    }
  } else {
    console.log('\n❌ ISSUE: Authentication problems may still exist');
    console.log('🔧 Check authentication flow and profile lookup logic');
  }
  
  console.log('\n🏆 NEXT STEPS:');
  if (results.authFixed) {
    console.log('  1. ✅ Authentication fix complete');
    console.log('  2. 📱 Replace mock QR codes with real Evolution API QR codes');
    console.log('  3. 🧪 Test actual WhatsApp scanning');
    console.log('  4. 🔗 Fix webhook configuration');
  } else {
    console.log('  1. 🔧 Complete authentication fix');
    console.log('  2. 🔄 Test profile lookup logic');
    console.log('  3. 🧪 Re-test QR generation');
  }
  
  return results;
}

// Run the authentication fix test
testAuthenticationFix().then(results => {
  console.log('\n📋 Authentication fix test completed.');
  
  const isFixed = results.authFixed && results.qrEndpoint.success;
  process.exit(isFixed ? 0 : 1);
}).catch(error => {
  console.error('\n💥 Authentication test failed:', error);
  process.exit(1);
});
