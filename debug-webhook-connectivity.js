#!/usr/bin/env node

/**
 * Debug WhatsApp Webhook Connectivity
 * 
 * Diagnoses why webhook events are not being received from Evolution API,
 * which is causing the system to fall back to aggressive polling.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔍 WEBHOOK CONNECTIVITY DIAGNOSIS');
console.log('='.repeat(60));

const EVOLUTION_CONFIG = {
  baseUrl: 'https://evo.torrecentral.com',
  apiKey: process.env.EVOLUTION_API_KEY
};

const INSTANCE_DETAILS = {
  instanceId: '693b032b-bdd2-4ae4-91eb-83a031aef568',
  evolutionInstanceName: 'polo-wa-1749344454996',
  organizationId: '927cecbe-d9e5-43a4-b9d0-25f942ededc4'
};

async function checkWebhookConfiguration() {
  console.log('\n🔗 Checking webhook configuration...');
  
  try {
    const response = await fetch(`${EVOLUTION_CONFIG.baseUrl}/webhook/find/${INSTANCE_DETAILS.evolutionInstanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_CONFIG.apiKey
      }
    });
    
    if (response.ok) {
      const webhookConfig = await response.json();
      console.log('✅ Webhook configuration found:', JSON.stringify(webhookConfig, null, 2));
      
      // Check if webhook URL is accessible from Evolution API
      const webhookUrl = webhookConfig.url;
      if (webhookUrl && webhookUrl.includes('localhost')) {
        console.log('⚠️ WARNING: Webhook URL uses localhost - Evolution API cannot reach it');
        console.log('💡 SOLUTION: Use ngrok or similar tunnel service for local development');
        return { configured: true, accessible: false, url: webhookUrl };
      }
      
      return { configured: true, accessible: true, url: webhookUrl };
    } else {
      console.log('❌ No webhook configuration found');
      return { configured: false, accessible: false };
    }
  } catch (error) {
    console.error('❌ Error checking webhook configuration:', error.message);
    return { configured: false, accessible: false, error: error.message };
  }
}

async function testWebhookEndpoint() {
  console.log('\n🧪 Testing local webhook endpoint...');
  
  const webhookUrl = `http://localhost:3000/api/whatsapp/simple/webhook/${INSTANCE_DETAILS.organizationId}`;
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Local webhook endpoint is accessible:', data);
      return { accessible: true };
    } else {
      console.log('❌ Local webhook endpoint not accessible:', response.status, response.statusText);
      return { accessible: false };
    }
  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error.message);
    return { accessible: false, error: error.message };
  }
}

async function checkInstanceStatus() {
  console.log('\n📊 Checking Evolution API instance status...');
  
  try {
    const response = await fetch(`${EVOLUTION_CONFIG.baseUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_CONFIG.apiKey
      }
    });
    
    if (response.ok) {
      const instances = await response.json();
      const ourInstance = instances.find(inst => 
        inst.instance.instanceName === INSTANCE_DETAILS.evolutionInstanceName
      );
      
      if (ourInstance) {
        console.log('✅ Instance found in Evolution API:');
        console.log('  - Name:', ourInstance.instance.instanceName);
        console.log('  - Status:', ourInstance.instance.status);
        console.log('  - Connection Status:', ourInstance.instance.connectionStatus);
        console.log('  - Profile Name:', ourInstance.instance.profileName || 'Not connected');
        
        return { 
          found: true, 
          status: ourInstance.instance.status,
          connectionStatus: ourInstance.instance.connectionStatus,
          profileName: ourInstance.instance.profileName
        };
      } else {
        console.log('❌ Instance not found in Evolution API');
        console.log('Available instances:', instances.map(i => i.instance.instanceName));
        return { found: false };
      }
    } else {
      console.log('❌ Failed to fetch instances from Evolution API');
      return { found: false, error: 'API request failed' };
    }
  } catch (error) {
    console.error('❌ Error checking instance status:', error.message);
    return { found: false, error: error.message };
  }
}

async function suggestSolutions(webhookResult, endpointResult, instanceResult) {
  console.log('\n💡 SOLUTIONS AND RECOMMENDATIONS:');
  console.log('='.repeat(60));
  
  if (!webhookResult.configured) {
    console.log('🔧 SOLUTION 1: Configure webhook');
    console.log('  - Run: node fix-webhook-for-existing-instance.js');
    console.log('  - This will set up webhook configuration in Evolution API');
  }
  
  if (webhookResult.configured && !webhookResult.accessible) {
    console.log('🔧 SOLUTION 2: Make webhook accessible');
    console.log('  - Install ngrok: npm install -g ngrok');
    console.log('  - Run: ngrok http 3000');
    console.log('  - Update webhook URL to use ngrok tunnel');
    console.log('  - Example: https://abc123.ngrok.io/api/whatsapp/simple/webhook/[org-id]');
  }
  
  if (!instanceResult.found) {
    console.log('🔧 SOLUTION 3: Recreate instance');
    console.log('  - The instance may have been deleted from Evolution API');
    console.log('  - Create a new instance through the admin interface');
  }
  
  if (instanceResult.connectionStatus === 'close') {
    console.log('🔧 SOLUTION 4: Reconnect instance');
    console.log('  - The instance is disconnected from WhatsApp');
    console.log('  - Click "Conectar" and scan QR code again');
  }
  
  console.log('\n🚨 IMMEDIATE FIX FOR INFINITE LOOPS:');
  console.log('  - Open browser console (F12)');
  console.log('  - Run: window.monitoringRegistry?.cleanup()');
  console.log('  - This will stop all monitoring immediately');
  
  console.log('\n🎯 LONG-TERM FIXES:');
  console.log('  - Use production webhook URLs (not localhost)');
  console.log('  - Implement proper webhook event handling');
  console.log('  - Add webhook connectivity monitoring');
  console.log('  - Use webhook-based status updates instead of polling');
}

async function runWebhookDiagnosis() {
  console.log('\n🚀 Starting webhook connectivity diagnosis...');
  
  const webhookResult = await checkWebhookConfiguration();
  const endpointResult = await testWebhookEndpoint();
  const instanceResult = await checkInstanceStatus();
  
  console.log('\n📊 DIAGNOSIS SUMMARY:');
  console.log('='.repeat(60));
  console.log(`Webhook Configured: ${webhookResult.configured ? '✅' : '❌'}`);
  console.log(`Webhook Accessible: ${webhookResult.accessible ? '✅' : '❌'}`);
  console.log(`Local Endpoint: ${endpointResult.accessible ? '✅' : '❌'}`);
  console.log(`Instance Found: ${instanceResult.found ? '✅' : '❌'}`);
  
  if (instanceResult.found) {
    console.log(`Instance Status: ${instanceResult.status}`);
    console.log(`Connection Status: ${instanceResult.connectionStatus}`);
  }
  
  await suggestSolutions(webhookResult, endpointResult, instanceResult);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Webhook diagnosis complete!');
  console.log('='.repeat(60));
}

// Run diagnosis
runWebhookDiagnosis()
  .catch(error => {
    console.error('❌ Diagnosis failed:', error);
    process.exit(1);
  });
