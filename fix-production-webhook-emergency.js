#!/usr/bin/env node

/**
 * EMERGENCY PRODUCTION WEBHOOK FIX
 * 
 * Fixes the critical webhook configuration issue where webhooks are pointing
 * to localhost instead of the production URL https://agendia.torrecentral.com
 * 
 * @author AgentSalud DevOps Team
 * @date 2025-01-28
 * @priority CRITICAL
 */

const fetch = require('node-fetch');
require('dotenv').config();

// =====================================================
// PRODUCTION CONFIGURATION
// =====================================================
const PRODUCTION_CONFIG = {
  baseUrl: 'https://agendia.torrecentral.com',
  evolutionApiUrl: process.env.EVOLUTION_API_BASE_URL || 'https://evo.torrecentral.com',
  evolutionApiKey: process.env.EVOLUTION_API_KEY,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

// =====================================================
// LOGGING UTILITIES
// =====================================================
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'FIX': '🔧'
  }[type] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// =====================================================
// SUPABASE CLIENT SETUP
// =====================================================
async function createSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(PRODUCTION_CONFIG.supabaseUrl, PRODUCTION_CONFIG.supabaseKey);
}

// =====================================================
// WEBHOOK CONFIGURATION FUNCTIONS
// =====================================================

/**
 * Configure webhook for a specific instance
 */
async function configureWebhookForInstance(instanceName, organizationId) {
  try {
    log(`Configuring webhook for instance: ${instanceName}`, 'FIX');
    
    // FORCE PRODUCTION URL - NO FALLBACK TO LOCALHOST
    const webhookUrl = `${PRODUCTION_CONFIG.baseUrl}/api/whatsapp/simple/webhook/${organizationId}`;
    
    log(`Webhook URL: ${webhookUrl}`, 'INFO');
    
    const response = await fetch(`${PRODUCTION_CONFIG.evolutionApiUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': PRODUCTION_CONFIG.evolutionApiKey
      },
      body: JSON.stringify({
        url: webhookUrl,
        webhook_by_events: true,
        webhook_base64: false,
        events: [
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'STATUS_INSTANCE'
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    log(`Webhook configured successfully for ${instanceName}`, 'SUCCESS');
    return result;

  } catch (error) {
    log(`Failed to configure webhook for ${instanceName}: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Get all WhatsApp instances from database
 */
async function getAllWhatsAppInstances() {
  try {
    const supabase = await createSupabaseClient();
    
    log('Fetching all WhatsApp instances from database...', 'INFO');
    
    const { data: instances, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .not('instance_name', 'is', null);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    log(`Found ${instances.length} WhatsApp instances`, 'INFO');
    return instances;

  } catch (error) {
    log(`Failed to fetch instances: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Test webhook connectivity
 */
async function testWebhookConnectivity(organizationId) {
  try {
    const webhookUrl = `${PRODUCTION_CONFIG.baseUrl}/api/whatsapp/simple/webhook/${organizationId}`;
    
    log(`Testing webhook connectivity: ${webhookUrl}`, 'INFO');
    
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'AgentSalud-Webhook-Test/1.0'
      }
    });

    log(`Webhook test response: ${response.status} ${response.statusText}`, 
        response.ok ? 'SUCCESS' : 'WARNING');
    
    return response.ok;

  } catch (error) {
    log(`Webhook connectivity test failed: ${error.message}`, 'ERROR');
    return false;
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  try {
    log('🚨 STARTING EMERGENCY PRODUCTION WEBHOOK FIX', 'FIX');
    log(`Production URL: ${PRODUCTION_CONFIG.baseUrl}`, 'INFO');
    log(`Evolution API: ${PRODUCTION_CONFIG.evolutionApiUrl}`, 'INFO');

    // Validate configuration
    if (!PRODUCTION_CONFIG.evolutionApiKey) {
      throw new Error('EVOLUTION_API_KEY not configured');
    }
    if (!PRODUCTION_CONFIG.supabaseUrl || !PRODUCTION_CONFIG.supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    // Get all instances
    const instances = await getAllWhatsAppInstances();
    
    if (instances.length === 0) {
      log('No WhatsApp instances found to fix', 'WARNING');
      return;
    }

    // Fix webhooks for each instance
    let successCount = 0;
    let errorCount = 0;

    for (const instance of instances) {
      try {
        log(`Processing instance: ${instance.instance_name} (Org: ${instance.organization_id})`, 'INFO');
        
        // Test webhook connectivity first
        const isConnectable = await testWebhookConnectivity(instance.organization_id);
        if (!isConnectable) {
          log(`Webhook endpoint not reachable for org ${instance.organization_id}`, 'WARNING');
        }

        // Configure webhook
        await configureWebhookForInstance(instance.instance_name, instance.organization_id);
        successCount++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        log(`Failed to fix instance ${instance.instance_name}: ${error.message}`, 'ERROR');
        errorCount++;
      }
    }

    // Summary
    log('🏁 EMERGENCY FIX COMPLETED', 'SUCCESS');
    log(`✅ Successfully fixed: ${successCount} instances`, 'SUCCESS');
    log(`❌ Failed to fix: ${errorCount} instances`, errorCount > 0 ? 'ERROR' : 'INFO');
    
    if (errorCount > 0) {
      log('⚠️ Some instances failed to update. Check logs above for details.', 'WARNING');
      process.exit(1);
    }

  } catch (error) {
    log(`CRITICAL ERROR: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    log(`Unhandled error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = { main, configureWebhookForInstance, testWebhookConnectivity };
