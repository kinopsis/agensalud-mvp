#!/usr/bin/env node

/**
 * Monitor WhatsApp Authentication Flow
 * Monitorea en tiempo real el flujo de autenticación WhatsApp
 * para diagnosticar problemas post-QR scan
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  EVOLUTION_API_URL: 'https://evo.torrecentral.com',
  EVOLUTION_API_KEY: 'ixisatbi7f3p9m1ip37hibanq0vjq8nc'
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'WEBHOOK': '🔗',
    'STATUS': '📱',
    'MONITOR': '👁️'
  }[level] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function getCurrentInstance() {
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
  
  const { data: instances, error } = await supabase
    .from('whatsapp_instances_simple')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error || !instances || instances.length === 0) {
    return null;
  }
  
  return instances[0];
}

async function checkEvolutionStatus(instanceName) {
  try {
    const response = await fetch(`${CONFIG.EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': CONFIG.EVOLUTION_API_KEY
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testWebhookEndpoint(organizationId) {
  try {
    const testPayload = {
      event: 'CONNECTION_UPDATE',
      instance: 'test-instance',
      data: {
        state: 'open',
        status: 'connected'
      }
    };
    
    const response = await fetch(`http://localhost:3000/api/whatsapp/simple/webhook/${organizationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function monitorInstance(instance) {
  log(`Monitoring instance: ${instance.evolution_instance_name}`, 'MONITOR');
  
  let lastStatus = instance.status;
  let lastEvolutionState = null;
  let consecutiveErrors = 0;
  const maxErrors = 5;
  
  const monitorInterval = setInterval(async () => {
    try {
      // Check database status
      const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
      const { data: currentInstance } = await supabase
        .from('whatsapp_instances_simple')
        .select('*')
        .eq('id', instance.id)
        .single();
      
      if (currentInstance && currentInstance.status !== lastStatus) {
        log(`Database status changed: ${lastStatus} → ${currentInstance.status}`, 'STATUS');
        lastStatus = currentInstance.status;
        
        if (currentInstance.status === 'connected') {
          log('🎉 SUCCESS: Instance connected in database!', 'SUCCESS');
          log('Frontend should now show connected state', 'INFO');
        }
      }
      
      // Check Evolution API status
      const evolutionCheck = await checkEvolutionStatus(instance.evolution_instance_name);
      
      if (evolutionCheck.success) {
        const currentEvolutionState = evolutionCheck.data.instance?.state;
        
        if (currentEvolutionState !== lastEvolutionState) {
          log(`Evolution API state changed: ${lastEvolutionState} → ${currentEvolutionState}`, 'STATUS');
          lastEvolutionState = currentEvolutionState;
          
          if (currentEvolutionState === 'open') {
            log('🎉 SUCCESS: Instance connected in Evolution API!', 'SUCCESS');
            log('Checking if webhook triggered database update...', 'WEBHOOK');
            
            // Wait a moment and check if database was updated
            setTimeout(async () => {
              const { data: updatedInstance } = await supabase
                .from('whatsapp_instances_simple')
                .select('*')
                .eq('id', instance.id)
                .single();
              
              if (updatedInstance && updatedInstance.status === 'connected') {
                log('✅ Webhook successfully updated database!', 'SUCCESS');
              } else {
                log('❌ Webhook did NOT update database - this is the problem!', 'ERROR');
                log(`Database status still: ${updatedInstance?.status}`, 'ERROR');
              }
            }, 2000);
          }
        }
        
        // Reset error counter
        consecutiveErrors = 0;
      } else {
        consecutiveErrors++;
        if (consecutiveErrors <= 3) {
          log(`Evolution API check failed (${consecutiveErrors}/${maxErrors}): ${evolutionCheck.error}`, 'WARNING');
        }
      }
      
      // Stop monitoring if too many errors or if connected
      if (consecutiveErrors >= maxErrors) {
        log('Too many consecutive errors, stopping monitor', 'ERROR');
        clearInterval(monitorInterval);
      } else if (lastStatus === 'connected' && lastEvolutionState === 'open') {
        log('Instance fully connected, stopping monitor', 'SUCCESS');
        clearInterval(monitorInterval);
      }
      
    } catch (error) {
      log(`Monitor error: ${error.message}`, 'ERROR');
      consecutiveErrors++;
      
      if (consecutiveErrors >= maxErrors) {
        clearInterval(monitorInterval);
      }
    }
  }, 3000); // Check every 3 seconds
  
  // Stop monitoring after 5 minutes
  setTimeout(() => {
    clearInterval(monitorInterval);
    log('Monitor timeout reached (5 minutes)', 'WARNING');
  }, 300000);
  
  return monitorInterval;
}

async function main() {
  console.log('👁️ WhatsApp Authentication Flow Monitor');
  console.log('========================================');
  
  try {
    // Get current instance
    const instance = await getCurrentInstance();
    
    if (!instance) {
      log('No WhatsApp instances found to monitor', 'ERROR');
      return;
    }
    
    log(`Found instance: ${instance.evolution_instance_name}`, 'INFO');
    log(`Current status: ${instance.status}`, 'INFO');
    log(`Organization: ${instance.organization_id}`, 'INFO');
    
    // Test webhook endpoint
    log('Testing webhook endpoint...', 'WEBHOOK');
    const webhookTest = await testWebhookEndpoint(instance.organization_id);
    
    if (webhookTest.success) {
      log('✅ Webhook endpoint is working', 'SUCCESS');
    } else {
      log(`❌ Webhook endpoint failed: ${webhookTest.status} ${webhookTest.statusText}`, 'ERROR');
    }
    
    // Check initial Evolution API status
    log('Checking initial Evolution API status...', 'STATUS');
    const initialCheck = await checkEvolutionStatus(instance.evolution_instance_name);
    
    if (initialCheck.success) {
      log(`Evolution API state: ${initialCheck.data.instance?.state}`, 'STATUS');
    } else {
      log(`Evolution API error: ${initialCheck.error}`, 'ERROR');
    }
    
    // Start monitoring
    console.log('\n' + '='.repeat(60));
    log('🚀 Starting real-time monitoring...', 'MONITOR');
    log('Scan the QR code now to see the flow in action!', 'INFO');
    console.log('='.repeat(60));
    
    const monitorInterval = await monitorInstance(instance);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      log('Stopping monitor...', 'INFO');
      clearInterval(monitorInterval);
      process.exit(0);
    });
    
  } catch (error) {
    log(`Monitor failed: ${error.message}`, 'ERROR');
    console.error('Full error:', error);
  }
}

if (require.main === module) {
  main().catch(error => {
    log(`Unexpected error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}
