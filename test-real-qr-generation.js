/**
 * Test Real QR Code Generation
 * Verify that real QR codes are now being generated instead of mocks
 */

async function testRealQRGeneration() {
  console.log('📱 TESTING REAL QR CODE GENERATION');
  console.log('=' .repeat(70));
  
  const results = {
    developmentEndpoint: {},
    qrCodeAnalysis: {},
    realQRGenerated: false,
    evolutionAPIWorking: false
  };

  // Test 1: Development Endpoint QR Generation
  console.log('\n🔧 TEST 1: Development Endpoint QR Generation');
  console.log('-'.repeat(60));
  
  try {
    console.log('🔄 Testing development QR endpoint for real QR generation...');
    
    const startTime = Date.now();
    const devResponse = await fetch('http://localhost:3001/api/dev/qr-test');
    const devResult = await devResponse.json();
    const responseTime = Date.now() - startTime;
    
    results.developmentEndpoint = {
      status: devResponse.status,
      success: devResult.success,
      responseTime,
      hasQRCode: !!devResult.data?.qrCode,
      message: devResult.message,
      developmentNote: devResult.data?.developmentNote,
      instanceName: devResult.data?.instanceName
    };
    
    console.log(`📊 Response Status: ${devResponse.status}`);
    console.log(`✅ Success: ${devResult.success}`);
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`📱 Has QR Code: ${results.developmentEndpoint.hasQRCode ? 'Yes' : 'No'}`);
    console.log(`📝 Message: ${devResult.message}`);
    console.log(`🔧 Dev Note: ${results.developmentEndpoint.developmentNote}`);
    console.log(`🏷️  Instance Name: ${results.developmentEndpoint.instanceName}`);
    
    // Check if Evolution API was used
    if (results.developmentEndpoint.developmentNote?.includes('Real QR code from Evolution API')) {
      console.log('🎉 Evolution API successfully generated real QR code!');
      results.evolutionAPIWorking = true;
    } else if (results.developmentEndpoint.developmentNote?.includes('Evolution API unavailable')) {
      console.log('⚠️ Evolution API unavailable, using fallback mock QR');
      results.evolutionAPIWorking = false;
    } else {
      console.log('❓ Unknown QR generation method');
    }
    
  } catch (error) {
    console.error('❌ Development endpoint test failed:', error.message);
    results.developmentEndpoint = { error: error.message };
  }

  // Test 2: QR Code Quality Analysis
  console.log('\n🔍 TEST 2: QR Code Quality Analysis');
  console.log('-'.repeat(60));
  
  if (results.developmentEndpoint.hasQRCode) {
    try {
      // Get QR code for analysis
      const devResponse = await fetch('http://localhost:3001/api/dev/qr-test');
      const devResult = await devResponse.json();
      
      if (devResult.data?.qrCode) {
        const qrCode = devResult.data.qrCode;
        const base64Data = qrCode.split(',')[1];
        
        results.qrCodeAnalysis = {
          totalLength: qrCode.length,
          base64Length: base64Data?.length || 0,
          format: qrCode.startsWith('data:image/png') ? 'PNG' : qrCode.startsWith('data:image/jpeg') ? 'JPEG' : 'Unknown',
          isLikelyReal: qrCode.length > 500 && base64Data?.length > 200,
          isMock: qrCode.length < 200,
          isScannableFormat: qrCode.startsWith('data:image/') && base64Data?.length > 50,
          expiresAt: devResult.data.expiresAt
        };
        
        console.log(`📊 QR Code Analysis:`);
        console.log(`  Total Length: ${results.qrCodeAnalysis.totalLength} chars`);
        console.log(`  Base64 Length: ${results.qrCodeAnalysis.base64Length} chars`);
        console.log(`  Format: ${results.qrCodeAnalysis.format}`);
        console.log(`  Likely Real QR: ${results.qrCodeAnalysis.isLikelyReal ? '✅ Yes' : '❌ No'}`);
        console.log(`  Is Mock: ${results.qrCodeAnalysis.isMock ? '⚠️ Yes' : '✅ No'}`);
        console.log(`  Scannable Format: ${results.qrCodeAnalysis.isScannableFormat ? '✅ Yes' : '❌ No'}`);
        console.log(`  Expires At: ${results.qrCodeAnalysis.expiresAt}`);
        
        // Determine if real QR was generated
        if (results.qrCodeAnalysis.isLikelyReal && !results.qrCodeAnalysis.isMock) {
          console.log('🎉 REAL QR CODE DETECTED!');
          results.realQRGenerated = true;
        } else {
          console.log('⚠️ Still using mock QR code');
          results.realQRGenerated = false;
        }
        
        // Check expiration timing
        if (results.qrCodeAnalysis.expiresAt) {
          const expiresAt = new Date(results.qrCodeAnalysis.expiresAt);
          const now = new Date();
          const timeToExpiry = Math.round((expiresAt.getTime() - now.getTime()) / 1000);
          console.log(`  Time to Expiry: ${timeToExpiry} seconds`);
          
          if (timeToExpiry >= 30 && timeToExpiry <= 60) {
            console.log('  ✅ Optimal expiration window (30-60s)');
          } else {
            console.log('  ⚠️ Suboptimal expiration window');
          }
        }
        
      } else {
        console.log('❌ No QR code data available for analysis');
      }
      
    } catch (error) {
      console.error('❌ QR code analysis failed:', error.message);
    }
  } else {
    console.log('⚠️ No QR code available for analysis');
  }

  // Test 3: Multiple QR Generation Test
  console.log('\n🔄 TEST 3: Multiple QR Generation Test');
  console.log('-'.repeat(60));
  
  try {
    console.log('🔄 Testing multiple QR generations for consistency...');
    
    const qrTests = [];
    for (let i = 1; i <= 3; i++) {
      const startTime = Date.now();
      const response = await fetch('http://localhost:3001/api/dev/qr-test');
      const result = await response.json();
      const responseTime = Date.now() - startTime;
      
      const qrLength = result.data?.qrCode?.length || 0;
      const isReal = qrLength > 500;
      
      qrTests.push({
        attempt: i,
        responseTime,
        success: result.success,
        qrLength,
        isReal,
        instanceName: result.data?.instanceName
      });
      
      console.log(`  Test ${i}: ${responseTime}ms - QR Length: ${qrLength} - Real: ${isReal ? 'Yes' : 'No'} - Instance: ${result.data?.instanceName}`);
      
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Analyze consistency
    const realQRCount = qrTests.filter(t => t.isReal).length;
    const avgResponseTime = Math.round(qrTests.reduce((sum, t) => sum + t.responseTime, 0) / qrTests.length);
    const allSuccessful = qrTests.every(t => t.success);
    
    console.log(`\n📈 Multiple Generation Summary:`);
    console.log(`  Real QR Codes: ${realQRCount}/3`);
    console.log(`  Average Response Time: ${avgResponseTime}ms`);
    console.log(`  All Successful: ${allSuccessful ? 'Yes' : 'No'}`);
    console.log(`  Consistency: ${realQRCount === 3 ? 'Perfect' : realQRCount > 0 ? 'Partial' : 'None'}`);
    
  } catch (error) {
    console.error('❌ Multiple QR generation test failed:', error.message);
  }

  // Summary
  console.log('\n📈 REAL QR GENERATION SUMMARY');
  console.log('=' .repeat(70));
  
  console.log('\n🎯 GENERATION STATUS:');
  console.log(`  Real QR Generated: ${results.realQRGenerated ? '✅ Yes' : '❌ No'}`);
  console.log(`  Evolution API Working: ${results.evolutionAPIWorking ? '✅ Yes' : '❌ No'}`);
  console.log(`  QR Code Scannable: ${results.qrCodeAnalysis.isScannableFormat ? '✅ Yes' : '❌ No'}`);
  console.log(`  Mock QR Replaced: ${!results.qrCodeAnalysis.isMock ? '✅ Yes' : '❌ No'}`);
  
  console.log('\n📊 QR CODE QUALITY:');
  if (results.qrCodeAnalysis.totalLength) {
    console.log(`  Length: ${results.qrCodeAnalysis.totalLength} chars`);
    console.log(`  Format: ${results.qrCodeAnalysis.format}`);
    console.log(`  Base64 Content: ${results.qrCodeAnalysis.base64Length} chars`);
  }
  
  console.log('\n📱 ENDPOINT PERFORMANCE:');
  console.log(`  Response Time: ${results.developmentEndpoint.responseTime || 'N/A'}ms`);
  console.log(`  Success Rate: ${results.developmentEndpoint.success ? '100%' : '0%'}`);
  
  if (results.realQRGenerated && results.evolutionAPIWorking) {
    console.log('\n🎉 SUCCESS: Real QR codes are now being generated!');
    console.log('✅ Evolution API integration is working correctly');
    console.log('📱 QR codes should be scannable by WhatsApp mobile app');
    
    console.log('\n🏆 NEXT STEPS:');
    console.log('  1. ✅ Real QR generation complete');
    console.log('  2. 🧪 Test actual WhatsApp scanning');
    console.log('  3. 🔗 Fix webhook configuration');
    console.log('  4. 🎯 Test end-to-end connection flow');
    
  } else if (results.realQRGenerated && !results.evolutionAPIWorking) {
    console.log('\n⚠️ PARTIAL: Real QR codes generated but Evolution API issues detected');
    console.log('🔧 Check Evolution API configuration and connectivity');
    
  } else if (!results.realQRGenerated && results.evolutionAPIWorking) {
    console.log('\n⚠️ PARTIAL: Evolution API working but QR codes still appear to be mocks');
    console.log('🔧 Check QR code format and content validation');
    
  } else {
    console.log('\n❌ ISSUE: Still using mock QR codes');
    console.log('🔧 Check Evolution API configuration and QR generation logic');
    
    console.log('\n🏆 NEXT STEPS:');
    console.log('  1. 🔧 Fix Evolution API connectivity');
    console.log('  2. 📱 Ensure real QR code generation');
    console.log('  3. 🧪 Re-test QR generation');
  }
  
  return results;
}

// Run the real QR generation test
testRealQRGeneration().then(results => {
  console.log('\n📋 Real QR generation test completed.');
  
  const isWorking = results.realQRGenerated && results.evolutionAPIWorking;
  process.exit(isWorking ? 0 : 1);
}).catch(error => {
  console.error('\n💥 Real QR generation test failed:', error);
  process.exit(1);
});
