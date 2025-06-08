#!/usr/bin/env node

/**
 * Comprehensive WhatsApp QR Code Issue Diagnostic
 * 
 * Investigates and fixes the critical QR code loading failure by testing
 * the complete data flow from instance creation to QR display.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔍 COMPREHENSIVE WHATSAPP QR CODE DIAGNOSTIC');
console.log('='.repeat(70));

const INSTANCE_ID = '6f12052d-2641-4b85-a713-5be9ea131938'; // From user's report
const INSTANCE_NAME = 'ptica-visualcar-WhatsApp-1749333115798'; // From user's report
const BASE_URL = 'http://localhost:3001';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  issues: [],
  fixes: []
};

async function testEndpoint(name, url, options = {}) {
  try {
    console.log(`\n🧪 Testing ${name}:`);
    console.log(`   URL: ${url}`);
    
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    console.log(`   Response Time: ${responseTime}ms`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.log(`   ❌ FAILED: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText.substring(0, 200)}...`);
      results.failed++;
      results.issues.push(`${name}: ${response.status} ${response.statusText}`);
      return { success: false, status: response.status, error: errorText };
    }
    
    const data = await response.json();
    console.log(`   ✅ SUCCESS: ${JSON.stringify(data).substring(0, 100)}...`);
    results.passed++;
    
    return { success: true, data, responseTime };
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    results.failed++;
    results.issues.push(`${name}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testEvolutionAPIDirect() {
  console.log('\n📡 TESTING EVOLUTION API DIRECTLY');
  console.log('-'.repeat(50));
  
  const evolutionConfig = {
    baseUrl: process.env.EVOLUTION_API_BASE_URL || 'https://evo.torrecentral.com',
    apiKey: process.env.EVOLUTION_API_KEY || 'ixisatbi7f3p9m1ip37hibanq0vjq8nc'
  };
  
  console.log(`Evolution API URL: ${evolutionConfig.baseUrl}`);
  console.log(`Evolution API Key: ${evolutionConfig.apiKey.substring(0, 10)}...`);
  
  // Test instance status
  try {
    const statusUrl = `${evolutionConfig.baseUrl}/instance/fetchInstances`;
    const statusResponse = await fetch(statusUrl, {
      headers: { 'apikey': evolutionConfig.apiKey }
    });
    
    if (statusResponse.ok) {
      const instances = await statusResponse.json();
      console.log(`✅ Found ${instances.length} Evolution API instances`);
      
      const targetInstance = instances.find(inst => 
        inst.instance?.instanceName === INSTANCE_NAME ||
        inst.instance?.instanceId === INSTANCE_ID
      );
      
      if (targetInstance) {
        console.log('🎯 Target instance found in Evolution API:');
        console.log(`   Name: ${targetInstance.instance?.instanceName}`);
        console.log(`   ID: ${targetInstance.instance?.instanceId}`);
        console.log(`   Status: ${targetInstance.instance?.status}`);
        console.log(`   State: ${targetInstance.instance?.state}`);
        
        // Test QR code retrieval
        const qrUrl = `${evolutionConfig.baseUrl}/instance/qrcode/${targetInstance.instance?.instanceName}`;
        const qrResponse = await fetch(qrUrl, {
          headers: { 'apikey': evolutionConfig.apiKey }
        });
        
        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          console.log('📱 QR Code Response:');
          console.log(`   Has Base64: ${!!qrData.base64}`);
          console.log(`   Has QRCode: ${!!qrData.qrcode}`);
          console.log(`   Status: ${qrData.status}`);
          console.log(`   Count: ${qrData.count}`);
          
          if (qrData.base64) {
            console.log(`   Base64 Length: ${qrData.base64.length} chars`);
            results.fixes.push('Evolution API has QR code available');
          } else {
            results.issues.push('Evolution API reports no QR code available');
          }
        } else {
          console.log(`❌ QR Code request failed: ${qrResponse.status}`);
          results.issues.push(`Evolution API QR request failed: ${qrResponse.status}`);
        }
        
      } else {
        console.log('❌ Target instance not found in Evolution API');
        results.issues.push('Instance not found in Evolution API');
      }
    } else {
      console.log(`❌ Evolution API status check failed: ${statusResponse.status}`);
      results.issues.push(`Evolution API unreachable: ${statusResponse.status}`);
    }
    
  } catch (error) {
    console.log(`❌ Evolution API test failed: ${error.message}`);
    results.issues.push(`Evolution API error: ${error.message}`);
  }
}

async function runDiagnostic() {
  console.log('\n🚀 STARTING COMPREHENSIVE DIAGNOSTIC');
  console.log('='.repeat(70));
  
  // Test 1: Evolution API Direct
  await testEvolutionAPIDirect();
  
  // Test 2: Connect Endpoint (should now work)
  await testEndpoint(
    'Connect Endpoint',
    `${BASE_URL}/api/whatsapp/instances/${INSTANCE_ID}/connect`,
    { method: 'POST' }
  );
  
  // Test 3: QR Code Endpoint (channels)
  await testEndpoint(
    'QR Code Endpoint (Channels)',
    `${BASE_URL}/api/channels/whatsapp/instances/${INSTANCE_ID}/qr`
  );
  
  // Test 4: QR Code Endpoint (legacy)
  await testEndpoint(
    'QR Code Endpoint (Legacy)',
    `${BASE_URL}/api/whatsapp/instances/${INSTANCE_ID}/qrcode`
  );
  
  // Test 5: Instance Status
  await testEndpoint(
    'Instance Status',
    `${BASE_URL}/api/channels/whatsapp/instances/${INSTANCE_ID}/status`
  );
  
  // Test 6: Instance Details
  await testEndpoint(
    'Instance Details',
    `${BASE_URL}/api/channels/whatsapp/instances/${INSTANCE_ID}`
  );
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 DIAGNOSTIC RESULTS');
  console.log('='.repeat(70));
  
  const totalTests = results.passed + results.failed;
  const successRate = totalTests > 0 ? (results.passed / totalTests * 100).toFixed(1) : 0;
  
  console.log(`\n📈 Test Results: ${results.passed}/${totalTests} passed (${successRate}%)`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.issues.length > 0) {
    console.log('\n🚨 Issues Identified:');
    results.issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }
  
  if (results.fixes.length > 0) {
    console.log('\n✅ Fixes Available:');
    results.fixes.forEach((fix, index) => {
      console.log(`   ${index + 1}. ${fix}`);
    });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🎯 RECOMMENDATIONS');
  console.log('='.repeat(70));
  
  if (successRate >= 80) {
    console.log('\n🎉 GOOD: Most endpoints are working');
    console.log('✅ Connect endpoint fix appears successful');
    console.log('✅ QR code endpoints are accessible');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Test instance creation flow in browser');
    console.log('2. Monitor browser console for specific errors');
    console.log('3. Verify QR code data is properly formatted');
    
  } else {
    console.log('\n🚨 CRITICAL: Multiple endpoint failures detected');
    console.log('❌ Server may not be running or configured correctly');
    
    console.log('\n🔧 Immediate Actions Required:');
    console.log('1. Verify development server is running on port 3001');
    console.log('2. Check authentication configuration');
    console.log('3. Validate Evolution API connectivity');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✨ WhatsApp QR Code Diagnostic Complete!');
  console.log('='.repeat(70));
  
  return successRate >= 80;
}

// Run diagnostic
runDiagnostic()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
