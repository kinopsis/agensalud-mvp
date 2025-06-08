#!/usr/bin/env node

/**
 * Test Evolution API Direct Connection
 * 
 * Prueba directa de la API de Evolution para identificar el problema específico.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

console.log('🧪 TESTING EVOLUTION API DIRECT CONNECTION');
console.log('='.repeat(60));

const EVOLUTION_CONFIG = {
  baseUrl: 'https://evo.torrecentral.com',
  apiKey: 'ixisatbi7f3p9m1ip37hibanq0vjq8nc'
};

async function testEvolutionAPI() {
  console.log('\n📡 Testing Evolution API Connectivity');
  console.log('-'.repeat(40));
  
  try {
    // Test 1: Fetch existing instances
    console.log('\n🔍 Test 1: Fetching existing instances...');
    const fetchResponse = await fetch(`${EVOLUTION_CONFIG.baseUrl}/instance/fetchInstances`, {
      headers: { 'apikey': EVOLUTION_CONFIG.apiKey }
    });
    
    if (fetchResponse.ok) {
      const instances = await fetchResponse.json();
      console.log(`✅ Fetch Success: Found ${instances.length} instances`);
      
      if (instances.length > 0) {
        console.log('📋 Existing instances:');
        instances.forEach((inst, index) => {
          console.log(`   ${index + 1}. ${inst.name} (${inst.status})`);
        });
      }
    } else {
      console.log(`❌ Fetch Failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
      return false;
    }
    
    // Test 2: Create new instance
    console.log('\n🚀 Test 2: Creating new instance...');
    const instanceName = `test-simple-${Date.now()}`;
    const createPayload = {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    };
    
    console.log('📋 Payload:', JSON.stringify(createPayload, null, 2));
    
    const createResponse = await fetch(`${EVOLUTION_CONFIG.baseUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_CONFIG.apiKey
      },
      body: JSON.stringify(createPayload)
    });
    
    console.log(`📡 Create Response: ${createResponse.status} ${createResponse.statusText}`);
    
    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('✅ Create Success:', JSON.stringify(result, null, 2));
      
      // Test 3: Get QR code for new instance
      console.log('\n📱 Test 3: Getting QR code...');
      const qrResponse = await fetch(`${EVOLUTION_CONFIG.baseUrl}/instance/connect/${instanceName}`, {
        headers: { 'apikey': EVOLUTION_CONFIG.apiKey }
      });
      
      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        console.log('✅ QR Success:', {
          hasBase64: !!qrData.base64,
          base64Length: qrData.base64?.length || 0,
          status: qrData.status
        });
        return true;
      } else {
        console.log(`❌ QR Failed: ${qrResponse.status} ${qrResponse.statusText}`);
        const qrError = await qrResponse.text();
        console.log('QR Error:', qrError);
      }
      
    } else {
      console.log(`❌ Create Failed: ${createResponse.status} ${createResponse.statusText}`);
      const errorText = await createResponse.text();
      console.log('Create Error:', errorText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n🚀 Starting Evolution API Tests');
  console.log('='.repeat(60));
  
  const success = await testEvolutionAPI();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));
  
  if (success) {
    console.log('\n🎉 SUCCESS: Evolution API is working correctly!');
    console.log('✅ Instance creation: Working');
    console.log('✅ QR code generation: Working');
    console.log('✅ API connectivity: Working');
    
    console.log('\n📋 Next Steps:');
    console.log('1. The Evolution API is functional');
    console.log('2. The issue is likely in our service implementation');
    console.log('3. Check network connectivity from the application server');
    console.log('4. Verify environment variables are loaded correctly');
    
  } else {
    console.log('\n🚨 FAILURE: Evolution API has issues');
    console.log('❌ Check API endpoint URL');
    console.log('❌ Verify API key is correct');
    console.log('❌ Confirm network connectivity');
    console.log('❌ Check Evolution API server status');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Evolution API Test Complete!');
  console.log('='.repeat(60));
  
  return success;
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
