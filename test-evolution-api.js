#!/usr/bin/env node

/**
 * Test Evolution API Connection
 */

const CONFIG = {
  EVOLUTION_API_URL: 'https://evo.torrecentral.com',
  EVOLUTION_API_KEY: 'ixisatbi7f3p9m1ip37hibanq0vjq8nc'
};

async function testEvolutionAPI() {
  console.log('🔍 Testing Evolution API Connection');
  console.log('===================================');
  console.log(`Base URL: ${CONFIG.EVOLUTION_API_URL}`);
  console.log(`API Key: ${CONFIG.EVOLUTION_API_KEY.substring(0, 10)}...`);
  
  try {
    // Test 1: List instances
    console.log('\n1. Testing instance list...');
    const listResponse = await fetch(`${CONFIG.EVOLUTION_API_URL}/instance/fetchInstances`, {
      headers: {
        'apikey': CONFIG.EVOLUTION_API_KEY
      }
    });
    
    console.log(`Status: ${listResponse.status} ${listResponse.statusText}`);
    
    if (listResponse.ok) {
      const instances = await listResponse.json();
      console.log(`Found ${instances.length} instances`);
      instances.forEach(instance => {
        console.log(`- ${instance.instanceName}: ${instance.status}`);
      });
    } else {
      const error = await listResponse.text();
      console.log(`Error: ${error}`);
    }
    
    // Test 2: Create new instance
    console.log('\n2. Testing instance creation...');
    const testInstanceName = `test-${Date.now()}`;
    
    const createResponse = await fetch(`${CONFIG.EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        instanceName: testInstanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    });
    
    console.log(`Status: ${createResponse.status} ${createResponse.statusText}`);
    
    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('✅ Instance created successfully');
      console.log('Instance ID:', result.instance?.instanceId);
      
      // Clean up - delete test instance
      console.log('\n3. Cleaning up test instance...');
      const deleteResponse = await fetch(`${CONFIG.EVOLUTION_API_URL}/instance/delete/${testInstanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': CONFIG.EVOLUTION_API_KEY
        }
      });
      
      if (deleteResponse.ok) {
        console.log('✅ Test instance deleted successfully');
      } else {
        console.log('⚠️ Failed to delete test instance');
      }
    } else {
      const error = await createResponse.text();
      console.log(`Error: ${error}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEvolutionAPI();
