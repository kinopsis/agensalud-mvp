/**
 * WhatsApp Instance Creation Flow Regression Investigation
 * Analyzes QR display failures, instance name inconsistencies, and recent changes
 */

async function investigateQRDisplayRegression() {
  console.log('🔍 WHATSAPP INSTANCE CREATION FLOW REGRESSION INVESTIGATION');
  console.log('=' .repeat(80));
  
  const results = {
    qrDisplayIssues: {},
    instanceNameIssues: {},
    backendFlow: {},
    frontendFlow: {},
    regressionCauses: [],
    fixes: []
  };

  // Issue 1: QR Code Display Failure Analysis
  console.log('\n📱 ISSUE 1: QR Code Display Failure Analysis');
  console.log('-'.repeat(70));
  
  try {
    console.log('🔄 Testing QR code display for existing instances...');
    
    // Test the problematic instance from the screenshot
    const problemInstance = '927cecbe-pticavisualcarwhatsa';
    console.log(`📋 Testing instance: ${problemInstance}`);
    
    // Test QR endpoint directly
    const qrResponse = await fetch(`http://localhost:3000/api/channels/whatsapp/instances/${problemInstance}/qr`);
    const qrResult = await qrResponse.json();
    
    console.log(`📊 QR Response Status: ${qrResponse.status}`);
    console.log(`✅ QR Success: ${qrResult.success}`);
    console.log(`❌ QR Error: ${qrResult.error || 'None'}`);
    console.log(`📱 Has QR Code: ${!!qrResult.data?.qrCode}`);
    
    if (qrResult.data?.qrCode) {
      console.log(`📏 QR Code Length: ${qrResult.data.qrCode.length} chars`);
      console.log(`⏰ QR Expires At: ${qrResult.data.expiresAt}`);
    }
    
    results.qrDisplayIssues = {
      status: qrResponse.status,
      success: qrResult.success,
      error: qrResult.error,
      hasQRCode: !!qrResult.data?.qrCode,
      qrLength: qrResult.data?.qrCode?.length || 0,
      expiresAt: qrResult.data?.expiresAt,
      issue: null
    };
    
    // Analyze the issue
    if (qrResponse.status === 404) {
      results.qrDisplayIssues.issue = 'Instance not found in database';
      results.regressionCauses.push('Instance creation not saving to database properly');
    } else if (qrResponse.status === 500) {
      results.qrDisplayIssues.issue = 'Server error during QR generation';
      results.regressionCauses.push('Server compilation errors affecting QR endpoints');
    } else if (qrResult.success && !qrResult.data?.qrCode) {
      results.qrDisplayIssues.issue = 'QR endpoint succeeds but no QR code returned';
      results.regressionCauses.push('Evolution API integration broken');
    } else if (qrResult.data?.qrCode?.length < 200) {
      results.qrDisplayIssues.issue = 'Mock QR codes instead of real ones';
      results.regressionCauses.push('Evolution API fallback to mock QR codes');
    }
    
  } catch (error) {
    console.error('❌ QR display analysis failed:', error.message);
    results.qrDisplayIssues = { error: error.message };
    results.regressionCauses.push(`QR display test error: ${error.message}`);
  }

  // Issue 2: Instance Name Inconsistencies Analysis
  console.log('\n🏷️ ISSUE 2: Instance Name Inconsistencies Analysis');
  console.log('-'.repeat(70));
  
  try {
    console.log('🔄 Testing instance name consistency...');
    
    const problemInstance = '927cecbe-pticavisualcarwhatsa';
    
    // Test status endpoint to see what name is returned
    const statusResponse = await fetch(`http://localhost:3000/api/channels/whatsapp/instances/${problemInstance}/status`);
    const statusResult = await statusResponse.json();
    
    console.log(`📊 Status Response: ${statusResponse.status}`);
    console.log(`📋 Status Data:`, statusResult.success ? 'Success' : statusResult.error);
    
    if (statusResult.data) {
      console.log(`🏷️ Instance Name in Status: ${statusResult.data.instanceName || 'N/A'}`);
      console.log(`🆔 Instance ID in Status: ${statusResult.data.instanceId || 'N/A'}`);
    }
    
    // Test development endpoint for comparison
    const devResponse = await fetch('http://localhost:3000/api/dev/qr-test');
    const devResult = await devResponse.json();
    
    console.log(`🔧 Dev Endpoint Status: ${devResponse.status}`);
    if (devResult.data) {
      console.log(`🏷️ Dev Instance Name: ${devResult.data.instanceName || 'N/A'}`);
      console.log(`🆔 Dev Instance ID: ${devResult.data.instanceId || 'N/A'}`);
    }
    
    results.instanceNameIssues = {
      statusEndpoint: {
        status: statusResponse.status,
        instanceName: statusResult.data?.instanceName,
        instanceId: statusResult.data?.instanceId
      },
      devEndpoint: {
        status: devResponse.status,
        instanceName: devResult.data?.instanceName,
        instanceId: devResult.data?.instanceId
      },
      inconsistency: null
    };
    
    // Check for inconsistencies
    const frontendName = '927cecbe-pticavisualcarwhatsa'; // From screenshot
    const backendName = statusResult.data?.instanceName;
    
    if (frontendName !== backendName && backendName) {
      results.instanceNameIssues.inconsistency = `Frontend shows '${frontendName}' but backend has '${backendName}'`;
      results.regressionCauses.push('Instance name mapping inconsistency between frontend and backend');
    }
    
  } catch (error) {
    console.error('❌ Instance name analysis failed:', error.message);
    results.instanceNameIssues = { error: error.message };
  }

  // Issue 3: Backend Instance Creation Flow Analysis
  console.log('\n🔧 ISSUE 3: Backend Instance Creation Flow Analysis');
  console.log('-'.repeat(70));
  
  try {
    console.log('🔄 Testing backend instance creation flow...');
    
    // Test instance creation endpoint
    const createTestData = {
      instanceName: `test-regression-${Date.now()}`,
      organizationId: 'test-org'
    };
    
    console.log(`📝 Testing instance creation with: ${createTestData.instanceName}`);
    
    const createResponse = await fetch('http://localhost:3000/api/channels/whatsapp/instances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createTestData)
    });
    
    const createResult = await createResponse.json();
    
    console.log(`📊 Create Response: ${createResponse.status}`);
    console.log(`✅ Create Success: ${createResult.success}`);
    console.log(`❌ Create Error: ${createResult.error || 'None'}`);
    
    if (createResult.data) {
      console.log(`🆔 Created Instance ID: ${createResult.data.instanceId || 'N/A'}`);
      console.log(`🏷️ Created Instance Name: ${createResult.data.instanceName || 'N/A'}`);
    }
    
    results.backendFlow = {
      createStatus: createResponse.status,
      createSuccess: createResult.success,
      createError: createResult.error,
      createdInstanceId: createResult.data?.instanceId,
      createdInstanceName: createResult.data?.instanceName,
      issue: null
    };
    
    // Analyze creation flow issues
    if (createResponse.status === 500) {
      results.backendFlow.issue = 'Server error during instance creation';
      results.regressionCauses.push('Backend instance creation endpoint broken');
    } else if (createResponse.status === 401 || createResponse.status === 403) {
      results.backendFlow.issue = 'Authentication issues in instance creation';
      results.regressionCauses.push('Authentication fixes may have broken instance creation');
    } else if (createResult.success && !createResult.data?.instanceId) {
      results.backendFlow.issue = 'Instance creation succeeds but no instance ID returned';
      results.regressionCauses.push('Instance creation response format changed');
    }
    
  } catch (error) {
    console.error('❌ Backend flow analysis failed:', error.message);
    results.backendFlow = { error: error.message };
  }

  // Issue 4: Frontend Flow Analysis
  console.log('\n🖥️ ISSUE 4: Frontend Flow Analysis');
  console.log('-'.repeat(70));
  
  try {
    console.log('🔄 Testing frontend component integration...');
    
    // Test if the QR display component endpoints are working
    const componentTests = [
      { name: 'QR Endpoint', url: `http://localhost:3000/api/channels/whatsapp/instances/test-id/qr` },
      { name: 'Status Endpoint', url: `http://localhost:3000/api/channels/whatsapp/instances/test-id/status` },
      { name: 'Dev QR Test', url: `http://localhost:3000/api/dev/qr-test` }
    ];
    
    const componentResults = [];
    
    for (const test of componentTests) {
      try {
        const response = await fetch(test.url);
        const result = await response.json();
        
        componentResults.push({
          name: test.name,
          status: response.status,
          success: result.success,
          hasData: !!result.data,
          error: result.error
        });
        
        console.log(`  ${test.name}: ${response.status} - ${result.success ? 'Success' : result.error}`);
        
      } catch (testError) {
        componentResults.push({
          name: test.name,
          status: 'ERROR',
          error: testError.message
        });
        console.log(`  ${test.name}: ERROR - ${testError.message}`);
      }
    }
    
    results.frontendFlow = {
      componentTests: componentResults,
      allWorking: componentResults.every(t => t.status === 200 || t.status === 404),
      issue: null
    };
    
    // Check for frontend integration issues
    const hasServerErrors = componentResults.some(t => t.status === 500);
    const hasAuthErrors = componentResults.some(t => t.status === 401 || t.status === 403);
    
    if (hasServerErrors) {
      results.frontendFlow.issue = 'Server errors affecting frontend components';
      results.regressionCauses.push('Server compilation errors breaking frontend integration');
    } else if (hasAuthErrors) {
      results.frontendFlow.issue = 'Authentication errors in frontend components';
      results.regressionCauses.push('Authentication fixes causing frontend access issues');
    }
    
  } catch (error) {
    console.error('❌ Frontend flow analysis failed:', error.message);
    results.frontendFlow = { error: error.message };
  }

  // Regression Analysis and Fix Recommendations
  console.log('\n📈 REGRESSION ANALYSIS AND FIX RECOMMENDATIONS');
  console.log('=' .repeat(80));
  
  console.log('\n🚨 ROOT CAUSES IDENTIFIED:');
  if (results.regressionCauses.length === 0) {
    console.log('  ✅ No critical regression causes identified');
  } else {
    results.regressionCauses.forEach((cause, index) => {
      console.log(`  ${index + 1}. ❌ ${cause}`);
    });
  }
  
  // Generate fix recommendations
  const fixes = [];
  
  if (results.qrDisplayIssues.issue) {
    if (results.qrDisplayIssues.issue.includes('Server error')) {
      fixes.push('Fix server compilation errors in QR endpoints');
    } else if (results.qrDisplayIssues.issue.includes('not found')) {
      fixes.push('Fix instance creation to properly save to database');
    } else if (results.qrDisplayIssues.issue.includes('Evolution API')) {
      fixes.push('Fix Evolution API integration for real QR generation');
    }
  }
  
  if (results.instanceNameIssues.inconsistency) {
    fixes.push('Fix instance name mapping between frontend and backend');
  }
  
  if (results.backendFlow.issue) {
    if (results.backendFlow.issue.includes('Server error')) {
      fixes.push('Fix backend instance creation endpoint compilation errors');
    } else if (results.backendFlow.issue.includes('Authentication')) {
      fixes.push('Fix authentication in instance creation flow');
    }
  }
  
  if (results.frontendFlow.issue) {
    if (results.frontendFlow.issue.includes('Server errors')) {
      fixes.push('Fix server compilation errors affecting frontend');
    } else if (results.frontendFlow.issue.includes('Authentication')) {
      fixes.push('Fix authentication in frontend component integration');
    }
  }
  
  results.fixes = fixes;
  
  console.log('\n🔧 RECOMMENDED FIXES:');
  if (fixes.length === 0) {
    console.log('  ✅ No fixes required');
  } else {
    fixes.forEach((fix, index) => {
      console.log(`  ${index + 1}. 🛠️ ${fix}`);
    });
  }
  
  console.log('\n📊 ISSUE SUMMARY:');
  console.log(`  QR Display Issues: ${results.qrDisplayIssues.issue ? '❌ Found' : '✅ None'}`);
  console.log(`  Instance Name Issues: ${results.instanceNameIssues.inconsistency ? '❌ Found' : '✅ None'}`);
  console.log(`  Backend Flow Issues: ${results.backendFlow.issue ? '❌ Found' : '✅ None'}`);
  console.log(`  Frontend Flow Issues: ${results.frontendFlow.issue ? '❌ Found' : '✅ None'}`);
  
  console.log('\n🏆 NEXT STEPS:');
  console.log('  1. 🔧 Implement recommended fixes');
  console.log('  2. 📱 Test QR code display restoration');
  console.log('  3. 🏷️ Validate instance name consistency');
  console.log('  4. 🧪 End-to-end testing of complete flow');
  console.log('  5. 📊 Monitor for regression prevention');
  
  return results;
}

// Run the regression investigation
investigateQRDisplayRegression().then(results => {
  console.log('\n📋 WhatsApp instance creation flow regression investigation completed.');
  console.log('🎯 Detailed analysis and fix recommendations available above.');
  
  const hasIssues = results.regressionCauses.length > 0 || results.fixes.length > 0;
  process.exit(hasIssues ? 1 : 0);
}).catch(error => {
  console.error('\n💥 Regression investigation failed:', error);
  process.exit(1);
});
