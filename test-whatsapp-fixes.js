#!/usr/bin/env node

/**
 * Test WhatsApp QR Code Fixes
 * 
 * Validates that our fixes for the WhatsApp QR code loading issue work correctly.
 * Tests both the Evolution API service and our API endpoints.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

require('dotenv').config({ path: '.env.local' });

console.log('🧪 TESTING WHATSAPP QR CODE FIXES');
console.log('='.repeat(50));

const INSTANCE_ID = '6f12052d-2641-4b85-a713-5be9ea131938';
const INSTANCE_NAME = '927cecbe-pticavisualcarwhatsa'; // Correct Evolution API name
const BASE_URL = 'http://localhost:3001';

async function testEvolutionAPIDirect() {
  console.log('\n📡 Testing Evolution API v2 Direct Connection');
  console.log('-'.repeat(40));
  
  try {
    const evolutionUrl = 'https://evo.torrecentral.com/instance/connect/' + INSTANCE_NAME;
    const response = await fetch(evolutionUrl, {
      headers: { 'apikey': 'ixisatbi7f3p9m1ip37hibanq0vjq8nc' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Evolution API v2 Working:');
      console.log(`   Has Base64: ${!!data.base64}`);
      console.log(`   Base64 Length: ${data.base64?.length || 0} chars`);
      console.log(`   Has Code: ${!!data.code}`);
      console.log(`   Pairing Code: ${data.pairingCode || 'null'}`);
      return true;
    } else {
      console.log(`❌ Evolution API failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Evolution API error: ${error.message}`);
    return false;
  }
}

async function testOurQREndpoint() {
  console.log('\n🔍 Testing Our QR Code Endpoint');
  console.log('-'.repeat(40));
  
  try {
    const qrUrl = `${BASE_URL}/api/channels/whatsapp/instances/${INSTANCE_ID}/qr`;
    console.log(`Testing: ${qrUrl}`);
    
    const response = await fetch(qrUrl);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Our QR Endpoint Working:');
      console.log(`   Status: ${data.status}`);
      console.log(`   Has QR Code: ${!!data.data?.qrCode}`);
      console.log(`   Instance ID: ${data.data?.instanceId}`);
      console.log(`   Instance Name: ${data.data?.instanceName}`);
      return true;
    } else {
      console.log(`❌ Our QR endpoint failed: ${response.status}`);
      console.log(`   Error: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Our QR endpoint error: ${error.message}`);
    return false;
  }
}

async function testConnectEndpoint() {
  console.log('\n🔗 Testing Connect Endpoint');
  console.log('-'.repeat(40));
  
  try {
    const connectUrl = `${BASE_URL}/api/whatsapp/instances/${INSTANCE_ID}/connect`;
    console.log(`Testing: ${connectUrl}`);
    
    const response = await fetch(connectUrl, { method: 'POST' });
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Connect Endpoint Working:');
      console.log(`   Instance ID: ${data.data?.instanceId}`);
      console.log(`   Status: ${data.data?.status}`);
      console.log(`   Message: ${data.data?.message}`);
      return true;
    } else {
      console.log(`❌ Connect endpoint failed: ${response.status}`);
      console.log(`   Error: ${data.error?.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Connect endpoint error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n🚀 Starting Comprehensive Test Suite');
  console.log('='.repeat(50));
  
  const results = {
    evolutionAPI: await testEvolutionAPIDirect(),
    qrEndpoint: await testOurQREndpoint(),
    connectEndpoint: await testConnectEndpoint()
  };
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const successRate = (passedTests / totalTests * 100).toFixed(1);
  
  console.log(`\n📈 Overall Success Rate: ${passedTests}/${totalTests} (${successRate}%)`);
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${test}: ${status}`);
  });
  
  if (successRate >= 66) {
    console.log('\n🎉 GOOD: Most critical fixes are working!');
    console.log('✅ WhatsApp QR code issue should be resolved');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Test the complete flow in browser');
    console.log('2. Create a new WhatsApp instance');
    console.log('3. Verify QR code displays within 5 seconds');
    console.log('4. Confirm QR code is scannable');
    
  } else {
    console.log('\n🚨 CRITICAL: Multiple fixes still failing');
    console.log('❌ Additional debugging required');
    
    console.log('\n🔧 Immediate Actions:');
    console.log('1. Check if development server is running');
    console.log('2. Verify database contains the test instance');
    console.log('3. Check Evolution API connectivity');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ WhatsApp QR Code Fix Test Complete!');
  console.log('='.repeat(50));
  
  return successRate >= 66;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
