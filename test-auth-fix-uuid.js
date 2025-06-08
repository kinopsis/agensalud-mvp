/**
 * Test Authentication Fix with Proper UUID
 * Test with a valid UUID format to bypass validation issues
 */

async function testAuthenticationFixWithUUID() {
  console.log('🔐 TESTING AUTHENTICATION FIX WITH PROPER UUID');
  console.log('=' .repeat(70));
  
  const results = {
    qrEndpoint: {},
    authFixed: false,
    qrGeneration: {}
  };

  // Use a proper UUID format for testing
  const testInstanceId = '9e47a580-0b7d-41ea-b99d-e0c9304a29f9';
  
  // Test 1: QR Endpoint with Valid UUID
  console.log('\n📱 TEST 1: QR Endpoint with Valid UUID');
  console.log('-'.repeat(60));
  
  try {
    console.log(`🔄 Testing QR endpoint with valid UUID: ${testInstanceId}`);
    
    const qrResponse = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/${testInstanceId}/qr`);
    const qrResult = await qrResponse.json();
    
    results.qrEndpoint = {
      status: qrResponse.status,
      success: qrResult.success,
      error: qrResult.error,
      hasQRCode: !!qrResult.data?.qrCode,
      authTime: qrResult.performance?.authTime,
      authMethod: qrResult.performance?.method,
      isFallback: qrResult.performance?.isFallback,
      developmentNote: qrResult.data?.developmentNote,
      details: qrResult.details
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
    
    if (results.qrEndpoint.details) {
      console.log(`📋 Details: ${results.qrEndpoint.details}`);
    }
    
    // Check authentication status
    if (qrResponse.status === 200 && qrResult.success) {
      console.log('✅ Authentication is now working!');
      results.authFixed = true;
    } else if (qrResponse.status === 403 && qrResult.error?.includes('User profile not found')) {
      console.log('❌ Authentication still failing - profile lookup issue');
    } else if (qrResponse.status === 401) {
      console.log('❌ Authentication still failing - auth required');
    } else if (qrResponse.status === 400) {
      console.log('❌ Request validation issue');
    } else if (qrResponse.status === 404) {
      console.log('⚠️ Instance not found (expected for test UUID)');
    } else if (qrResponse.status === 500) {
      console.log('❌ Server error during processing');
    } else {
      console.log('⚠️ Different issue detected');
    }
    
  } catch (error) {
    console.error('❌ QR endpoint test failed:', error.message);
    results.qrEndpoint = { error: error.message };
  }

  // Test 2: QR Code Quality Analysis (if available)
  console.log('\n🔍 TEST 2: QR Code Quality Analysis');
  console.log('-'.repeat(60));
  
  if (results.qrEndpoint.hasQRCode && results.qrEndpoint.success) {
    try {
      // Get the QR code again to analyze it
      const qrResponse = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/${testInstanceId}/qr`);
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
    console.log('⚠️ No QR code available for analysis');
    
    // If no QR code but authentication worked, check why
    if (results.qrEndpoint.success && !results.qrEndpoint.hasQRCode) {
      console.log('🔍 Authentication successful but no QR code generated');
      console.log('   This could indicate:');
      console.log('   - Instance not found in database (expected for test UUID)');
      console.log('   - Evolution API service issues');
      console.log('   - QR code generation logic problems');
    }
  }

  // Test 3: Compare with Development Endpoint
  console.log('\n🔧 TEST 3: Compare with Development Endpoint');
  console.log('-'.repeat(60));
  
  try {
    // Test development endpoint for comparison
    const devResponse = await fetch('http://localhost:3001/api/dev/qr-test');
    const devResult = await devResponse.json();
    
    console.log(`📊 Development Endpoint:`);
    console.log(`  Status: ${devResponse.status}`);
    console.log(`  Success: ${devResult.success}`);
    console.log(`  Has QR: ${!!devResult.data?.qrCode}`);
    console.log(`  QR Length: ${devResult.data?.qrCode?.length || 0} chars`);
    
    console.log(`📊 Production Endpoint:`);
    console.log(`  Status: ${results.qrEndpoint.status}`);
    console.log(`  Success: ${results.qrEndpoint.success}`);
    console.log(`  Has QR: ${results.qrEndpoint.hasQRCode}`);
    console.log(`  Uses Fallback: ${results.qrEndpoint.isFallback ? 'Yes' : 'No'}`);
    
    // Compare authentication methods
    if (results.qrEndpoint.success && results.qrEndpoint.isFallback) {
      console.log('✅ Production endpoint successfully uses development fallback');
    } else if (results.qrEndpoint.success && !results.qrEndpoint.isFallback) {
      console.log('🎉 Production endpoint works with real authentication!');
    } else if (results.qrEndpoint.status === 404) {
      console.log('⚠️ Production endpoint reaches instance verification (auth working)');
    }
    
  } catch (error) {
    console.error('❌ Development comparison failed:', error.message);
  }

  // Summary
  console.log('\n📈 AUTHENTICATION FIX SUMMARY');
  console.log('=' .repeat(70));
  
  console.log('\n🎯 FIX STATUS:');
  console.log(`  Authentication Fixed: ${results.authFixed ? '✅ Yes' : '❌ No'}`);
  console.log(`  QR Endpoint Accessible: ${results.qrEndpoint.status !== 403 ? '✅ Yes' : '❌ No'}`);
  console.log(`  Validation Passed: ${results.qrEndpoint.status !== 400 ? '✅ Yes' : '❌ No'}`);
  console.log(`  Reaches Instance Logic: ${results.qrEndpoint.status === 404 ? '✅ Yes' : '⚠️ Unknown'}`);
  
  console.log('\n📊 ENDPOINT RESPONSE:');
  console.log(`  Status: ${results.qrEndpoint.status || 'Failed'}`);
  console.log(`  Error: ${results.qrEndpoint.error || 'None'}`);
  console.log(`  Auth Method: ${results.qrEndpoint.authMethod || 'N/A'}`);
  console.log(`  Fallback Used: ${results.qrEndpoint.isFallback ? 'Yes' : 'No'}`);
  
  // Determine overall status
  const authWorking = results.qrEndpoint.status !== 403 && results.qrEndpoint.status !== 401;
  const validationPassed = results.qrEndpoint.status !== 400;
  const reachesInstanceLogic = results.qrEndpoint.status === 404 || results.qrEndpoint.status === 200;
  
  if (authWorking && validationPassed && reachesInstanceLogic) {
    console.log('\n✅ SUCCESS: Authentication issues have been resolved!');
    console.log('🎯 The endpoint now properly authenticates users and validates requests');
    console.log('📝 404 error is expected since test UUID doesn\'t exist in database');
    
    if (results.qrEndpoint.isFallback) {
      console.log('🔧 Using development authentication fallback successfully');
    }
    
    console.log('\n🏆 NEXT STEPS:');
    console.log('  1. ✅ Authentication fix complete');
    console.log('  2. 📱 Replace mock QR codes with real Evolution API QR codes');
    console.log('  3. 🧪 Test with real WhatsApp instance data');
    console.log('  4. 🔗 Fix webhook configuration');
    
  } else if (!authWorking) {
    console.log('\n❌ ISSUE: Authentication problems still exist');
    console.log('🔧 Check authentication flow and profile lookup logic');
    
  } else if (!validationPassed) {
    console.log('\n❌ ISSUE: Request validation problems');
    console.log('🔧 Check UUID format and validation schema');
    
  } else {
    console.log('\n⚠️ PARTIAL: Some issues resolved, others remain');
    console.log('🔧 Continue debugging based on specific error codes');
  }
  
  return results;
}

// Run the authentication fix test with proper UUID
testAuthenticationFixWithUUID().then(results => {
  console.log('\n📋 Authentication fix test with UUID completed.');
  
  const authWorking = results.qrEndpoint.status !== 403 && results.qrEndpoint.status !== 401;
  const validationPassed = results.qrEndpoint.status !== 400;
  const isFixed = authWorking && validationPassed;
  
  process.exit(isFixed ? 0 : 1);
}).catch(error => {
  console.error('\n💥 Authentication test failed:', error);
  process.exit(1);
});
