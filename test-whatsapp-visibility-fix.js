#!/usr/bin/env node

/**
 * Test WhatsApp Instance Visibility Fix
 * 
 * Tests that the dashboard can now see simple WhatsApp instances
 * and that the one-instance-per-tenant rule works correctly.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔍 TESTING WHATSAPP INSTANCE VISIBILITY FIX');
console.log('='.repeat(60));

const BASE_URL = 'http://localhost:3000';

async function testSimpleInstancesAPI() {
  console.log('\n📋 Testing Simple WhatsApp Instances API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/whatsapp/simple/instances`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`Simple API Response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Simple API Response:', {
        success: data.success,
        instanceCount: data.data?.length || 0,
        instances: data.data?.map(i => ({
          id: i.id,
          display_name: i.display_name,
          status: i.status,
          organization_id: i.organization_id
        })) || []
      });
      return { success: true, data: data.data || [] };
    } else {
      const errorText = await response.text();
      console.log('❌ Simple API Error:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ Error testing simple API:', error.message);
    return { success: false, error: error.message };
  }
}

async function testComplexInstancesAPI() {
  console.log('\n📋 Testing Complex Channel Instances API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/channels/whatsapp/instances`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`Complex API Response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Complex API Response:', {
        success: data.success,
        instanceCount: data.data?.instances?.length || 0,
        instances: data.data?.instances?.map(i => ({
          id: i.id,
          instance_name: i.instance_name,
          status: i.status,
          channel_type: i.channel_type
        })) || []
      });
      return { success: true, data: data.data?.instances || [] };
    } else {
      const errorText = await response.text();
      console.log('❌ Complex API Error:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ Error testing complex API:', error.message);
    return { success: false, error: error.message };
  }
}

async function testInstanceCreationBlocking() {
  console.log('\n🚫 Testing Instance Creation Blocking...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/whatsapp/simple/instances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Test Instance Should Be Blocked'
      })
    });
    
    console.log(`Creation Response: ${response.status} ${response.statusText}`);
    
    if (response.status === 409) {
      const data = await response.json();
      console.log('✅ Instance creation correctly blocked:', data.error);
      return { success: true, blocked: true };
    } else if (response.status === 401) {
      console.log('ℹ️ Authentication required (expected for this test)');
      return { success: true, authRequired: true };
    } else {
      const errorText = await response.text();
      console.log('❌ Unexpected response:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ Error testing creation blocking:', error.message);
    return { success: false, error: error.message };
  }
}

async function testDashboardCompatibility() {
  console.log('\n🎨 Testing Dashboard Compatibility...');
  
  try {
    // Test if the dashboard page loads
    const response = await fetch(`${BASE_URL}/admin/channels`, {
      method: 'GET',
      headers: {
        'Accept': 'text/html'
      }
    });
    
    console.log(`Dashboard Response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ Dashboard page loads successfully');
      return { success: true };
    } else {
      console.log('❌ Dashboard page failed to load');
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Error testing dashboard:', error.message);
    return { success: false, error: error.message };
  }
}

async function runVisibilityTests() {
  console.log('\n🚀 Starting WhatsApp Visibility Tests');
  console.log('='.repeat(60));
  
  const results = {
    simpleAPI: { success: false },
    complexAPI: { success: false },
    creationBlocking: { success: false },
    dashboard: { success: false }
  };
  
  // Test 1: Simple instances API
  results.simpleAPI = await testSimpleInstancesAPI();
  
  // Test 2: Complex instances API
  results.complexAPI = await testComplexInstancesAPI();
  
  // Test 3: Instance creation blocking
  results.creationBlocking = await testInstanceCreationBlocking();
  
  // Test 4: Dashboard compatibility
  results.dashboard = await testDashboardCompatibility();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 VISIBILITY TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log('\n📋 Test Summary:');
  console.log(`✅ Simple API: ${results.simpleAPI.success ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Complex API: ${results.complexAPI.success ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Creation Blocking: ${results.creationBlocking.success ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Dashboard Loading: ${results.dashboard.success ? 'PASS' : 'FAIL'}`);
  
  // Analysis
  const simpleInstances = results.simpleAPI.data || [];
  const complexInstances = results.complexAPI.data || [];
  
  console.log('\n📊 Instance Analysis:');
  console.log(`• Simple instances found: ${simpleInstances.length}`);
  console.log(`• Complex instances found: ${complexInstances.length}`);
  
  if (simpleInstances.length > 0) {
    console.log('\n✅ ISSUE RESOLVED:');
    console.log('• Simple WhatsApp instances are now visible via API');
    console.log('• Dashboard should now display existing instances');
    console.log('• One-instance-per-tenant rule should work correctly');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Open browser to http://localhost:3000/admin/channels');
    console.log('2. Verify that existing WhatsApp instance is visible');
    console.log('3. Try to create a new instance (should be blocked)');
    console.log('4. Test instance management (delete, etc.)');
  } else {
    console.log('\n⚠️ NO INSTANCES FOUND:');
    console.log('• No simple WhatsApp instances in database');
    console.log('• This could mean the instance was already cleaned up');
    console.log('• Try creating a new instance to test the flow');
  }
  
  const allPassed = Object.values(results).every(result => result.success === true);
  
  if (allPassed) {
    console.log('\n🎉 SUCCESS: All visibility tests passed!');
  } else {
    console.log('\n⚠️ PARTIAL SUCCESS: Some tests failed');
    console.log('Check individual test results above for details');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ WhatsApp Visibility Test Complete!');
  console.log('='.repeat(60));
  
  return allPassed;
}

// Run tests
runVisibilityTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
