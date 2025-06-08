/**
 * Debug Authentication Issue Script
 * Investigates why production QR endpoint authentication is failing
 */

async function debugAuthenticationIssue() {
  console.log('🔍 AUTHENTICATION ISSUE DEBUGGING');
  console.log('=' .repeat(60));
  
  const results = {
    endpoints: {},
    authFlow: {},
    userProfile: {},
    issues: []
  };

  // Test 1: Check Auth Endpoint Directly
  console.log('\n📊 TEST 1: Direct Authentication Check');
  console.log('-'.repeat(50));
  
  try {
    const response = await fetch('http://localhost:3001/api/auth/user');
    const result = await response.json();
    
    results.authFlow.directAuth = {
      status: response.status,
      success: response.ok,
      hasUser: !!result.user,
      error: result.error
    };
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`👤 Has User: ${!!result.user}`);
    console.log(`❌ Error: ${result.error || 'None'}`);
    
    if (result.user) {
      console.log(`📋 User ID: ${result.user.id}`);
      console.log(`📧 Email: ${result.user.email || 'N/A'}`);
    }
    
  } catch (error) {
    console.error('❌ Direct auth check failed:', error.message);
    results.issues.push(`Direct auth error: ${error.message}`);
  }

  // Test 2: Test Fast Auth Utility
  console.log('\n📊 TEST 2: Fast Auth Utility Test');
  console.log('-'.repeat(50));
  
  try {
    // We can't directly import the utility, so let's test the endpoint that uses it
    const response = await fetch('http://localhost:3001/api/channels/whatsapp/instances/test-auth/qr');
    const result = await response.json();
    
    results.authFlow.fastAuth = {
      status: response.status,
      success: result.success,
      authTime: result.performance?.authTime || 'N/A',
      authMethod: result.performance?.method || 'N/A',
      isFallback: result.performance?.isFallback || false,
      error: result.error
    };
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`🔐 Auth Time: ${results.authFlow.fastAuth.authTime}ms`);
    console.log(`🔧 Auth Method: ${results.authFlow.fastAuth.authMethod}`);
    console.log(`🔄 Is Fallback: ${results.authFlow.fastAuth.isFallback}`);
    console.log(`❌ Error: ${result.error || 'None'}`);
    
    if (result.details) {
      console.log(`📋 Details: ${result.details}`);
    }
    
  } catch (error) {
    console.error('❌ Fast auth test failed:', error.message);
    results.issues.push(`Fast auth error: ${error.message}`);
  }

  // Test 3: Check Supabase Connection
  console.log('\n📊 TEST 3: Supabase Connection Test');
  console.log('-'.repeat(50));
  
  try {
    // Test a simple Supabase endpoint
    const response = await fetch('http://localhost:3001/api/test-supabase');
    
    if (response.status === 404) {
      console.log('⚠️ No test-supabase endpoint found (expected)');
      console.log('🔧 Testing through existing endpoint...');
      
      // Test through an endpoint that uses Supabase
      const qrResponse = await fetch('http://localhost:3001/api/channels/whatsapp/instances/test-supabase/qr');
      const qrResult = await qrResponse.json();
      
      results.authFlow.supabaseConnection = {
        status: qrResponse.status,
        error: qrResult.error,
        details: qrResult.details,
        isSupabaseError: qrResult.error?.includes('supabase') || qrResult.details?.includes('supabase')
      };
      
      console.log(`✅ Status: ${qrResponse.status}`);
      console.log(`❌ Error: ${qrResult.error || 'None'}`);
      console.log(`📋 Details: ${qrResult.details || 'None'}`);
      console.log(`🔗 Supabase Related: ${results.authFlow.supabaseConnection.isSupabaseError ? 'Yes' : 'No'}`);
      
    } else {
      const result = await response.json();
      console.log(`✅ Status: ${response.status}`);
      console.log(`📋 Result:`, result);
    }
    
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error.message);
    results.issues.push(`Supabase connection error: ${error.message}`);
  }

  // Test 4: User Profile Investigation
  console.log('\n📊 TEST 4: User Profile Investigation');
  console.log('-'.repeat(50));
  
  try {
    // Test different instance IDs to see if the error is consistent
    const testInstances = [
      'test-instance-123',
      'c4165106-2fb3-49e8-adc2-275fda3ae34c',
      'nonexistent-instance'
    ];
    
    for (const instanceId of testInstances) {
      console.log(`\n🔄 Testing instance: ${instanceId}`);
      
      const response = await fetch(`http://localhost:3001/api/channels/whatsapp/instances/${instanceId}/qr`);
      const result = await response.json();
      
      console.log(`  Status: ${response.status}`);
      console.log(`  Error: ${result.error || 'None'}`);
      console.log(`  Details: ${result.details || 'None'}`);
      
      // Check if error is specifically about user profile
      const isUserProfileError = result.error?.includes('User profile not found') || 
                                 result.error?.includes('profile') ||
                                 result.details?.includes('profile');
      
      if (isUserProfileError) {
        results.userProfile.hasProfileError = true;
        results.userProfile.errorMessage = result.error;
        console.log(`  🚨 User Profile Error: Yes`);
      } else {
        console.log(`  🚨 User Profile Error: No`);
      }
    }
    
  } catch (error) {
    console.error('❌ User profile investigation failed:', error.message);
    results.issues.push(`User profile investigation error: ${error.message}`);
  }

  // Test 5: Check Environment Variables
  console.log('\n📊 TEST 5: Environment Configuration Check');
  console.log('-'.repeat(50));
  
  try {
    // Test if we can get any environment info through an endpoint
    const response = await fetch('http://localhost:3001/api/health');
    
    if (response.status === 404) {
      console.log('⚠️ No health endpoint found');
      console.log('🔧 Environment check through QR endpoint...');
      
      // Check if development mode is working
      const devResponse = await fetch('http://localhost:3001/api/dev/qr-test');
      const devResult = await devResponse.json();
      
      const isDevelopmentMode = devResult.success && devResult.data?.developmentNote;
      
      console.log(`🔧 Development Mode: ${isDevelopmentMode ? 'Active' : 'Inactive'}`);
      console.log(`📋 Development Note: ${devResult.data?.developmentNote || 'None'}`);
      
      results.authFlow.environment = {
        developmentMode: isDevelopmentMode,
        developmentEndpointWorking: devResult.success
      };
      
    } else {
      const result = await response.json();
      console.log(`✅ Health Status: ${response.status}`);
      console.log(`📋 Health Result:`, result);
    }
    
  } catch (error) {
    console.error('❌ Environment check failed:', error.message);
    results.issues.push(`Environment check error: ${error.message}`);
  }

  // Final Analysis
  console.log('\n📈 AUTHENTICATION ISSUE ANALYSIS');
  console.log('=' .repeat(60));
  
  console.log('\n🔐 AUTHENTICATION FLOW:');
  if (results.authFlow.directAuth) {
    console.log(`  Direct Auth: ${results.authFlow.directAuth.success ? '✅ Working' : '❌ Failed'}`);
  }
  if (results.authFlow.fastAuth) {
    console.log(`  Fast Auth: ${results.authFlow.fastAuth.success ? '✅ Working' : '❌ Failed'}`);
    console.log(`  Auth Method: ${results.authFlow.fastAuth.authMethod}`);
    console.log(`  Fallback Used: ${results.authFlow.fastAuth.isFallback ? 'Yes' : 'No'}`);
  }
  
  console.log('\n👤 USER PROFILE:');
  if (results.userProfile.hasProfileError) {
    console.log(`  Profile Error: ❌ ${results.userProfile.errorMessage}`);
  } else {
    console.log(`  Profile Error: ✅ No profile-specific errors detected`);
  }
  
  console.log('\n🔗 SUPABASE CONNECTION:');
  if (results.authFlow.supabaseConnection) {
    console.log(`  Connection: ${results.authFlow.supabaseConnection.isSupabaseError ? '❌ Issues detected' : '✅ Appears functional'}`);
  }
  
  console.log('\n🚨 ISSUES IDENTIFIED:');
  if (results.issues.length === 0) {
    console.log('  ✅ No critical authentication issues found');
  } else {
    results.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ❌ ${issue}`);
    });
  }
  
  // Recommendations
  console.log('\n🎯 RECOMMENDATIONS:');
  
  if (results.userProfile.hasProfileError) {
    console.log('  1. 🔧 Fix user profile creation/lookup in authentication flow');
    console.log('  2. 🔍 Check Supabase user table and profile relationships');
    console.log('  3. 🛠️ Implement proper user profile initialization');
  }
  
  if (results.authFlow.fastAuth?.isFallback) {
    console.log('  4. ⚡ Fast auth is using fallback - investigate Supabase connectivity');
  }
  
  if (results.issues.length > 0) {
    console.log('  5. 🚨 Address identified authentication errors before production');
  }
  
  console.log('\n🏆 NEXT STEPS:');
  console.log('  1. Fix authentication issues identified above');
  console.log('  2. Test production QR endpoint with working auth');
  console.log('  3. Validate real Evolution API QR code generation');
  console.log('  4. Test end-to-end WhatsApp connection flow');
  
  return results;
}

// Run the authentication debugging
debugAuthenticationIssue().then(results => {
  console.log('\n📋 Authentication debugging completed.');
  console.log('🎯 Results available for fixing authentication issues.');
  
  const hasAuthIssues = results.userProfile?.hasProfileError || 
                       results.issues.length > 0 ||
                       !results.authFlow.fastAuth?.success;
  
  process.exit(hasAuthIssues ? 1 : 0);
}).catch(error => {
  console.error('\n💥 Authentication debugging failed:', error);
  process.exit(1);
});
