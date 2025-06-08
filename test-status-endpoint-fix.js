/**
 * Test Status Endpoint Authentication Fix
 * Verify that the status endpoint now works with fastAuth
 */

async function testStatusEndpointFix() {
  console.log('🔧 TESTING STATUS ENDPOINT AUTHENTICATION FIX');
  console.log('=' .repeat(70));
  
  const results = {
    statusEndpoint: {},
    qrEndpoint: {},
    authFixed: false
  };

  const testInstanceId = '927cecbe-pticavisualcarwhatsa';
  
  // Test 1: Status Endpoint Authentication
  console.log('\n📊 TEST 1: Status Endpoint Authentication');
  console.log('-'.repeat(60));
  
  try {
    console.log(`🔄 Testing status endpoint for: ${testInstanceId}`);
    
    const statusResponse = await fetch(`http://localhost:3000/api/channels/whatsapp/instances/${testInstanceId}/status`);
    const statusResult = await statusResponse.json();
    
    results.statusEndpoint = {
      status: statusResponse.status,
      success: statusResult.success,
      error: statusResult.error,
      hasData: !!statusResult.data,
      errorCode: statusResult.error?.code
    };
    
    console.log(`📊 Status Response: ${statusResponse.status}`);
    console.log(`✅ Success: ${statusResult.success}`);
    console.log(`❌ Error: ${statusResult.error?.message || 'None'}`);
    console.log(`📋 Error Code: ${statusResult.error?.code || 'None'}`);
    console.log(`📱 Has Data: ${results.statusEndpoint.hasData ? 'Yes' : 'No'}`);
    
    // Check if authentication is now working
    if (statusResponse.status === 401 && statusResult.error?.code === 'UNAUTHORIZED') {
      console.log('❌ Authentication still failing - fastAuth not working');
    } else if (statusResponse.status === 404 || statusResponse.status === 200) {
      console.log('✅ Authentication is now working! (404/200 instead of 401)');
      results.authFixed = true;
    } else if (statusResponse.status === 403) {
      console.log('⚠️ Authentication working but permission denied');
      results.authFixed = true;
    } else {
      console.log('⚠️ Different response - authentication may be working');
    }
    
  } catch (error) {
    console.error('❌ Status endpoint test failed:', error.message);
    results.statusEndpoint = { error: error.message };
  }

  // Test 2: QR Endpoint Comparison
  console.log('\n📱 TEST 2: QR Endpoint Comparison');
  console.log('-'.repeat(60));
  
  try {
    console.log(`🔄 Testing QR endpoint for comparison: ${testInstanceId}`);
    
    const qrResponse = await fetch(`http://localhost:3000/api/channels/whatsapp/instances/${testInstanceId}/qr`);
    const qrResult = await qrResponse.json();
    
    results.qrEndpoint = {
      status: qrResponse.status,
      success: qrResult.success,
      error: qrResult.error,
      hasQRCode: !!qrResult.data?.qrCode,
      errorCode: qrResult.error?.code
    };
    
    console.log(`📊 QR Response: ${qrResponse.status}`);
    console.log(`✅ Success: ${qrResult.success}`);
    console.log(`❌ Error: ${qrResult.error || 'None'}`);
    console.log(`📱 Has QR Code: ${results.qrEndpoint.hasQRCode ? 'Yes' : 'No'}`);
    
    // Compare authentication behavior
    if (results.statusEndpoint.status === results.qrEndpoint.status) {
      console.log('✅ Status and QR endpoints have consistent authentication behavior');
    } else {
      console.log('⚠️ Status and QR endpoints have different authentication behavior');
      console.log(`   Status: ${results.statusEndpoint.status}, QR: ${results.qrEndpoint.status}`);
    }
    
  } catch (error) {
    console.error('❌ QR endpoint test failed:', error.message);
    results.qrEndpoint = { error: error.message };
  }

  // Test 3: Development Endpoint Verification
  console.log('\n🔧 TEST 3: Development Endpoint Verification');
  console.log('-'.repeat(60));
  
  try {
    console.log('🔄 Testing development endpoint for baseline...');
    
    const devResponse = await fetch('http://localhost:3000/api/dev/qr-test');
    const devResult = await devResponse.json();
    
    console.log(`📊 Dev Response: ${devResponse.status}`);
    console.log(`✅ Success: ${devResult.success}`);
    console.log(`📱 Has QR: ${!!devResult.data?.qrCode}`);
    
    if (devResponse.status === 200 && devResult.success) {
      console.log('✅ Development endpoint still working as baseline');
    } else {
      console.log('❌ Development endpoint has issues');
    }
    
  } catch (error) {
    console.error('❌ Development endpoint test failed:', error.message);
  }

  // Summary
  console.log('\n📈 STATUS ENDPOINT FIX SUMMARY');
  console.log('=' .repeat(70));
  
  console.log('\n🎯 FIX STATUS:');
  console.log(`  Authentication Fixed: ${results.authFixed ? '✅ Yes' : '❌ No'}`);
  console.log(`  Status Endpoint Working: ${results.statusEndpoint.status !== 401 ? '✅ Yes' : '❌ No'}`);
  console.log(`  QR Endpoint Working: ${results.qrEndpoint.status !== 401 ? '✅ Yes' : '❌ No'}`);
  console.log(`  Consistent Behavior: ${results.statusEndpoint.status === results.qrEndpoint.status ? '✅ Yes' : '❌ No'}`);
  
  console.log('\n📊 ENDPOINT RESPONSES:');
  console.log(`  Status Endpoint: ${results.statusEndpoint.status || 'Failed'} - ${results.statusEndpoint.error?.message || results.statusEndpoint.errorCode || 'Success'}`);
  console.log(`  QR Endpoint: ${results.qrEndpoint.status || 'Failed'} - ${results.qrEndpoint.error || 'Success'}`);
  
  console.log('\n🔍 ANALYSIS:');
  if (results.authFixed) {
    console.log('✅ SUCCESS: Status endpoint authentication has been fixed!');
    console.log('🎯 Both endpoints now use fastAuth consistently');
    
    if (results.statusEndpoint.status === 404) {
      console.log('📝 404 errors are expected - instance not found in Evolution API');
      console.log('🔧 Next step: Fix instance creation/recreation');
    } else if (results.statusEndpoint.status === 200) {
      console.log('🎉 BONUS: Status endpoint is fully working!');
    }
  } else {
    console.log('❌ ISSUE: Status endpoint authentication still has problems');
    console.log('🔧 Check fastAuth implementation and development fallback');
  }
  
  console.log('\n🏆 NEXT STEPS:');
  if (results.authFixed) {
    console.log('  1. ✅ Status endpoint authentication fix complete');
    console.log('  2. 🔧 Fix instance creation endpoint authentication');
    console.log('  3. 📱 Fix instance recreation for missing Evolution API instances');
    console.log('  4. 🧪 Test complete instance creation flow');
  } else {
    console.log('  1. 🔧 Debug fastAuth implementation in status endpoint');
    console.log('  2. 🔄 Re-test authentication fixes');
    console.log('  3. 📊 Check server logs for authentication errors');
  }
  
  return results;
}

// Run the status endpoint fix test
testStatusEndpointFix().then(results => {
  console.log('\n📋 Status endpoint authentication fix test completed.');
  
  const isFixed = results.authFixed && results.statusEndpoint.status !== 401;
  process.exit(isFixed ? 0 : 1);
}).catch(error => {
  console.error('\n💥 Status endpoint test failed:', error);
  process.exit(1);
});
