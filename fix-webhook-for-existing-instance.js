#!/usr/bin/env node

/**
 * Fix Webhook Configuration for Existing WhatsApp Instance
 * 
 * Configures webhook for the existing "polo" instance that was created
 * before webhook configuration was implemented.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔧 FIXING WEBHOOK FOR EXISTING WHATSAPP INSTANCE');
console.log('='.repeat(60));

const EVOLUTION_CONFIG = {
  baseUrl: 'https://evo.torrecentral.com',
  apiKey: process.env.EVOLUTION_API_KEY
};

const INSTANCE_DETAILS = {
  instanceId: '693b032b-bdd2-4ae4-91eb-83a031aef568',
  evolutionInstanceName: 'polo-wa-1749344454996',
  organizationId: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
  displayName: 'polo'
};

async function configureWebhookForInstance() {
  console.log('\n🔗 Configuring webhook for existing instance...');
  console.log(`Instance: ${INSTANCE_DETAILS.displayName} (${INSTANCE_DETAILS.evolutionInstanceName})`);
  
  try {
    const webhookUrl = `http://localhost:3000/api/whatsapp/simple/webhook/${INSTANCE_DETAILS.organizationId}`;
    
    console.log(`Webhook URL: ${webhookUrl}`);
    
    const response = await fetch(`${EVOLUTION_CONFIG.baseUrl}/webhook/set/${INSTANCE_DETAILS.evolutionInstanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_CONFIG.apiKey
      },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events: [
            'QRCODE_UPDATED',
            'CONNECTION_UPDATE'
          ]
        }
      })
    });
    
    console.log(`Webhook config response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook configuration successful:', result);
      return { success: true, data: result };
    } else {
      const errorText = await response.text();
      console.log('❌ Webhook configuration failed:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ Error configuring webhook:', error.message);
    return { success: false, error: error.message };
  }
}

async function testWebhookEndpoint() {
  console.log('\n🧪 Testing webhook endpoint accessibility...');
  
  try {
    const webhookUrl = `http://localhost:3000/api/whatsapp/simple/webhook/${INSTANCE_DETAILS.organizationId}`;
    
    const response = await fetch(webhookUrl, {
      method: 'GET'
    });
    
    console.log(`Webhook endpoint response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Webhook endpoint is accessible:', data);
      return { success: true };
    } else {
      console.log('❌ Webhook endpoint not accessible');
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error.message);
    return { success: false, error: error.message };
  }
}

async function checkInstanceStatus() {
  console.log('\n📊 Checking current instance status...');
  
  try {
    const response = await fetch(`${EVOLUTION_CONFIG.baseUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_CONFIG.apiKey
      }
    });
    
    if (response.ok) {
      const instances = await response.json();
      const ourInstance = instances.find(inst => inst.instance.instanceName === INSTANCE_DETAILS.evolutionInstanceName);
      
      if (ourInstance) {
        console.log('✅ Instance found in Evolution API:', {
          name: ourInstance.instance.instanceName,
          status: ourInstance.instance.status,
          connectionStatus: ourInstance.instance.connectionStatus
        });
        return { success: true, instance: ourInstance };
      } else {
        console.log('❌ Instance not found in Evolution API');
        return { success: false, error: 'Instance not found' };
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to fetch instances:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ Error checking instance status:', error.message);
    return { success: false, error: error.message };
  }
}

async function simulateConnectionEvent() {
  console.log('\n🎭 Simulating connection event to test webhook...');
  
  try {
    const webhookUrl = `http://localhost:3000/api/whatsapp/simple/webhook/${INSTANCE_DETAILS.organizationId}`;
    const mockEvent = {
      event: 'CONNECTION_UPDATE',
      instance: INSTANCE_DETAILS.evolutionInstanceName,
      data: {
        state: 'open',
        instance: {
          profileName: 'Test User',
          wuid: '5511999999999@s.whatsapp.net',
          profilePictureUrl: 'https://example.com/profile.jpg'
        }
      },
      date_time: new Date().toISOString(),
      sender: 'evolution-api'
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockEvent)
    });
    
    console.log(`Webhook simulation response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook event processed successfully:', result);
      return { success: true };
    } else {
      const errorText = await response.text();
      console.log('❌ Webhook event processing failed:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ Error simulating webhook event:', error.message);
    return { success: false, error: error.message };
  }
}

async function runWebhookFix() {
  console.log('\n🚀 Starting Webhook Fix for Existing Instance');
  console.log('='.repeat(60));
  
  const results = {
    webhookEndpoint: { success: false },
    instanceStatus: { success: false },
    webhookConfig: { success: false },
    webhookTest: { success: false }
  };
  
  // Test 1: Check webhook endpoint
  results.webhookEndpoint = await testWebhookEndpoint();
  
  // Test 2: Check instance status in Evolution API
  results.instanceStatus = await checkInstanceStatus();
  
  // Test 3: Configure webhook
  results.webhookConfig = await configureWebhookForInstance();
  
  // Test 4: Test webhook with simulation
  results.webhookTest = await simulateConnectionEvent();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 WEBHOOK FIX RESULTS');
  console.log('='.repeat(60));
  
  console.log('\n📋 Test Summary:');
  console.log(`✅ Webhook Endpoint: ${results.webhookEndpoint.success ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Instance Status: ${results.instanceStatus.success ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Webhook Config: ${results.webhookConfig.success ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Webhook Test: ${results.webhookTest.success ? 'PASS' : 'FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result.success === true);
  
  if (allPassed) {
    console.log('\n🎉 SUCCESS: Webhook fix completed successfully!');
    console.log('✅ Webhook is now configured for the existing instance');
    console.log('✅ Connection events will be processed correctly');
    console.log('✅ Status updates should work after QR scan');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Go to http://localhost:3000/admin/channels');
    console.log('2. Click "Conectar" on the polo instance');
    console.log('3. Scan QR code with WhatsApp');
    console.log('4. Verify status updates to "connected"');
    console.log('5. Check that no more 404 errors appear in logs');
    
  } else {
    console.log('\n⚠️ PARTIAL SUCCESS: Some webhook fixes failed');
    console.log('Check individual test results above for details');
    
    if (results.webhookConfig.success) {
      console.log('\n✅ WEBHOOK CONFIGURED: The main fix was successful');
      console.log('• Webhook is now configured for the instance');
      console.log('• Connection events should be received');
      console.log('• Try connecting via QR code to test');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Webhook Fix Complete!');
  console.log('='.repeat(60));
  
  return allPassed;
}

// Run webhook fix
runWebhookFix()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Webhook fix failed:', error);
    process.exit(1);
  });
