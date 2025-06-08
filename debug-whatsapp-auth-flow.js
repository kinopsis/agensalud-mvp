#!/usr/bin/env node

/**
 * Debug WhatsApp Authentication Flow
 * Investigates problemas críticos en el flujo post-QR
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  EVOLUTION_API_URL: process.env.EVOLUTION_API_BASE_URL || 'https://evo.torrecentral.com',
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'DEBUG': '🔍',
    'WEBHOOK': '🔗',
    'QR': '📱'
  }[level] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function checkEvolutionAPI(instanceName) {
  try {
    const url = `${CONFIG.EVOLUTION_API_URL}/instance/connectionState/${instanceName}`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': CONFIG.EVOLUTION_API_KEY
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return { exists: true, status: data };
    } else {
      return { exists: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

async function testWebhookEndpoints() {
  log('Testing webhook endpoints...', 'WEBHOOK');
  
  const webhookEndpoints = [
    '/api/webhooks/evolution',
    '/api/webhooks/evolution/927cecbe-d9e5-43a4-b9d0-25f942ededc4',
    '/api/whatsapp/simple/webhook/927cecbe-d9e5-43a4-b9d0-25f942ededc4'
  ];
  
  for (const endpoint of webhookEndpoints) {
    try {
      const testUrl = `http://localhost:3000${endpoint}`;
      log(`Testing webhook: ${testUrl}`, 'WEBHOOK');
      
      // Test with a sample CONNECTION_UPDATE event
      const testPayload = {
        event: 'CONNECTION_UPDATE',
        instance: 'test-instance',
        data: {
          state: 'open',
          status: 'connected'
        }
      };
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });
      
      log(`Webhook ${endpoint}: ${response.status} ${response.statusText}`, 
          response.ok ? 'SUCCESS' : 'ERROR');
      
    } catch (error) {
      log(`Webhook ${endpoint} failed: ${error.message}`, 'ERROR');
    }
  }
}

async function analyzeCurrentInstances() {
  log('Analyzing current WhatsApp instances...', 'DEBUG');
  
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
  
  // Get all instances from whatsapp_instances_simple
  const { data: instances, error } = await supabase
    .from('whatsapp_instances_simple')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    log(`Failed to fetch instances: ${error.message}`, 'ERROR');
    return;
  }
  
  log(`Found ${instances.length} instances in database`, 'INFO');
  
  for (const instance of instances) {
    console.log('\n' + '='.repeat(60));
    console.log(`Instance: ${instance.instance_name || 'N/A'}`);
    console.log(`ID: ${instance.id}`);
    console.log(`Evolution Name: ${instance.evolution_instance_name}`);
    console.log(`Status: ${instance.status}`);
    console.log(`Created: ${instance.created_at}`);
    console.log(`Updated: ${instance.updated_at}`);
    
    // Check Evolution API status
    if (instance.evolution_instance_name) {
      log(`Checking Evolution API status for: ${instance.evolution_instance_name}`, 'DEBUG');
      const evolutionCheck = await checkEvolutionAPI(instance.evolution_instance_name);
      
      if (evolutionCheck.exists) {
        console.log(`Evolution API Status:`, evolutionCheck.status);
        
        // Check for state mismatch
        const dbStatus = instance.status;
        const evolutionState = evolutionCheck.status.state;
        
        if (dbStatus !== evolutionState) {
          log(`STATE MISMATCH: DB=${dbStatus}, Evolution=${evolutionState}`, 'WARNING');
        }
      } else {
        log(`Evolution API Error: ${evolutionCheck.error}`, 'ERROR');
      }
    }
  }
}

async function testQRCodeFlow() {
  log('Testing QR Code flow...', 'QR');
  
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
  
  // Get the most recent instance
  const { data: instances, error } = await supabase
    .from('whatsapp_instances_simple')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error || !instances || instances.length === 0) {
    log('No instances found for QR testing', 'WARNING');
    return;
  }
  
  const instance = instances[0];
  log(`Testing QR flow for instance: ${instance.id}`, 'QR');
  
  // Test QR endpoint
  try {
    const qrUrl = `http://localhost:3000/api/whatsapp/simple/instances/${instance.id}/qr`;
    log(`Testing QR endpoint: ${qrUrl}`, 'QR');
    
    const response = await fetch(qrUrl);
    const result = await response.json();
    
    if (response.ok) {
      log(`QR endpoint working: ${result.success ? 'SUCCESS' : 'FAILED'}`, 
          result.success ? 'SUCCESS' : 'ERROR');
      
      if (result.data?.qrCode) {
        log(`QR code available (${result.data.qrCode.length} chars)`, 'SUCCESS');
      }
    } else {
      log(`QR endpoint failed: ${response.status} ${response.statusText}`, 'ERROR');
    }
  } catch (error) {
    log(`QR endpoint error: ${error.message}`, 'ERROR');
  }
}

async function checkSSEStreams() {
  log('Checking SSE stream endpoints...', 'DEBUG');
  
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
  
  // Get the most recent instance
  const { data: instances, error } = await supabase
    .from('whatsapp_instances_simple')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error || !instances || instances.length === 0) {
    log('No instances found for SSE testing', 'WARNING');
    return;
  }
  
  const instance = instances[0];
  
  // Test SSE endpoint availability
  const sseUrl = `http://localhost:3000/api/channels/whatsapp/instances/${instance.id}/qrcode/stream`;
  log(`Testing SSE endpoint: ${sseUrl}`, 'DEBUG');
  
  try {
    const response = await fetch(sseUrl, {
      headers: {
        'Accept': 'text/event-stream'
      }
    });
    
    log(`SSE endpoint status: ${response.status} ${response.statusText}`, 
        response.ok ? 'SUCCESS' : 'ERROR');
    
    if (response.ok) {
      log('SSE endpoint is accessible', 'SUCCESS');
    }
  } catch (error) {
    log(`SSE endpoint error: ${error.message}`, 'ERROR');
  }
}

async function main() {
  console.log('🔍 WhatsApp Authentication Flow Debug');
  console.log('=====================================');
  
  try {
    // Initialize Supabase
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
    log('Connected to Supabase', 'SUCCESS');
    
    // 1. Analyze current instances
    await analyzeCurrentInstances();
    
    // 2. Test webhook endpoints
    console.log('\n' + '='.repeat(60));
    await testWebhookEndpoints();
    
    // 3. Test QR code flow
    console.log('\n' + '='.repeat(60));
    await testQRCodeFlow();
    
    // 4. Check SSE streams
    console.log('\n' + '='.repeat(60));
    await checkSSEStreams();
    
    // 5. Summary and recommendations
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSIS SUMMARY');
    console.log('='.repeat(60));
    
    log('Key Issues to Investigate:', 'WARNING');
    console.log('1. Webhook configuration failures (404 errors)');
    console.log('2. State synchronization between Evolution API and database');
    console.log('3. SSE stream connectivity for real-time updates');
    console.log('4. QR code expiration and refresh mechanisms');
    
    log('Recommended Actions:', 'INFO');
    console.log('1. Fix webhook endpoint configuration in Evolution API');
    console.log('2. Implement proper state sync service');
    console.log('3. Add circuit breakers for polling mechanisms');
    console.log('4. Enhance error handling in frontend components');
    
  } catch (error) {
    log(`Diagnosis failed: ${error.message}`, 'ERROR');
    console.error('Full error:', error);
  }
}

if (require.main === module) {
  main().catch(error => {
    log(`Unexpected error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}
